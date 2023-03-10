import { type QuickSQLiteConnection } from 'react-native-quick-sqlite'
import { getItems } from '..'
import { type Event, evetDatabaseToEntity } from '../../../lib/nostr/Events'

export interface Note extends Event {
  name: string
  picture: string
  lnurl: string
  ln_address: string
  reply_event_id: string
  user_created_at: number
  nip05: string
  valid_nip05: number
  zap_pubkey: string
  repost_id: string
  blocked: number
}

export interface NoteRelay {
  note_id: string
  pubkey: string
  relay_url: string
}

const databaseToEntity: (object: any) => Note = (object = {}) => {
  object.tags = object.tags ? JSON.parse(object.tags) : []
  return object as Note
}

const noteRelayDatabaseToEntity: (object: any) => NoteRelay = (object = {}) => {
  object.tags = object.tags ? JSON.parse(object.tags) : []
  return object as NoteRelay
}

export const getMainNotes: (
  db: QuickSQLiteConnection,
  limit: number,
  filters?: {
    contants?: boolean
    until?: number
    pubKey?: string
  },
) => Promise<Note[]> = async (db, limit, filters) => {
  let notesQuery = `
    SELECT
      nostros_notes.*, nostros_users.zap_pubkey, nostros_users.nip05, nostros_users.blocked, nostros_users.valid_nip05, 
      nostros_users.ln_address, nostros_users.lnurl, nostros_users.name, nostros_users.picture, nostros_users.contact, 
      nostros_users.created_at as user_created_at FROM nostros_notes
    LEFT JOIN
      nostros_users ON nostros_users.id = nostros_notes.pubkey
    WHERE 
  `

  if (filters?.contants && filters?.pubKey) {
    notesQuery += `(nostros_users.contact = 1 OR nostros_notes.pubkey = '${filters?.pubKey}') AND `
  } else if (filters?.pubKey) {
    notesQuery += `nostros_notes.pubkey = '${filters?.pubKey}' AND `
  }

  if (filters?.until) notesQuery += `nostros_notes.created_at <= ${filters?.until} AND `

  notesQuery += `
    (nostros_notes.main_event_id IS NULL OR nostros_notes.repost_id IS NOT NULL)
    ORDER BY created_at DESC
    LIMIT ${limit}
  `
  const resultSet = await db.execute(notesQuery)
  const items: object[] = getItems(resultSet)
  const notes: Note[] = items.map((object) => databaseToEntity(object))

  return notes
}
export const getReplyNotes: (
  db: QuickSQLiteConnection,
  pubKey: string,
  limit: number,
  filters?: {
    until?: number
  },
) => Promise<Note[]> = async (db, pubKey, limit, filters) => {
  let notesQuery = `
    SELECT
      nostros_notes.*, nostros_users.zap_pubkey, nostros_users.nip05, nostros_users.blocked, nostros_users.valid_nip05, 
      nostros_users.ln_address, nostros_users.lnurl, nostros_users.name, nostros_users.picture, nostros_users.contact, 
      nostros_users.created_at as user_created_at FROM nostros_notes
    LEFT JOIN
      nostros_users ON nostros_users.id = nostros_notes.pubkey
    WHERE 
      nostros_notes.pubkey = '${pubKey}' AND 
  `

  if (filters?.until) notesQuery += `nostros_notes.created_at <= ${filters?.until} AND `

  notesQuery += `
    nostros_notes.main_event_id IS NOT NULL AND
    nostros_notes.repost_id IS NULL
    ORDER BY created_at DESC
    LIMIT ${limit}
  `

  const resultSet = await db.execute(notesQuery)
  const items: object[] = getItems(resultSet)
  const notes: Note[] = items.map((object) => databaseToEntity(object))

  return notes
}

