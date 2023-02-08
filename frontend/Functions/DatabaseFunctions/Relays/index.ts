import { QueryResult, QuickSQLiteConnection } from 'react-native-quick-sqlite'
import { getItems } from '..'
import { median } from '../../NativeFunctions'
import { getNoteRelaysUsage } from '../NotesRelays'

export interface Relay {
  url: string
  name?: string
  active?: number
  global_feed?: number
  resilient?: number
  manual?: number
}

export interface RelayInfo {
  name: string
  description: string
  pubkey: string
  contact: string
  supported_nips: string[]
  software: string
  version: string
}

const databaseToEntity: (object: any) => Relay = (object) => {
  return object as Relay
}

export const searchRelays: (
  relayUrl: string,
  db: QuickSQLiteConnection,
) => Promise<Relay[]> = async (relayUrl, db) => {
  const searchQuery = `SELECT * FROM nostros_relays WHERE url = '${relayUrl}';`
  const results = await db.execute(searchQuery)
  const items: object[] = getItems(results)
  const relays: Relay[] = items.map((object) => databaseToEntity(object))
  return relays
}

export const getRelays: (db: QuickSQLiteConnection) => Promise<Relay[]> = async (db) => {
  const notesQuery = 'SELECT * FROM nostros_relays;'
  const resultSet = await db.execute(notesQuery)
  const items: object[] = getItems(resultSet)
  const relays: Relay[] = items.map((object) => databaseToEntity(object))
  return relays
}

export const getActiveRelays: (db: QuickSQLiteConnection) => Promise<Relay[]> = async (db) => {
  const notesQuery = 'SELECT * FROM nostros_relays WHERE active = 1;'
  const resultSet = await db.execute(notesQuery)
  const items: object[] = getItems(resultSet)
  const relays: Relay[] = items.map((object) => databaseToEntity(object))
  return relays
}

export const getRelay: (db: QuickSQLiteConnection, url: string) => Promise<Relay> = async (
  db,
  url,
) => {
  const notesQuery = 'SELECT * FROM nostros_relays WHERE url = ?;'
  const resultSet = await db.execute(notesQuery, [url])
  const items: object[] = getItems(resultSet)
  const relays: Relay[] = items.map((object) => databaseToEntity(object))
  return relays[0]
}

export const createRelay: (db: QuickSQLiteConnection, url: string) => Promise<QueryResult> = async (
  db,
  url,
) => {
  const query = `
    INSERT OR IGNORE INTO nostros_relays (url) VALUES (?)
  `
  return db.execute(query, [url])
}

export const createResilientRelay: (
  db: QuickSQLiteConnection,
  url: string,
) => Promise<QueryResult> = async (db, url) => {
  const query = `
    INSERT OR IGNORE INTO nostros_relays (url, resilient, active) VALUES (?, ?, ?)
  `
  return db.execute(query, [url, 1, 0])
}

export const activateResilientRelays: (
  db: QuickSQLiteConnection,
  relayUrls: string[],
) => Promise<QueryResult> = async (db, relayUrls) => {
  const userQuery = `UPDATE nostros_relays SET resilient = 1 WHERE url IN ('${relayUrls.join(
    "', '",
  )}');`
  return db.execute(userQuery)
}

export const desactivateResilientRelays: (
  db: QuickSQLiteConnection,
) => Promise<QueryResult> = async (db) => {
  const userQuery = `UPDATE nostros_relays SET resilient = 0 WHERE resilient = 1;`
  return db.execute(userQuery)
}

export const getResilientRelays: (db: QuickSQLiteConnection) => Promise<string[]> = async (db) => {
  const relayUsage = await getNoteRelaysUsage(db)
  const medianUsage = median(Object.values(relayUsage))
  const resilientRelays = Object.keys(relayUsage).sort((n1: string, n2: string) => {
    return Math.abs(relayUsage[n1] - medianUsage) - Math.abs(relayUsage[n2] - medianUsage)
  })
  return resilientRelays
}
