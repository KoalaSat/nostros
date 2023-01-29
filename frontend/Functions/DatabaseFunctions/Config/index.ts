import { getItems } from '..'
import { QuickSQLiteConnection, QueryResult } from 'react-native-quick-sqlite'

export interface Config {
  satoshi: 'kebab' | 'sats'
  show_public_images?: boolean
  show_sensitive?: boolean
  last_notification_seen_at?: number
  last_pets_at?: number
}

const databaseToEntity: (object: object) => Config = (object) => {
  return object as Config
}

export const getConfig: (db: QuickSQLiteConnection) => Promise<Config | null> = async (db) => {
  const userQuery = `SELECT * FROM nostros_config LIMIT 1;`
  const resultSet = await db.execute(userQuery)

  if (resultSet.rows && resultSet.rows?.length > 0) {
    const items: object[] = getItems(resultSet)
    const user: Config = databaseToEntity(items[0])
    return user
  } else {
    return null
  }
}

export const updateConfig: (
  config: Config,
  db: QuickSQLiteConnection,
) => Promise<QueryResult> = async (config, db) => {
  const configQuery = `UPDATE nostros_config SET satoshi = ?, show_public_images = ?, show_sensitive = ?`

  return db.execute(configQuery, [config.satoshi, config.show_public_images, config.show_sensitive])
}

export const getNotificationsCount: (
  db: QuickSQLiteConnection,
  pubKey: string,
) => Promise<number> = async (db, pubKey) => {
  const repliesQuery = `
    SELECT
      COUNT(*)
    FROM nostros_notes
    WHERE (nostros_notes.reply_event_id IN (
      SELECT nostros_notes.id FROM nostros_notes WHERE pubkey = '${pubKey}'
    ) OR nostros_notes.user_mentioned = 1)
    AND nostros_notes.pubkey != '${pubKey}'
    AND created_at > (SELECT last_notification_seen_at FROM nostros_config LIMIT 1);
  `
  const resultSet = db.execute(repliesQuery)
  const item: { 'COUNT(*)': number } = resultSet?.rows?.item(0)

  return item['COUNT(*)'] ?? 0
}
