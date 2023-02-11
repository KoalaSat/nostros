import { QueryResult, QuickSQLiteConnection } from 'react-native-quick-sqlite'
import { getItems } from '..'
import { Event } from '../../../lib/nostr/Events'

export interface Group extends Event {
  name: string
  about?: string
  picture?: string
  user_name?: string
  valid_nip05: boolean
}

const databaseToEntity: (object: any) => Group = (object = {}) => {
  object.tags = object.tags ? JSON.parse(object.tags) : []
  return object as Group
}

export const updateConversationRead: (
  conversationId: string,
  db: QuickSQLiteConnection,
) => Promise<QueryResult | null> = async (conversationId, db) => {
  const userQuery = `UPDATE nostros_direct_messages SET read = ? WHERE conversation_id = ?`
  return db.execute(userQuery, [1, conversationId])
}

export const updateAllRead: (db: QuickSQLiteConnection) => Promise<QueryResult | null> = async (
  db,
) => {
  const userQuery = `UPDATE nostros_direct_messages SET read = ?`
  return db.execute(userQuery, [1])
}

export const getGroups: (
  db: QuickSQLiteConnection
) => Promise<Group[]> = async (db) => {
  const groupsQuery = `
    SELECT
      nostros_groups.*, nostros_users.name as user_name, nostros_users.valid_nip05
    FROM
      nostros_groups
    LEFT JOIN
      nostros_users ON nostros_users.id = nostros_groups.pubkey
  `
  const resultSet = await db.execute(groupsQuery)
  const items: object[] = getItems(resultSet)
  const notes: Group[] = items.map((object) => databaseToEntity(object))

  return notes
}

export const getGroup: (
  db: QuickSQLiteConnection,
  groupId: string
) => Promise<Group> = async (db, groupId) => {
  const groupsQuery = `
    SELECT
      *
    FROM
      nostros_groups
    WHERE
      id = ?
  `
  const resultSet = await db.execute(groupsQuery, [groupId])
  const items: object[] = getItems(resultSet)
  const group: Group = databaseToEntity(items[0])

  return group
}
