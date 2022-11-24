import {
  open,
  QuickSQLiteConnection,
  BatchQueryResult,
  QueryResult,
} from 'react-native-quick-sqlite'

export const initDatabase: () => QuickSQLiteConnection = () => {
  return open({ name: 'nostros.sqlite' })
}

export const getItems: (resultSet: QueryResult) => object[] = (resultSet) => {
  const result: object[] = []

  if (resultSet.rows) {
    for (let i = 0; i < resultSet.rows.length; i++) {
      result.push(resultSet.rows.item(i))
    }
  }

  return result
}

export const simpleExecute: (
  query: string,
  db: QuickSQLiteConnection,
) => Promise<QueryResult> = async (query, db) => {
  return db.execute(query)
}

export const dropTables: (db: QuickSQLiteConnection) => Promise<BatchQueryResult> = async (db) => {
  const dropQueries: Array<[string, [any[] | any[][]]]> = [
    ['DROP TABLE IF EXISTS nostros_notes;', [[]]],
    ['DROP TABLE IF EXISTS nostros_users;', [[]]],
    ['DROP TABLE IF EXISTS nostros_relays;', [[]]],
    ['DROP TABLE IF EXISTS nostros_direct_messages;', [[]]],
  ]
  return db.executeBatch(dropQueries)
}
