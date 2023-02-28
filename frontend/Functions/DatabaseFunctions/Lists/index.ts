import { QuickSQLiteConnection } from 'react-native-quick-sqlite'
import { getItems } from '..'
import { Event } from '../../../lib/nostr/Events'

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
  const resultSet = await db.execute(notesQuery, [kind, pubKey, tag])
  const items: object[] = getItems(resultSet)
  const relays: List[] = items.map((object) => databaseToEntity(object))
  return relays[0]
}
