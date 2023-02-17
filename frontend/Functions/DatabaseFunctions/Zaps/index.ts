import { QuickSQLiteConnection } from 'react-native-quick-sqlite'
import { Event } from '../../../lib/nostr/Events'

export interface Zap extends Event {
  amount: boolean
  zapped_event_id: string
  zapped_user_id: string
}

export const getZapsAmount: (
  db: QuickSQLiteConnection,
  eventId: string,
) => Promise<number> = async (db, eventId) => {
  const zapsQuery = `
    SELECT 
      SUM(amount)
    FROM
      nostros_zaps
    WHERE zapped_event_id = "${eventId}"
  `

  const resultSet = db.execute(zapsQuery)
  const item: { 'SUM(amount)': number } = resultSet?.rows?.item(0)

  return item['SUM(amount)'] ?? 0
}
