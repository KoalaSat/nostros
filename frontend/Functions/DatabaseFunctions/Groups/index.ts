import { type QueryResult, type QuickSQLiteConnection } from 'react-native-quick-sqlite'
import { getItems } from '..'
import { type Event } from '../../../lib/nostr/Events'

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

export const getGroups: (db: QuickSQLiteConnection) => Promise<Group[]> = async (db) => {
  const groupsQuery = `
    SELECT
      *
    FROM
      nostros_group_meta
    WHERE (deleted = NULL OR deleted = 0)
  `
  const resultSet = db.execute(groupsQuery)
  const items: object[] = getItems(resultSet)
  const notes: Group[] = items.map((object) => databaseToGroup(object))

  return notes
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
  const resultSet = db.execute(groupsQuery, [groupId])
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
    ids?: string[]
  },
) => Promise<GroupMessage[]> = async (db, groupId, { order = 'DESC', limit, ids }) => {
  let notesQuery = `
    SELECT
      nostros_group_messages.*, nostros_users.name, nostros_users.picture, nostros_users.valid_nip05
    FROM
      nostros_group_messages
    LEFT JOIN
      nostros_users ON nostros_users.id = nostros_group_messages.pubkey
    WHERE group_id = "${groupId}"
  `

  if (ids) {
    notesQuery += `AND ids IN ('${ids.join("', '")}')`
  }

  notesQuery += `
    AND (nostros_users.muted_groups IS NULL OR nostros_users.muted_groups < 1)
    ORDER BY created_at ${order} 
  `
  if (limit) {
    notesQuery += `LIMIT ${limit}`
  }

  const resultSet = db.execute(notesQuery)
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

export const getUserGroupMessagesCount: (
  db: QuickSQLiteConnection,
  publicKey: string,
) => Promise<number> = async (db, publicKey) => {
  const repliesQuery = `
    SELECT
      COUNT(*)
    FROM nostros_group_messages
    WHERE user_mentioned = 1
    AND (read = NULL OR read = 0)
  `

  const resultSet = db.execute(repliesQuery)
  const item: { 'COUNT(*)': number } = resultSet?.rows?.item(0)

  return item['COUNT(*)'] ?? 0
}

export const getGroupMessagesCount: (
  db: QuickSQLiteConnection,
  groupId: string,
) => Promise<number> = async (db, groupId) => {
  const repliesQuery = `
    SELECT
      COUNT(*)
    FROM nostros_group_messages
    WHERE (read = NULL OR read = 0)
    AND group_id = '${groupId}'
  `

  const resultSet = db.execute(repliesQuery)
  const item: { 'COUNT(*)': number } = resultSet?.rows?.item(0)

  return item['COUNT(*)'] ?? 0
}

export const getGroupMessagesMentionsCount: (
  db: QuickSQLiteConnection,
  groupId: string,
) => Promise<number> = async (db, groupId) => {
  const repliesQuery = `
    SELECT
      COUNT(*)
    FROM nostros_group_messages
    WHERE (read = NULL OR read = 0)
    AND user_mentioned = 1 
    AND group_id = '${groupId}'
  `

  const resultSet = db.execute(repliesQuery)
  const item: { 'COUNT(*)': number } = resultSet?.rows?.item(0)

  return item['COUNT(*)'] ?? 0
}

export const getRawUserGroupMessages: (
  db: QuickSQLiteConnection,
  pubKey: string,
) => Promise<Event[]> = async (db, pubKey) => {
  const notesQuery = `SELECT * FROM nostros_group_messages
    WHERE pubkey = ? 
    ORDER BY created_at DESC 
  `
  const resultSet = db.execute(notesQuery, [pubKey])
  const items: object[] = getItems(resultSet)
  const groupMessages: Event[] = items.map((object) => databaseToGroupMessage(object))

  return groupMessages
}

export const getRawUserGroups: (
  db: QuickSQLiteConnection,
  pubKey: string,
) => Promise<Event[]> = async (db, pubKey) => {
  const notesQuery = `SELECT * FROM nostros_groups
    WHERE pubkey = ? 
    ORDER BY created_at DESC 
  `
  const resultSet = db.execute(notesQuery, [pubKey])
  const items: object[] = getItems(resultSet)
  const groups: Event[] = items.map((object) => databaseToGroup(object))

  return groups
}
