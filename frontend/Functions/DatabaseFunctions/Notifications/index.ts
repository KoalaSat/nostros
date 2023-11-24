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
  note_content?: string
  event_id?: string
  tags: string[][]
  name: string
  zapper_user_id: string
  zapper_name: string
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
      nostros_notifications.*, users1.name, users2.name as zapper_name, nostros_notes.content as note_content
    FROM
      nostros_notifications
    LEFT JOIN
      nostros_notes ON nostros_notes.id = nostros_notifications.event_id
    LEFT JOIN
      nostros_users users1 ON users1.id = nostros_notifications.pubkey
    LEFT JOIN
      nostros_users users2 ON users2.id = nostros_notifications.zapper_user_id
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
