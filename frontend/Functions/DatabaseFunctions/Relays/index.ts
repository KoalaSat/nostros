import { QuickSQLiteConnection } from 'react-native-quick-sqlite'
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
  mode?: 'read' | 'write' | ''
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
  const searchQuery = `SELECT * FROM nostros_relays WHERE url = '${relayUrl}' AND deleted_at = 0;`
  const results = await db.execute(searchQuery)
  const items: object[] = getItems(results)
  const relays: Relay[] = items.map((object) => databaseToEntity(object))
  return relays
}

export const getRelays: (db: QuickSQLiteConnection) => Promise<Relay[]> = async (db) => {
  const notesQuery = 'SELECT * FROM nostros_relays WHERE deleted_at = 0;'
  const resultSet = await db.execute(notesQuery)
  const items: object[] = getItems(resultSet)
  const relays: Relay[] = items.map((object) => databaseToEntity(object))
  return relays
}

export const getActiveRelays: (db: QuickSQLiteConnection) => Promise<Relay[]> = async (db) => {
  const notesQuery = 'SELECT * FROM nostros_relays WHERE active = 1 AND deleted_at = 0;'
  const resultSet = await db.execute(notesQuery)
  const items: object[] = getItems(resultSet)
  const relays: Relay[] = items.map((object) => databaseToEntity(object))
  return relays
}

export const getRelay: (db: QuickSQLiteConnection, url: string) => Promise<Relay> = async (
  db,
  url,
) => {
  const notesQuery = 'SELECT * FROM nostros_relays WHERE url = ? AND deleted_at = 0;'
  const resultSet = await db.execute(notesQuery, [url])
  const items: object[] = getItems(resultSet)
  const relays: Relay[] = items.map((object) => databaseToEntity(object))
  return relays[0]
}

export const getResilientRelays: (db: QuickSQLiteConnection) => Promise<string[]> = async (db) => {
  const relayUsage = await getNoteRelaysUsage(db)
  const medianUsage = median(Object.values(relayUsage))
  const resilientRelays = Object.keys(relayUsage).sort((n1: string, n2: string) => {
    return Math.abs(relayUsage[n1] - medianUsage) - Math.abs(relayUsage[n2] - medianUsage)
  })
  return resilientRelays
}
