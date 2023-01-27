import { getItems } from '..'
import { QuickSQLiteConnection, QueryResult } from 'react-native-quick-sqlite'

export interface Config {
  satoshi: 'kebab' | 'sats'
  show_public_images?: boolean
  show_sensitive?: boolean
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
