import { QueryResult, QuickSQLiteConnection } from 'react-native-quick-sqlite'
import { getItems } from '..'
import { Event } from '../../../lib/nostr/Events'

export interface DirectMessage extends Event {
  conversation_id: string
  read: boolean
  pending: boolean
}

const databaseToEntity: (object: any) => DirectMessage = (object = {}) => {
  object.tags = object.tags ? JSON.parse(object.tags) : []
  return object as DirectMessage
}

export const updateConversationRead: (
  conversationId: string,
  db: QuickSQLiteConnection,
) => Promise<QueryResult | null> = async (conversationId, db) => {
  const userQuery = `UPDATE nostros_direct_messages SET read = ? WHERE conversation_id = ?`
  return db.execute(userQuery, [1, conversationId])
}

export const getDirectMessagesCount: (
  db: QuickSQLiteConnection,
  pubKey: string,
  since: number,
) => Promise<number> = async (db, pubKey, notificationSeenAt) => {
  const repliesQuery = `
    SELECT
      COUNT(*)
    FROM nostros_direct_messages
    WHERE 
    pubkey != '${pubKey}' 
    AND read = 0
  `
  const resultSet = db.execute(repliesQuery)
  const item: { 'COUNT(*)': number } = resultSet?.rows?.item(0)

  return item['COUNT(*)'] ?? 0
}

export const updateAllRead: (
  db: QuickSQLiteConnection,
) => Promise<QueryResult | null> = async (db) => {
  const userQuery = `UPDATE nostros_direct_messages SET read = ?`
  return db.execute(userQuery, [1])
}


export const getGroupedDirectMessages: (
  db: QuickSQLiteConnection,
  options: {
    order?: 'DESC' | 'ASC'
  },
) => Promise<DirectMessage[]> = async (db, { order = 'DESC' }) => {
  let notesQuery = `
    SELECT
      *, MAX(created_at) AS request_id
    FROM
      nostros_direct_messages
  `
  notesQuery += 'GROUP BY conversation_id '
  notesQuery += `ORDER BY created_at ${order}`

  const resultSet = await db.execute(notesQuery)
  const items: object[] = getItems(resultSet)
  const notes: DirectMessage[] = items.map((object) => databaseToEntity(object))

  return notes
}

export const getDirectMessages: (
  db: QuickSQLiteConnection,
  conversationId: string,
  publicKey: string,
  otherPubKey: string,
  options: {
    order?: 'DESC' | 'ASC'
  },
) => Promise<DirectMessage[]> = async (
  db,
  conversationId,
  publicKey,
  otherPubKey,
  { order = 'DESC' },
) => {
  const notesQuery = `
    SELECT
      *
    FROM
      nostros_direct_messages
    WHERE conversation_id = "${conversationId}"
    ORDER BY created_at ${order}
  `
  // WHERE conversation_id = "${conversationId}"

  const resultSet = await db.execute(notesQuery)
  const items: object[] = getItems(resultSet)
  const notes: DirectMessage[] = items.map((object) => databaseToEntity(object))

  return notes
}
