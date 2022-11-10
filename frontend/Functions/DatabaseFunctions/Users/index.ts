import { getItems } from '..'
import { QuickSQLiteConnection, QueryResult } from 'react-native-quick-sqlite'

export interface User {
  id: string
  main_relay?: string
  name?: string
  picture?: string
  about?: string
  contact?: boolean
  follower?: boolean
}

const databaseToEntity: (object: object) => User = (object) => {
  return object as User
}

export const updateUserFollower: (
  userId: string,
  db: QuickSQLiteConnection,
  follower: boolean,
) => Promise<QueryResult | null> = async (userId, db, follower) => {
  const userQuery = `UPDATE nostros_users SET follower = ? WHERE id = ?`

  await addUser(userId, db)
  return db.execute(userQuery, [follower ? 1 : 0, userId])
}
export const updateUserContact: (
  userId: string,
  db: QuickSQLiteConnection,
  contact: boolean,
) => Promise<QueryResult | null> = async (userId, db, contact) => {
  const userQuery = `UPDATE nostros_users SET contact = ? WHERE id = ?`

  await addUser(userId, db)
  return db.execute(userQuery, [contact ? 1 : 0, userId])
}

export const getUser: (pubkey: string, db: QuickSQLiteConnection) => Promise<User | null> = async (
  pubkey,
  db,
) => {
  const userQuery = `SELECT * FROM nostros_users WHERE id = '${pubkey}';`
  const resultSet = await db.execute(userQuery)

  if (resultSet.rows && resultSet.rows?.length > 0) {
    const items: object[] = getItems(resultSet)
    const user: User = databaseToEntity(items[0])
    return user
  } else {
    return null
  }
}

export const addUser: (pubKey: string, db: QuickSQLiteConnection) => Promise<QueryResult> = async (
  pubKey,
  db,
) => {
  const query = `
    INSERT OR IGNORE INTO nostros_users (id) VALUES (?)
  `
  return db.execute(query, [pubKey])
}

export const getUsers: (
  db: QuickSQLiteConnection,
  options: { exludeIds?: string[]; contacts?: boolean; followers?: boolean; includeIds?: string[] },
) => Promise<User[]> = async (db, { exludeIds, contacts, followers, includeIds }) => {
  let userQuery = 'SELECT * FROM nostros_users '

  const filters = []

  if (contacts) {
    filters.push('contact = 1')
  }

  if (includeIds && includeIds.length > 0) {
    filters.push(`id IN ('${includeIds.join("', '")}')`)
  }

  if (followers) {
    filters.push('follower = 1')
  }

  if (filters.length > 0) {
    userQuery += `WHERE ${filters.join(' OR ')} `
    if (exludeIds && exludeIds.length > 0) {
      userQuery += `AND id NOT IN ('${exludeIds.join("', '")}') `
    }
  } else {
    if (exludeIds && exludeIds.length > 0) {
      userQuery += `WHERE id NOT IN ('${exludeIds.join("', '")}') `
    }
  }

  userQuery += 'ORDER BY name,id'

  const resultSet = db.execute(userQuery)
  if (resultSet.rows && resultSet.rows.length > 0) {
    const items: object[] = getItems(resultSet)
    const users: User[] = items.map((object) => databaseToEntity(object))
    return users
  } else {
    return []
  }
}
