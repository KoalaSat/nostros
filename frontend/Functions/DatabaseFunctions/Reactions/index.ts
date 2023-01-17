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
