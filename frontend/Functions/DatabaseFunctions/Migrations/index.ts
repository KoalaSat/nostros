import { ColumnMetadata, QuickSQLiteConnection } from 'react-native-quick-sqlite'
import { dropTables, simpleExecute } from '..'

export const createInitDatabase: (db: QuickSQLiteConnection) => Promise<void> = async (db) => {
  dropTables(db)
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
  await runMigrations(db)
}

export const runMigrations: (db: QuickSQLiteConnection) => Promise<void> = async (db) => {
  const { metadata } = db.execute('SELECT * FROM nostros_users;')
  // v0.1.8.1-alpha
  if (!metadata?.some((meta: ColumnMetadata) => meta.columnName === 'follower')) {
    await simpleExecute('ALTER TABLE nostros_users ADD COLUMN follower BOOLEAN DEFAULT FALSE;', db)
  }
  // v0.1.9.1-alpha
  await simpleExecute(
    `
        CREATE TABLE IF NOT EXISTS nostros_direct_messages(
          id TEXT PRIMARY KEY NOT NULL, 
          content TEXT NOT NULL,
          created_at INT NOT NULL,
          kind INT NOT NULL,
          pubkey TEXT NOT NULL,
          sig TEXT NOT NULL,
          tags TEXT NOT NULL,
          conversation_id TEXT NOT NULL,
          read BOOLEAN DEFAULT FALSE
        );
      `,
    db,
  )
}
