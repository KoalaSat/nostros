import { QuickSQLiteConnection } from 'react-native-quick-sqlite'
import { getItems } from '..'
import { Event } from '../../../lib/nostr/Events'

export interface Reaction extends Event {
  positive: boolean
  reacted_event_id: string
  reacted_user_id: string
}

const databaseToEntity: (object: object) => Reaction = (object) => {
  return object as Reaction
}

export const getReactionsCount: (
  db: QuickSQLiteConnection,
  filters: {
    eventId?: string
    pubKey?: string
    positive: boolean
  },
) => Promise<number> = async (db, { eventId, pubKey, positive }) => {
  let notesQuery = `
    SELECT 
      COUNT(*)
    FROM
      nostros_reactions
    WHERE positive = ${positive ? '1' : '0'} 
  `

  if (eventId) {
    notesQuery += `AND reacted_event_id = "${eventId}" `
  } else if (pubKey) {
    notesQuery += `AND reacted_user_id = "${pubKey}" `
  }

  const resultSet = await db.execute(notesQuery)
  const item: { 'COUNT(*)': number } = resultSet?.rows?.item(0)

  return item['COUNT(*)'] ?? 0
}

export const getUserReaction: (
  db: QuickSQLiteConnection,
  pubKey: string,
  filters: {
    eventId?: string
  },
) => Promise<Reaction[]> = async (db, pubKey, { eventId }) => {
  let notesQuery = `
    SELECT 
      *
    FROM
      nostros_reactions 
    WHERE pubkey = '${pubKey}' 
  `

  if (eventId) {
    notesQuery += `AND reacted_event_id = "${eventId}" `
  }

  const resultSet = await db.execute(notesQuery)
  const items: object[] = getItems(resultSet)
  const reactions: Reaction[] = items.map((object) => databaseToEntity(object))

  return reactions
}
