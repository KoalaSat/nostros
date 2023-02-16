import { getItems } from '..'
import { QuickSQLiteConnection, QueryResult } from 'react-native-quick-sqlite'

export interface User {
  id: string
  main_relay?: string
  name?: string
  picture?: string
  about?: string
  contact?: boolean
  follower?: number
  lnurl?: string
  nip05?: string
  created_at?: number
  valid_nip05?: boolean
  blocked?: number
  muted_groups?: number
}

const databaseToEntity: (object: object) => User = (object) => {
  return object as User
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

export const updateUserBlock: (
  userId: string,
  db: QuickSQLiteConnection,
  blocked: boolean,
) => Promise<QueryResult | null> = async (userId, db, blocked) => {
  const userQuery = `UPDATE nostros_users SET blocked = ? WHERE id = ?`

  await addUser(userId, db)
  return db.execute(userQuery, [blocked ? 1 : 0, userId])
}

export const updateUserMutesGroups: (
  db: QuickSQLiteConnection,
  userId: string,
  muted: boolean,
) => Promise<QueryResult | null> = async (db, userId, muted) => {
  const userQuery = `UPDATE nostros_users SET muted_groups = ? WHERE id = ?`

  await addUser(userId, db)
  return db.execute(userQuery, [muted ? 1 : 0, userId])
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

export const getContactsCount: (db: QuickSQLiteConnection) => Promise<number> = async (db) => {
  const countQuery = 'SELECT COUNT(*) FROM nostros_users WHERE contact = 1'
  const resultSet = db.execute(countQuery)
  const item: { 'COUNT(*)': number } = resultSet?.rows?.item(0)

  return item['COUNT(*)'] ?? 0
}

export const getFollowersCount: (db: QuickSQLiteConnection) => Promise<number> = async (db) => {
  const countQuery = 'SELECT COUNT(*) FROM nostros_users WHERE follower = 1'
  const resultSet = db.execute(countQuery)
  const item: { 'COUNT(*)': number } = resultSet?.rows?.item(0)

  return item['COUNT(*)'] ?? 0
}

export const getBlocked: (db: QuickSQLiteConnection) => Promise<User[]> = async (db) => {
  const userQuery = 'SELECT * FROM nostros_users WHERE blocked = 1 ORDER BY created_at DESC'
  const resultSet = db.execute(userQuery)
  if (resultSet.rows && resultSet.rows.length > 0) {
    const items: object[] = getItems(resultSet)
    const users: User[] = items.map((object) => databaseToEntity(object))
    return users
  } else {
    return []
  }
}

export const getFollowersAndFollowing: (db: QuickSQLiteConnection) => Promise<User[]> = async (
  db,
) => {
  const userQuery =
    'SELECT * FROM nostros_users WHERE follower = 1 OR contact = 1 ORDER BY created_at DESC'
  const resultSet = db.execute(userQuery)
  if (resultSet.rows && resultSet.rows.length > 0) {
    const items: object[] = getItems(resultSet)
    const users: User[] = items.map((object) => databaseToEntity(object))
    return users
  } else {
    return []
  }
}

export const getUsers: (
  db: QuickSQLiteConnection,
  options: {
    name?: string
    exludeIds?: string[]
    contacts?: boolean
    followers?: boolean
    includeIds?: string[]
    order?: string
  },
) => Promise<User[]> = async (db, { name, exludeIds, contacts, followers, includeIds, order }) => {
  let userQuery = 'SELECT * FROM nostros_users '

  const filters = []

  if (contacts) {
    filters.push('contact = 1')
  }

  if (name) {
    filters.push(`name LIKE '${name}%'`)
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

  if (order) {
    userQuery += `ORDER BY ${order}`
  } else {
    userQuery += 'ORDER BY name,id'
  }

  const resultSet = db.execute(userQuery)
  if (resultSet.rows && resultSet.rows.length > 0) {
    const items: object[] = getItems(resultSet)
    const users: User[] = items.map((object) => databaseToEntity(object))
    return users
  } else {
    return []
  }
}
