import { QuickSQLiteConnection } from 'react-native-quick-sqlite'
import { getItems } from '..'
import { Relay } from '../Relays'

export interface NoteRelay extends Relay {
  relay_url: string
  pubkey: string
  note_id: number
}
const databaseToEntity: (object: object) => NoteRelay = (object) => {
  return object as NoteRelay
}

export const getUserRelays: (
  db: QuickSQLiteConnection,
  pubKey: string,
) => Promise<NoteRelay[]> = async (db, pubKey) => {
  const query = `
    SELECT * FROM nostros_notes_relays LEFT JOIN
      nostros_relays ON nostros_relays.url = nostros_notes_relays.relay_url
    WHERE pubkey = ? GROUP BY relay_url
  `
  const resultSet = db.execute(query, [pubKey])
  if (resultSet.rows && resultSet.rows.length > 0) {
    const items: object[] = getItems(resultSet)
    const users: NoteRelay[] = items.map((object) => databaseToEntity(object))
    return users
  } else {
    return []
  }
}

export const getNoteRelaysUsage: (
  db: QuickSQLiteConnection,
) => Promise<Record<string, number>> = async (db) => {
  const result: Record<string, number> = {}
  const query = `
    SELECT relay_url, COUNT(*) as count FROM nostros_notes_relays 
    LEFT JOIN
      nostros_users ON nostros_users.id = nostros_notes_relays.pubkey
    WHERE nostros_users.contact > 0
    GROUP BY relay_url
  `
  const resultSet = db.execute(query)
  if (resultSet?.rows?.length) {
    for (let index = 0; index < resultSet?.rows?.length; index++) {
      const row = resultSet?.rows?.item(index)
      result[row.relay_url] = row.count
    }
  }
  return result
}

export const getNoteRelaysPresence: (
  db: QuickSQLiteConnection,
) => Promise<Record<string, string[]>> = async (db) => {
  const result: Record<string, string[]> = {}
  const query = `
    SELECT relay_url, pubkey FROM nostros_notes_relays 
    LEFT JOIN
      nostros_users ON nostros_users.id = nostros_notes_relays.pubkey
    WHERE nostros_users.contact > 0
    GROUP BY relay_url, pubkey
    ORDER BY random()
  `
  const resultSet = db.execute(query)
  if (resultSet?.rows?.length) {
    for (let index = 0; index < resultSet?.rows?.length; index++) {
      const row = resultSet?.rows?.item(index)
      result[row.relay_url] = [...(result[row.relay_url] ?? []), row.pubkey]
    }
  }
  return result
}
