import { QueryResult, QuickSQLiteConnection } from 'react-native-quick-sqlite'
import { getItems } from '..'
import { Event } from '../../../lib/nostr/Events'

export interface Group extends Event {
  name?: string
  about?: string
  picture?: string
  user_name?: string
  valid_nip05: boolean
}

export interface GroupMessage extends Event {
  pending: boolean
  name: string
  picture?: string
  valid_nip05?: boolean
}

const databaseToGroup: (object: any) => Group = (object = {}) => {
  object.tags = object.tags ? JSON.parse(object.tags) : []
  return object as Group
}

const databaseToGroupMessage: (object: any) => GroupMessage = (object = {}) => {
  object.tags = object.tags ? JSON.parse(object.tags) : []
  return object as GroupMessage
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

export const getGroups: (db: QuickSQLiteConnection) => Promise<Group[]> = async (db) => {
  const groupsQuery = `
    SELECT
      nostros_group_meta.*, nostros_users.name as user_name, nostros_users.valid_nip05
    FROM
      nostros_group_meta
    LEFT JOIN
      nostros_users ON nostros_users.id = nostros_group_meta.pubkey
  `
  const resultSet = await db.execute(groupsQuery)
  const items: object[] = getItems(resultSet)
  const notes: Group[] = items.map((object) => databaseToGroup(object))

  return notes
}

export const addGroup: (
  db: QuickSQLiteConnection,
  groupId: string,
  groupName: string,
  pubkey: string
) => Promise<QueryResult> = async (db, groupId, groupName, pubkey) => {
  const query = `
    INSERT OR IGNORE INTO nostros_group_meta (id, name, created_at, pubkey) VALUES (?, ?, ?, ?)
  `
  return db.execute(query, [groupId, groupName, 0, pubkey])
}

export const getGroup: (db: QuickSQLiteConnection, groupId: string) => Promise<Group> = async (
  db,
  groupId,
) => {
  const groupsQuery = `
    SELECT
      *
    FROM
      nostros_group_meta
    WHERE
      id = ?
  `
  const resultSet = await db.execute(groupsQuery, [groupId])
  const items: object[] = getItems(resultSet)
  const group: Group = databaseToGroup(items[0])

  return group
}

export const getGroupMessages: (
  db: QuickSQLiteConnection,
  groupId: string,
  options: {
    order?: 'DESC' | 'ASC'
    limit?: number
  },
) => Promise<GroupMessage[]> = async (db, groupId, { order = 'DESC', limit }) => {
  let notesQuery = `
    SELECT
      nostros_group_messages.*, nostros_users.name, nostros_users.picture, nostros_users.valid_nip05
    FROM
      nostros_group_messages
    LEFT JOIN
      nostros_users ON nostros_users.id = nostros_group_messages.pubkey
    WHERE group_id = "${groupId}"
    AND nostros_users.muted_groups < 1
    ORDER BY created_at ${order} 
  `
  if (limit) {
    notesQuery += `LIMIT ${limit}`
  }

  const resultSet = await db.execute(notesQuery)
  const items: object[] = getItems(resultSet)
  const messages: GroupMessage[] = items.map((object) => databaseToGroupMessage(object))

  return messages
}

export const deleteGroupMessages: (
  db: QuickSQLiteConnection,
  pubkey: string,
) => Promise<QueryResult> = async (db, pubkey) => {
  const deleteQuery = `
    DELETE FROM nostros_group_messages 
    WHERE pubkey = ?
  `

  return db.execute(deleteQuery, [pubkey])
}

export const deleteGroup: (
  db: QuickSQLiteConnection,
  groupId: string,
) => Promise<QueryResult> = async (db, groupId) => {
  const deleteMessagesQuery = `
    DELETE FROM nostros_group_messages 
    WHERE group_id = ?
  `
  await db.execute(deleteMessagesQuery, [groupId])
  const deleteQuery = `
    DELETE FROM nostros_group_meta
    WHERE id = ?
  `
  return db.execute(deleteQuery, [groupId])
}
