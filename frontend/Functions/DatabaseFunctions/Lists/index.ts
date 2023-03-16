import { type QuickSQLiteConnection } from 'react-native-quick-sqlite'
import { getItems } from '..'
import { type Event, evetDatabaseToEntity } from '../../../lib/nostr/Events'

export interface List extends Event {}

const databaseToEntity: (object: any) => List = (object) => {
  object.tags = object.tags ? JSON.parse(object.tags) : []
  return object as List
}

export const getList: (
  db: QuickSQLiteConnection,
  kind: number,
  pubKey: string,
  tag?: string,
) => Promise<List> = async (db, kind, pubKey, tag) => {
  let notesQuery = 'SELECT * FROM nostros_lists WHERE kind = ? AND pubkey = ?'
  if (tag) {
    notesQuery += ' AND list_tag = ?'
  }
  const resultSet = db.execute(notesQuery, [kind, pubKey, tag])
  const items: object[] = getItems(resultSet)
  const relays: List[] = items.map((object) => databaseToEntity(object))
  return relays[0]
}

export const getRawLists: (db: QuickSQLiteConnection, pubKey: string) => Promise<Event[]> = async (
  db,
  pubKey,
) => {
  const notesQuery = 'SELECT * FROM nostros_lists WHERE pubkey = ?'

  const resultSet = db.execute(notesQuery, [pubKey])
  const items: object[] = getItems(resultSet)
  const lists: Event[] = items.map((object) => evetDatabaseToEntity(object))

  return lists
}
