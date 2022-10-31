import SQLite, { ResultSet, SQLiteDatabase, Transaction } from 'react-native-sqlite-storage'
import { errorCallback } from './Errors'

export const initDatabase: () => SQLiteDatabase = () => {
  return SQLite.openDatabase(
    { name: 'nostros.db', location: 'default' },
    () => {},
    () => {}
  )
}

export const getItems: (resultSet: ResultSet) => object[] = (resultSet) => {
  const result: object[] = []

  for (let i = 0; i < resultSet.rows.length; i++) {
    result.push(resultSet.rows.item(i))
  }

  return result
}

export const simpleExecute: (query: string, db: SQLiteDatabase) => Promise<Transaction> = async (
  query,
  db
) => {
  return await db.transaction((transaction) => {
    transaction.executeSql(query, [], () => {}, errorCallback(query))
  })
}

export const dropTables: (db: SQLiteDatabase) => Promise<Transaction> = async (db) => {
  const dropQueries = [
    'DROP TABLE IF EXISTS nostros_notes;',
    'DROP TABLE IF EXISTS nostros_users;',
    'DROP TABLE IF EXISTS nostros_relays;'
  ]
  return await db.transaction((transaction) => {
    dropQueries.forEach((query) => {
      transaction.executeSql(query, [], () => {}, errorCallback(query))
    })
  })
}
