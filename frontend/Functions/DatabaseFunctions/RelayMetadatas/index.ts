import { QuickSQLiteConnection } from 'react-native-quick-sqlite'
import { getItems } from '..'
import { Event } from '../../../lib/nostr/Events'

export interface RelayMetadata extends Event {
  url: string
  name?: string
  active?: number
  global_feed?: number
  resilient?: number
  manual?: number
  mode?: 'read' | 'write' | ''
}

const databaseToEntity: (object: any) => RelayMetadata = (object) => {
  object.tags = object.tags ? JSON.parse(object.tags) : []
  return object as RelayMetadata
}

const databaseToRawEntity: (object: any) => Event = (object) => {
  return object as Event
}

export const getRawRelayMetadata: (
  db: QuickSQLiteConnection,
  publicKey: string,
) => Promise<Event[]> = async (db, publicKey) => {
  const notesQuery = 'SELECT * FROM nostros_relay_metadata WHERE pubkey = ?;'
  const resultSet = await db.execute(notesQuery, [publicKey])
  const items: object[] = getItems(resultSet)
  const relays: Event[] = items.map((object) => databaseToRawEntity(object))
  return relays
}

export const getRelayMetadata: (
  db: QuickSQLiteConnection,
  publicKey: string,
) => Promise<RelayMetadata> = async (db, publicKey) => {
  const notesQuery =
    'SELECT * FROM nostros_relay_metadata WHERE pubkey = ? ORDER BY created_at DESC;'
  const resultSet = await db.execute(notesQuery, [publicKey])
  const items: object[] = getItems(resultSet)
  const relays: RelayMetadata[] = items.map((object) => databaseToEntity(object))
  return relays[0]
}
