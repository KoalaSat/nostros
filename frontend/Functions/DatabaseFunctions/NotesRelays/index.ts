import { QuickSQLiteConnection } from 'react-native-quick-sqlite'

export interface NoteRelay {
  relay_url: string
  pubkey: string
  note_id: number
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
