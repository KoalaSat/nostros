import { getItems } from '..'
import { QuickSQLiteConnection, QueryResult } from 'react-native-quick-sqlite'
import { Event, EventKind, verifySignature } from '../../../lib/nostr/Events'
import { tagToUser } from '../../RelayFunctions/Users'

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

export const insertUserMeta: (
  event: Event,
  db: QuickSQLiteConnection,
) => Promise<QueryResult | null> = async (event, db) => {
  const valid = await verifySignature(event)

  if (valid && event.kind === EventKind.meta) {
    const user: User = JSON.parse(event.content)
    const id = event.pubkey
    const name = user.name?.replace("\\'", "'") ?? ''
    const mainRelay = user.main_relay?.replace("\\'", "'") ?? ''
    const about = user.about?.replace("\\'", "'") ?? ''
    const picture = user.picture?.replace("\\'", "'") ?? ''

    const query = `
      INSERT OR REPLACE INTO nostros_users 
        (id, name, picture, about, main_relay, contact, follower)
      VALUES
        (?,?,?,?,?,(SELECT contact FROM nostros_users WHERE id = ?),(SELECT follower FROM nostros_users WHERE id = ?));
    `
    const queryParams = [
      id,
      name.split("'").join("''"),
      picture.split("'").join("''"),
      about.split("'").join("''"),
      mainRelay.split("'").join("''"),
      id,
      id,
    ]
    return await db.executeAsync(query, queryParams)
  } else {
    return null
  }
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

export const insertUserPets: (
  event: Event,
  db: QuickSQLiteConnection,
) => Promise<User[] | null> = async (event, db) => {
  const valid = await verifySignature(event)

  if (valid && event.kind === EventKind.petNames) {
    const users: User[] = event.tags.map((tag) => tagToUser(tag))
    users.map(async (user) => {
      return await updateUserContact(user.id, db, true)
    })
    return users
  } else {
    return null
  }
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

export const removeContact: (
  pubkey: string,
  db: QuickSQLiteConnection,
) => Promise<QueryResult> = async (pubkey, db) => {
  const userQuery = `UPDATE nostros_users SET contact = 0 WHERE id = ?`

  return db.execute(userQuery, [pubkey])
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
