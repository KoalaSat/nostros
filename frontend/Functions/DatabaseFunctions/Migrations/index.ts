import { QuickSQLiteConnection } from 'react-native-quick-sqlite'
import { simpleExecute } from '..'

export const createInitDatabase: (db: QuickSQLiteConnection) => Promise<void> = async (db) => {
  await simpleExecute(
    `
        CREATE TABLE IF NOT EXISTS nostros_notes(
          id TEXT PRIMARY KEY NOT NULL, 
          content TEXT NOT NULL,
          created_at INT NOT NULL,
          kind INT NOT NULL,
          pubkey TEXT NOT NULL,
          sig TEXT NOT NULL,
          tags TEXT NOT NULL,
          main_event_id TEXT,
          reply_event_id TEXT
        );
      `,
    db,
  )
  await simpleExecute(
    `
      CREATE TABLE IF NOT EXISTS nostros_users(
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT,
        picture TEXT,
        about TEXT,
        main_relay TEXT,
        contact BOOLEAN DEFAULT FALSE
      );
    `,
    db,
  )
  await simpleExecute(
    `
        CREATE TABLE IF NOT EXISTS nostros_relays(
          url TEXT PRIMARY KEY NOT NULL,
          pet INTEGER
        );
      `,
    db,
  )
}
