import { type QuickSQLiteConnection } from 'react-native-quick-sqlite'
import { getItems } from '..'
import { type Event } from '../../../lib/nostr/Events'

export interface Zap extends Event {
  amount: number
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
  preimage: string
}

const databaseToEntity: (object: any) => Zap = (object) => {
  object.tags = object.tags ? JSON.parse(object.tags) : []
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

export const getMostZapedNotes: (
  db: QuickSQLiteConnection,
  publicKey: string,
  limit: number,
  since: number,
) => Promise<Zap[]> = async (db, publicKey, limit, since) => {
  const zapsQuery = `
    SELECT 
      SUM(amount) as total, *
    FROM
      nostros_zaps
    WHERE zapped_user_id = '${publicKey}'
    AND created_at > ${since}
    GROUP BY zapped_event_id
    ORDER BY total DESC
    LIMIT ${limit}
  `
  const resultSet = db.execute(zapsQuery)
  const items: object[] = getItems(resultSet)
  const zaps: Zap[] = items.map((object) => databaseToEntity(object))

  return zaps
}

export const getMostZapedNotesContacts: (
  db: QuickSQLiteConnection,
  since: number,
) => Promise<Zap[]> = async (db, since) => {
  const zapsQuery = `
    SELECT 
      SUM(amount) as total, nostros_zaps.*
    FROM
      nostros_zaps
    LEFT JOIN
      nostros_users ON nostros_users.id = nostros_zaps.zapped_user_id
    WHERE nostros_zaps.created_at > ${since}
    AND nostros_users.contact = 1
    GROUP BY nostros_zaps.zapped_event_id
    ORDER BY total DESC
  `
  const resultSet = db.execute(zapsQuery)
  const items: object[] = getItems(resultSet)
  const zaps: Zap[] = items.map((object) => databaseToEntity(object))

  return zaps
}

export const getUserZaps: (
  db: QuickSQLiteConnection,
  publicKey: string,
  limitDate: number,
) => Promise<Zap[]> = async (db, publicKey, limitDate) => {
  const groupsQuery = `
    SELECT
      *
    FROM
      nostros_zaps
    WHERE zapped_user_id = "${publicKey}"
    AND created_at > ${limitDate}
  `

  const resultSet = db.execute(groupsQuery)
  const items: object[] = getItems(resultSet)
  const zaps: Zap[] = items.map((object) => databaseToEntity(object))

  return zaps
}

export const getZaps: (
  db: QuickSQLiteConnection,
  filters: { eventId?: string; zapperId?: string; limit?: number; preimages?: string[] },
) => Promise<Zap[]> = async (db, filters) => {
  let groupsQuery = `
    SELECT
      nostros_zaps.*, nostros_users.name, nostros_users.id as user_id, nostros_users.picture, nostros_users.valid_nip05, 
      nostros_users.nip05, nostros_users.lnurl, nostros_users.ln_address
    FROM
      nostros_zaps
    LEFT JOIN
      nostros_users ON nostros_users.id = nostros_zaps.zapper_user_id
  `

  if (filters.preimages) {
    groupsQuery += `
      WHERE preimage IN ("${filters.preimages.join('", "')}")
    `
  }

  if (filters.eventId) {
    groupsQuery += `
      WHERE zapped_event_id = "${filters.eventId}"
    `
  }

  if (filters.zapperId) {
    groupsQuery += `
      WHERE zapped_user_id = "${filters.zapperId}"
    `
  }

  if (filters.limit) {
    groupsQuery += `
      LIMIT ${filters.limit}
    `
  }
  const resultSet = db.execute(groupsQuery)
  const items: object[] = getItems(resultSet)
  const zaps: Zap[] = items.map((object) => databaseToEntity(object))

  return zaps
}
