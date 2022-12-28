import { QuickSQLiteConnection } from 'react-native-quick-sqlite'
import { getItems } from '..'
import { Event } from '../../../lib/nostr/Events'

export interface Note extends Event {
  name: string
  picture: string
}

const databaseToEntity: (object: any) => Note = (object) => {
  object.tags = JSON.parse(object.tags)
  return object as Note
}

export const getMainNotes: (
  db: QuickSQLiteConnection,
  pubKey: string,
  limit: number,
) => Promise<Note[]> = async (db, pubKey, limit) => {
  const notesQuery = `
    SELECT 
      nostros_notes.*, nostros_users.name, nostros_users.picture, nostros_users.contact FROM nostros_notes 
    LEFT JOIN 
      nostros_users ON nostros_users.id = nostros_notes.pubkey 
    WHERE (nostros_users.contact = 1 OR nostros_notes.pubkey = '${pubKey}')
    AND nostros_notes.main_event_id IS NULL 
    ORDER BY created_at DESC 
    LIMIT ${limit}
  `

  const resultSet = await db.execute(notesQuery)
  const items: object[] = getItems(resultSet)
  const notes: Note[] = items.map((object) => databaseToEntity(object))

  return notes
}

export const getMentionNotes: (
  db: QuickSQLiteConnection,
  pubKey: string,
  limit: number,
) => Promise<Note[]> = async (db, pubKey, limit) => {
  const notesQuery = `
    SELECT 
      nostros_notes.*, nostros_users.name, nostros_users.picture, nostros_users.contact FROM nostros_notes 
    LEFT JOIN 
      nostros_users ON nostros_users.id = nostros_notes.pubkey 
    WHERE (nostros_notes.reply_event_id IN (
      SELECT nostros_notes.id FROM nostros_notes WHERE pubkey = '${pubKey}'
    ) OR nostros_notes.user_mentioned = 1)
    AND nostros_notes.pubkey != '${pubKey}'
    ORDER BY created_at DESC 
    LIMIT ${limit}
  `

  const resultSet = await db.execute(notesQuery)
  const items: object[] = getItems(resultSet)
  const notes: Note[] = items.map((object) => databaseToEntity(object))

  return notes
}

export const getNotes: (
  db: QuickSQLiteConnection,
  options: {
    filters?: { [column: string]: string }
    limit?: number
    contacts?: boolean
    includeIds?: string[]
  },
) => Promise<Note[]> = async (db, { filters = {}, limit, contacts, includeIds }) => {
  let notesQuery = `
    SELECT 
      nostros_notes.*, nostros_users.name, nostros_users.picture, nostros_users.contact FROM nostros_notes 
    LEFT JOIN 
      nostros_users ON nostros_users.id = nostros_notes.pubkey
  `

  if (filters) {
    const keys = Object.keys(filters)
    if (Object.keys(filters).length > 0) {
      notesQuery += 'WHERE '
      keys.forEach((column, index) => {
        notesQuery += `nostros_notes.${column} = '${filters[column]}' `
        if (index < keys.length - 1) notesQuery += 'AND '
      })
    }
  }
  if (contacts) {
    if (Object.keys(filters).length > 0) {
      notesQuery += 'AND '
    } else {
      notesQuery += 'WHERE '
    }
    notesQuery += 'nostros_users.contact = 1 '
  }
  if (includeIds) {
    if (Object.keys(filters).length > 0 || contacts) {
      notesQuery += 'OR '
    } else {
      notesQuery += 'WHERE '
    }
    notesQuery += `nostros_users.id IN ('${includeIds.join("', '")}') `
  }

  notesQuery += 'ORDER BY created_at DESC '

  if (limit) {
    notesQuery += `LIMIT ${limit}`
  }

  const resultSet = await db.execute(notesQuery)
  const items: object[] = getItems(resultSet)
  const notes: Note[] = items.map((object) => databaseToEntity(object))

  return notes
}
