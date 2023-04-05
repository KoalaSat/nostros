import { type Kind } from 'nostr-tools'
import { type QuickSQLiteConnection } from 'react-native-quick-sqlite'
import { getItems } from '..'

export interface Notification {
  content: string
  created_at: number
  id?: string
  kind: Kind | number
  pubkey: string
  amount: number
  event_id?: string
  tags: string[][]
  name: string
}
const databaseToEntity: (object: any) => Notification = (object) => {
  object.tags = object.tags ? JSON.parse(object.tags) : []
  return object as Notification
}

export const getNotifications: (
  db: QuickSQLiteConnection,
  options: {
    limit?: number
    since?: number
  },
) => Promise<Notification[]> = async (db, { limit, since }) => {
  let notificationsQuery = `
    SELECT
      nostros_notifications.*, nostros_users.name
    FROM
      nostros_notifications
    LEFT JOIN
      nostros_users ON nostros_users.id = nostros_notifications.pubkey
  `
  if (since) {
    notificationsQuery += `WHERE nostros_notifications.created_at > ${since} `
  }
  notificationsQuery += 'ORDER BY nostros_notifications.created_at DESC '
  if (limit) {
    notificationsQuery += `LIMIT ${limit} `
  }

  const resultSet = db.execute(notificationsQuery)
  const items: object[] = getItems(resultSet)
  const messages: Notification[] = items.map((object) => databaseToEntity(object))

  return messages
}
