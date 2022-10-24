import { SQLiteDatabase } from 'react-native-sqlite-storage';
import { getItems } from '..';
import { errorCallback } from '../Errors';

export interface Relay {
  url: string;
  name?: string;
}

const databaseToEntity: (object: any) => Relay = (object) => {
  return object as Relay;
};

export const storeRelay: (relay: Relay, db: SQLiteDatabase) => void = async (relay, db) => {
  if (relay.url) {
    const relays: Relay[] = await searchRelays(relay.url, db);
    if (relays.length === 0) {
      const eventQuery = `
        INSERT INTO nostros_relays
        (url) 
        VALUES 
        (
          '${relay.url.split("'").join("''")}'
        );
      `;

      await new Promise<void>((resolve, reject) => {
        db.transaction((transaction) => {
          transaction.executeSql(
            eventQuery,
            [],
            () => resolve(),
            errorCallback(eventQuery, reject),
          );
        });
      });
    }
  }
};

export const searchRelays: (relayUrl: string, db: SQLiteDatabase) => Promise<Relay[]> = async (
  relayUrl,
  db,
) => {
  const searchQuery = `
    SELECT * FROM nostros_relays WHERE url = '${relayUrl}';   
  `;

  return await new Promise<Relay[]>((resolve, reject) => {
    db.transaction((transaction) => {
      transaction.executeSql(
        searchQuery,
        [],
        (_transaction, resultSet) => {
          const items: object[] = getItems(resultSet);
          const notes: Relay[] = items.map((object) => databaseToEntity(object));
          resolve(notes);
        },
        errorCallback(searchQuery, reject),
      );
    });
  });
};

export const getRelays: (db: SQLiteDatabase) => Promise<Relay[]> = async (db) => {
  const notesQuery = `SELECT * FROM nostros_relays;`;

  return await new Promise<Relay[]>((resolve, reject) => {
    db.readTransaction((transaction) => {
      transaction.executeSql(
        notesQuery,
        [],
        (_transaction, resultSet) => {
          const items: object[] = getItems(resultSet);
          const relays: Relay[] = items.map((object) => databaseToEntity(object));
          resolve(relays);
        },
        errorCallback(notesQuery, reject),
      );
    });
  });
};
