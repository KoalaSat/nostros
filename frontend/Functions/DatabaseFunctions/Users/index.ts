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

    const userDb = await getUser(user.id, db)
    console.log('userDb', userDb)
    if (userDb) {
      const userQuery = `
        UPDATE nostros_users  
        SET 
          name = ?',
          main_relay = ?,
          about = ?,
          picture = ?
        WHERE 
          id = ?;
      `
      const queryParams = [
        name.split("'").join("''"),
        mainRelay.split("'").join("''"),
        about.split("'").join("''"),
        picture.split("'").join("''"),
        user.id,
      ]
      return db.execute(userQuery, queryParams)
    } else {
      const userQuery = `
        INSERT INTO nostros_users 
          (id, name, picture, about, main_relay) 
        VALUES 
          (?,?,?,?,?);
      `
      const queryParams = [
        id,
        name.split("'").join("''"),
        picture.split("'").join("''"),
        about.split("'").join("''"),
        '',
      ]
      return db.execute(userQuery, queryParams)
    }
  } else {
    return null
  }
}

export const insertUserContact: (
  event: Event,
  db: QuickSQLiteConnection,
) => Promise<Array<Promise<QueryResult>> | null> = async (event, db) => {
  const valid = await verifySignature(event)

  if (valid && event.kind === EventKind.petNames) {
    const userTags: string[] = event.tags.map((tag) => tagToUser(tag).id)
    const users = userTags.map(async (userId) => {
      return await addContact(userId, db)
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
    console.log('if (resultSet.rows && resultSet.rows?.length > 0)', user)
    return user
  } else {
    console.log('NULL')
    return null
  }
}

export const removeContact: (
  pubkey: string,
  db: QuickSQLiteConnection,
) => Promise<QueryResult> = async (pubkey, db) => {
  const userQuery = `UPDATE nostros_users SET contact = FALSE WHERE id = '${pubkey}'`
  return db.execute(userQuery)
}

export const addContact: (
  pubkey: string,
  db: QuickSQLiteConnection,
) => Promise<QueryResult> = async (pubkey, db) => {
  const userDb = await getUser(pubkey, db)
  let userQuery = ''
  if (userDb) {
    userQuery = `UPDATE nostros_users SET contact = TRUE WHERE id = ?;`
  } else {
    userQuery = `INSERT INTO nostros_users (id, contact) VALUES (?, TRUE);`
  }
  return db.execute(userQuery, [pubkey])
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
