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
        (id, name, picture, about, main_relay, contact)
      VALUES
        (?,?,?,?,?, (SELECT contact FROM nostros_users WHERE id = ?));
    `
    const queryParams = [
      id,
      name.split("'").join("''"),
      picture.split("'").join("''"),
      about.split("'").join("''"),
      mainRelay.split("'").join("''"),
      id,
    ]

    return await db.executeAsync(query, queryParams)
  } else {
    return null
  }
}

export const insertUserContact: (
  event: Event,
  db: QuickSQLiteConnection,
) => Promise<User[] | null> = async (event, db) => {
  const valid = await verifySignature(event)

  if (valid && event.kind === EventKind.petNames) {
    const users: User[] = event.tags.map((tag) => tagToUser(tag))
    users.map(async (user) => {
      return await addContact(user.id, db)
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
  const userQuery = `UPDATE nostros_users SET contact = FALSE WHERE id = ?`

  return db.execute(userQuery, [pubkey])
}

export const addContact: (
  pubKey: string,
  db: QuickSQLiteConnection,
) => Promise<QueryResult> = async (pubKey, db) => {
  const query = `
    INSERT INTO nostros_users (id, contact)
    VALUES (?, ?)
    ON CONFLICT (id) DO
    UPDATE SET contact=excluded.contact;
  `

  return db.execute(query, [pubKey, '1'])
}

export const getUsers: (
  db: QuickSQLiteConnection,
  options: { exludeIds?: string[]; contacts?: boolean; includeIds?: string[] },
) => Promise<User[]> = async (db, { exludeIds, contacts, includeIds }) => {
  let userQuery = 'SELECT * FROM nostros_users '

  if (contacts) {
    userQuery += 'WHERE contact = TRUE '
  }

  if (exludeIds && exludeIds.length > 0) {
    if (!contacts) {
      userQuery += 'WHERE '
    } else {
      userQuery += 'AND '
    }
    userQuery += `id NOT IN ('${exludeIds.join("', '")}') `
  }

  if (includeIds && includeIds.length > 0) {
    if (!contacts && !exludeIds) {
      userQuery += 'WHERE '
    } else {
      userQuery += 'OR '
    }
    userQuery += `id IN ('${includeIds.join("', '")}') `
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
