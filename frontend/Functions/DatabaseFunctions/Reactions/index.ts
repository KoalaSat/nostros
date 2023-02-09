import { QuickSQLiteConnection } from 'react-native-quick-sqlite'
import { getItems } from '..'
import { Event, evetDatabaseToEntity } from '../../../lib/nostr/Events'

export interface Reaction extends Event {
  positive: boolean
  reacted_event_id: string
  reacted_user_id: string
}

const databaseToEntity: (object: object) => Reaction = (object) => {
  return object as Reaction
}

export const getRawUserReactions: (
  db: QuickSQLiteConnection,
  pubKey: string,
) => Promise<Event[]> = async (db, pubKey) => {
  const notesQuery = `SELECT * FROM nostros_reactions
    WHERE pubkey = ? 
    ORDER BY created_at DESC 
  `
  const resultSet = await db.execute(notesQuery, [pubKey])
  const items: object[] = getItems(resultSet)
  const notes: Event[] = items.map((object) => evetDatabaseToEntity(object))

  return notes
}

export const getReactions: (
  db: QuickSQLiteConnection,
  filters: {
    eventId: string
  },
) => Promise<Reaction[]> = async (db, { eventId }) => {
  const reactionsQuery = `
    SELECT 
      *
    FROM
      nostros_reactions
    WHERE reacted_event_id = "${eventId}"
  `

  const resultSet = await db.execute(reactionsQuery)
  const items: object[] = getItems(resultSet)
  const reactions: Reaction[] = items.map((object) => databaseToEntity(object))

  return reactions
}

export const getLastReaction: (
  db: QuickSQLiteConnection,
  filters: {
    eventIds: string[]
  },
) => Promise<Reaction> = async (db, { eventIds }) => {
  const eventIdsQuery = eventIds.join('", "')

  const reactionsQuery = `
    SELECT 
      *
    FROM
      nostros_reactions
    WHERE reacted_event_id IN ("${eventIdsQuery}")
    ORDER BY created_at DESC 
    LIMIT 1
  `

  const resultSet = await db.execute(reactionsQuery)
  const item: object = getItems(resultSet)[0]
  const reaction: Reaction = databaseToEntity(item)

  return reaction
}
