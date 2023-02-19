import { QuickSQLiteConnection } from 'react-native-quick-sqlite'
import { getItems } from '..'
import { Event } from '../../../lib/nostr/Events'

export interface Zap extends Event {
  amount: boolean
  zapped_event_id: string
  zapped_user_id: string
  zapper_user_id: string
  name: string
  picture: string
  user_id: string
  valid_nip05: number
  nip05: string
  lnurl: string
  ln_address: string
}

const databaseToEntity: (object: object) => Zap = (object) => {
  return object as Zap
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

export const getZaps: (db: QuickSQLiteConnection, eventId: string) => Promise<Zap[]> = async (
  db,
  eventId,
) => {
  const groupsQuery = `
    SELECT
      nostros_zaps.*, nostros_users.name, nostros_users.id as user_id, nostros_users.picture, nostros_users.valid_nip05, 
      nostros_users.nip05, nostros_users.lnurl, nostros_users.ln_address
    FROM
      nostros_zaps
    LEFT JOIN
      nostros_users ON nostros_users.id = nostros_zaps.zapper_user_id
    WHERE zapped_event_id = "${eventId}"
  `
  const resultSet = await db.execute(groupsQuery)
  const items: object[] = getItems(resultSet)
  const notes: Zap[] = items.map((object) => databaseToEntity(object))

  return notes
}
