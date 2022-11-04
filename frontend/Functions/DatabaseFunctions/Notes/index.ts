import { QuickSQLiteConnection, QueryResult } from 'react-native-quick-sqlite'
import { getItems } from '..'
import { Event, EventKind, verifySignature } from '../../../lib/nostr/Events'
import { getMainEventId, getReplyEventId } from '../../RelayFunctions/Events'

export interface Note extends Event {
  name: string
  picture: string
}

const databaseToEntity: (object: any) => Note = (object) => {
  object.tags = JSON.parse(object.tags)
  return object as Note
}

export const insertNote: (event: Event, db: QuickSQLiteConnection) => Promise<QueryResult | null> = async (
  event,
  db,
) => {
  const valid = await verifySignature(event)
  if (valid && event.id && [EventKind.textNote, EventKind.recommendServer].includes(event.kind)) {
    const notes = await getNotes(db, { filters: { id: event.id } })
    if (notes && notes.length === 0 && event.id && event.sig) {
      const mainEventId = getMainEventId(event) ?? ''
      const replyEventId = getReplyEventId(event) ?? ''
      const content = event.content.split("'").join("''")
      const tags = JSON.stringify(event.tags).split("'").join("''")
      const query = `INSERT INTO nostros_notes
          (id,content,created_at,kind,pubkey,sig,tags,main_event_id,reply_event_id)
          VALUES 
          (?,?,?,?,?,?,?,?,?);`
      const queryValues = [
        event.id,
        content,
        event.created_at,
        event.kind,
        event.pubkey,
        event.sig,
        tags,
        mainEventId,
        replyEventId,
      ]
      return db.executeAsync(query, queryValues)
    } else {
      return null
    }
  } else {
    return null
  }
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
    notesQuery += 'nostros_users.contact = TRUE '
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