export const getMainNotesCount: (
  db: QuickSQLiteConnection,
  from: number,
) => Promise<number> = async (db, from) => {
  const repliesQuery = `
    SELECT
      COUNT(*)
    FROM nostros_notes 
    LEFT JOIN
      nostros_users ON nostros_users.id = nostros_notes.pubkey
    WHERE 
    nostros_users.blocked != 1 AND
    nostros_notes.main_event_id IS NULL AND 
    nostros_notes.created_at > "${from}"
  `
  const resultSet = db.execute(repliesQuery)
  const item: { 'COUNT(*)': number } = resultSet?.rows?.item(0)

  return item['COUNT(*)'] ?? 0
}

export const getNoteRelays: (
  db: QuickSQLiteConnection,
  noteId: string,
) => Promise<NoteRelay[]> = async (db, noteId) => {
  const relaysQuery = `
    SELECT
      *
    FROM nostros_notes_relays
    WHERE note_id = "${noteId}"
    ORDER BY relay_url
  `
  const resultSet = await db.execute(relaysQuery)
  const items: object[] = getItems(resultSet)
  const relays: NoteRelay[] = items.map((object) => noteRelayDatabaseToEntity(object))

  return relays
}

export const getMentionNotes: (
  db: QuickSQLiteConnection,
  pubKey: string,
  limit: number,
) => Promise<Note[]> = async (db, pubKey, limit) => {
  const notesQuery = `
    SELECT
      nostros_notes.*, nostros_users.zap_pubkey, nostros_users.nip05, nostros_users.valid_nip05, nostros_users.lnurl, 
      nostros_users.ln_address, nostros_users.name, nostros_users.picture, nostros_users.contact, 
      nostros_users.created_at as user_created_at FROM nostros_notes
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

export const getReactedNotes: (
  db: QuickSQLiteConnection,
  pubKey: string,
  limit: number,
) => Promise<Note[]> = async (db, pubKey, limit) => {
  const notesQuery = `
    SELECT
      nostros_notes.*, nostros_users.zap_pubkey, nostros_users.nip05, nostros_users.valid_nip05, nostros_users.lnurl, 
      nostros_users.ln_address, nostros_users.name, nostros_users.picture, nostros_users.contact, 
      nostros_users.created_at as user_created_at FROM nostros_notes
    LEFT JOIN
      nostros_users ON nostros_users.id = nostros_notes.pubkey
    WHERE nostros_notes.id IN (
      SELECT reacted_event_id FROM nostros_reactions WHERE pubkey = '${pubKey}'
    )
    ORDER BY created_at DESC
    LIMIT ${limit}
  `

  const resultSet = await db.execute(notesQuery)
  const items: object[] = getItems(resultSet)
  const notes: Note[] = items.map((object) => databaseToEntity(object))

  return notes
}

export const getRepostedNotes: (
  db: QuickSQLiteConnection,
  pubKey: string,
  limit: number,
) => Promise<Note[]> = async (db, pubKey, limit) => {
  const notesQuery = `
    SELECT
      nostros_notes.*, nostros_users.zap_pubkey, nostros_users.nip05, nostros_users.valid_nip05, nostros_users.lnurl, 
      nostros_users.ln_address, nostros_users.name, nostros_users.picture, nostros_users.contact, 
      nostros_users.created_at as user_created_at FROM nostros_notes
    LEFT JOIN
      nostros_users ON nostros_users.id = nostros_notes.pubkey
    WHERE nostros_notes.repost_id IS NOT NULL AND
    pubkey = '${pubKey}' 
    ORDER BY created_at DESC
    LIMIT ${limit}
  `

  const resultSet = await db.execute(notesQuery)
  const items: object[] = getItems(resultSet)
  const notes: Note[] = items.map((object) => databaseToEntity(object))

  return notes
}

export const getRepliesCount: (
  db: QuickSQLiteConnection,
  eventId: string,
) => Promise<number> = async (db, eventId) => {
  const repliesQuery = `
    SELECT
      COUNT(*)
    FROM nostros_notes
    WHERE reply_event_id = "${eventId}"
  `
  const resultSet = db.execute(repliesQuery)
  const item: { 'COUNT(*)': number } = resultSet?.rows?.item(0)

  return item['COUNT(*)'] ?? 0
}

export const getNotificationsIds: (
  db: QuickSQLiteConnection,
  pubKey: string,
  since: number,
) => Promise<string[]> = async (db, pubKey, notificationSeenAt) => {
  const repliesQuery = `
    SELECT
      id
    FROM nostros_notes
    WHERE (nostros_notes.reply_event_id IN (
      SELECT nostros_notes.id FROM nostros_notes WHERE pubkey = '${pubKey}'
    ) OR nostros_notes.user_mentioned = 1)
    AND nostros_notes.pubkey != '${pubKey}'
    AND created_at > ${notificationSeenAt};
  `
  const resultSet = db.execute(repliesQuery)
  const items: Note[] = getItems(resultSet) as Note[]
  const ids: string[] = items.map((item) => item.id ?? '')

  return ids
}

export const getRepostCount: (
  db: QuickSQLiteConnection,
  eventId: string,
) => Promise<number> = async (db, eventId) => {
  const repliesQuery = `
    SELECT
      COUNT(*)
    FROM nostros_notes
    WHERE repost_id = "${eventId}"
  `
  const resultSet = db.execute(repliesQuery)
  const item: { 'COUNT(*)': number } = resultSet?.rows?.item(0)

  return item['COUNT(*)'] ?? 0
}

export const isUserReposted: (
  db: QuickSQLiteConnection,
  eventId: string,
  publicKey: string,
) => Promise<boolean> = async (db, eventId, publicKey) => {
  const repliesQuery = `
    SELECT
      COUNT(*)
    FROM nostros_notes
    WHERE repost_id = "${eventId}"
    AND pubkey = "${publicKey}"
  `
  const resultSet = db.execute(repliesQuery)
  const item: { 'COUNT(*)': number } = resultSet?.rows?.item(0)

  return (item['COUNT(*)'] ?? 0) > 0
}

export const getLastReply: (
  db: QuickSQLiteConnection,
  filters: {
    eventIds: string[]
  },
) => Promise<Note> = async (db, { eventIds }) => {
  const eventIdsQuery = eventIds.join('", "')
  const replyQuery = `
    SELECT
      *
    FROM
      nostros_notes
    WHERE reply_event_id IN ("${eventIdsQuery}")
    ORDER BY created_at DESC
    LIMIT 1
  `

  const resultSet = await db.execute(replyQuery)
  const item: object = getItems(resultSet)[0]
  const reaction: Note = databaseToEntity(item)

  return reaction
}

export const getRawUserNotes: (
  db: QuickSQLiteConnection,
  pubKey: string,
) => Promise<Event[]> = async (db, pubKey) => {
  const notesQuery = `SELECT * FROM nostros_notes
    WHERE pubkey = ? 
    ORDER BY created_at DESC 
  `
  const resultSet = await db.execute(notesQuery, [pubKey])
  const items: object[] = getItems(resultSet)
  const notes: Event[] = items.map((object) => evetDatabaseToEntity(object))

  return notes
}

export const getNotes: (
  db: QuickSQLiteConnection,
  options: {
    filters?: Record<string, string[]>
    limit?: number
    contacts?: boolean
    includeIds?: string[]
  },
) => Promise<Note[]> = async (db, { filters = {}, limit, contacts, includeIds }) => {
  let notesQuery = `
    SELECT
      nostros_notes.*, nostros_users.zap_pubkey, nostros_users.nip05, nostros_users.valid_nip05, 
      nostros_users.ln_address, nostros_users.lnurl, nostros_users.name, nostros_users.picture, 
      nostros_users.contact, nostros_users.created_at as user_created_at FROM nostros_notes
    LEFT JOIN
      nostros_users ON nostros_users.id = nostros_notes.pubkey
  `

  if (filters) {
    const keys = Object.keys(filters)
    if (Object.keys(filters).length > 0) {
      notesQuery += 'WHERE '
      keys.forEach((column, index) => {
        notesQuery += `nostros_notes.${column} IN ('${filters[column].join("', '")}') `
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
