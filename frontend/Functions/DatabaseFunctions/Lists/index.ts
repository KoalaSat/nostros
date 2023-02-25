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
) => Promise<List> = async (db, kind, pubKey) => {
  const notesQuery = 'SELECT * FROM nostros_lists WHERE kind = ? AND pubkey = ?;'
  const resultSet = await db.execute(notesQuery, [kind, pubKey])
  const items: object[] = getItems(resultSet)
  const relays: List[] = items.map((object) => databaseToEntity(object))
  return relays[0]
}
