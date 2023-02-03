import { QueryResult, QuickSQLiteConnection } from 'react-native-quick-sqlite'
import { getItems } from '..'

export interface Relay {
  url: string
  name?: string
  active?: number
  global_feed?: number
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
  const notes: Relay[] = items.map((object) => databaseToEntity(object))
  return notes
}

export const getRelays: (db: QuickSQLiteConnection) => Promise<Relay[]> = async (db) => {
  const notesQuery = 'SELECT * FROM nostros_relays;'
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
