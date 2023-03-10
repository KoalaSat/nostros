import { type QuickSQLiteConnection } from 'react-native-quick-sqlite'
import { getItems } from '..'
import { type Event, evetDatabaseToEntity } from '../../../lib/nostr/Events'

export interface DirectMessage extends Event {
  conversation_id: string
  read: boolean
  pending: boolean
  valid_nip05: boolean
}

const databaseToEntity: (object: any) => DirectMessage = (object = {}) => {
  object.tags = object.tags ? JSON.parse(object.tags) : []
  return object as DirectMessage
}

export const getRawUserConversation: (
  db: QuickSQLiteConnection,
  pubKey: string,
) => Promise<Event[]> = async (db, pubKey) => {
  const notesQuery = `SELECT * FROM nostros_direct_messages
    WHERE pubkey = ? 
    ORDER BY created_at DESC 
  `
  const resultSet = await db.execute(notesQuery, [pubKey])
  const items: object[] = getItems(resultSet)
  const notes: Event[] = items.map((object) => evetDatabaseToEntity(object))

  return notes
}

export const getDirectMessagesCount: (
  db: QuickSQLiteConnection,
  pubKey: string,
) => Promise<number> = async (db, pubKey) => {
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

export const getGroupedDirectMessages: (
  db: QuickSQLiteConnection,
  options: {
    order?: 'DESC' | 'ASC'
    limit?: number
  },
) => Promise<DirectMessage[]> = async (db, { limit, order = 'DESC' }) => {
  let notesQuery = `
    SELECT
      *, MAX(created_at) AS request_id
    FROM
      nostros_direct_messages
  `
  notesQuery += 'GROUP BY conversation_id '
  notesQuery += `ORDER BY created_at ${order} `
  if (limit) notesQuery += `LIMIT ${limit}`

  const resultSet = await db.execute(notesQuery)
  const items: object[] = getItems(resultSet)
  const notes: DirectMessage[] = items.map((object) => databaseToEntity(object))

  return notes
}

export const getDirectMessages: (
  db: QuickSQLiteConnection,
  conversationId: string,
  options: {
    order?: 'DESC' | 'ASC'
    limit?: number
  },
) => Promise<DirectMessage[]> = async (db, conversationId, { order = 'DESC', limit }) => {
  let notesQuery = `
    SELECT
      *
    FROM
      nostros_direct_messages
    WHERE conversation_id = "${conversationId}"
    ORDER BY created_at ${order} 
  `
  if (limit) {
    notesQuery += `LIMIT ${limit}`
  }

  const resultSet = await db.execute(notesQuery)
  const items: object[] = getItems(resultSet)
  const notes: DirectMessage[] = items.map((object) => databaseToEntity(object))

  return notes
}

export const getUserLastDirectMessages: (
  db: QuickSQLiteConnection,
  userId: string,
) => Promise<DirectMessage | null> = async (db, userId) => {
  const messageQuery = `
    SELECT
      *
    FROM
      nostros_direct_messages
    WHERE pubkey = ?
    ORDER BY created_at DESC
    LIMIT 1
  `

  const resultSet = await db.execute(messageQuery, [userId])
  const items: object[] = getItems(resultSet)
  if (items.length) {
    const notes: DirectMessage = databaseToEntity(items[0])

    return notes
  } else {
    return null
  }
}
