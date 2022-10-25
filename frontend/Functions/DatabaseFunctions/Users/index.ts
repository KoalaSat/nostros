import { SQLiteDatabase } from 'react-native-sqlite-storage';
import { getItems } from '..';
import { Event, EventKind, verifySignature } from '../../../lib/nostr/Events';
import { errorCallback } from '../Errors';

export interface User {
  id: string;
  main_relay?: string;
  name?: string;
  picture?: string;
  about?: string;
  contact?: boolean;
}

const databaseToEntity: (object: object) => User = (object) => {
  return object as User;
};

export const tagToUser: (tag: string[]) => User = (tag) => {
  return {
    id: tag[1],
    main_relay: tag[2],
    name: tag[3],
  };
};

export const insertUserMeta: (event: Event, db: SQLiteDatabase) => Promise<void> = async (
  event,
  db,
) => {
  return await new Promise<void>((resolve, reject) => {
    if (!verifySignature(event)) return reject(new Error('Bad signature'));
    if (event.kind !== EventKind.meta) return reject(new Error('Bad Kind'));

    const user: User = JSON.parse(event.content);
    user.id = event.pubkey;
    getUser(user.id, db).then((userDb) => {
      let userQuery = '';
      const id = user.id?.replace("\\'", "'") ?? '';
      const name = user.name?.replace("\\'", "'") ?? '';
      const mainRelay = user.main_relay?.replace("\\'", "'") ?? '';
      const about = user.about?.replace("\\'", "'") ?? '';
      const picture = user.picture?.replace("\\'", "'") ?? '';

      if (userDb) {
        userQuery = `
          UPDATE nostros_users  
          SET name = '${name.split("'").join("''")}',
          main_relay = '${mainRelay.split("'").join("''")}',
          about = '${about.split("'").join("''")}',
          picture = '${picture.split("'").join("''")}'
          WHERE id = '${user.id}';
        `;
      } else {
        userQuery = `
          INSERT INTO nostros_users 
          (id, name, picture, about, main_relay) 
          VALUES 
          ('${id}', '${name.split("'").join("''")}', '${picture.split("'").join("''")}', '${about
          .split("'")
          .join("''")}', '');
        `;
      }
      db.transaction((transaction) => {
        transaction.executeSql(userQuery, [], () => resolve(), errorCallback(userQuery, reject));
      });
    });
  });
};

export const insertUserContact: (event: Event, db: SQLiteDatabase) => Promise<void> = async (
  event,
  db,
) => {
  return await new Promise<void>((resolve, reject) => {
    if (!verifySignature(event)) return reject(new Error('Bad signature'));
    if (event.kind !== EventKind.petNames) return reject(new Error('Bad Kind'));
    const userTags: string[] = event.tags.map((tag) => tagToUser(tag).id);
    userTags.forEach((userId) => {
      addContact(userId, db);
    });
    resolve();
  });
};

export const getUser: (pubkey: string, db: SQLiteDatabase) => Promise<User | null> = async (
  pubkey,
  db,
) => {
  const userQuery = `SELECT * FROM nostros_users WHERE id = '${pubkey}';`;
  return await new Promise<User | null>((resolve, reject) => {
    db.readTransaction((transaction) => {
      transaction.executeSql(
        userQuery,
        [],
        (_transaction, resultSet) => {
          if (resultSet.rows.length > 0) {
            const items: object[] = getItems(resultSet);
            const user: User = databaseToEntity(items[0]);
            resolve(user);
          } else {
            resolve(null);
          }
        },
        errorCallback(userQuery, reject),
      );
    });
  });
};

export const removeContact: (pubkey: string, db: SQLiteDatabase) => Promise<void> = async (
  pubkey,
  db,
) => {
  const userQuery = `UPDATE nostros_users SET contact = FALSE WHERE id = '${pubkey}'`;
  return await new Promise<void>((resolve, reject) => {
    db.transaction((transaction) => {
      transaction.executeSql(userQuery, [], () => resolve(), errorCallback(userQuery, reject));
    });
  });
};

export const addContact: (pubkey: string, db: SQLiteDatabase) => Promise<void> = async (
  pubkey,
  db,
) => {
  return await new Promise<void>((resolve, reject) => {
    getUser(pubkey, db).then((userDb) => {
      let userQuery = '';
      if (userDb) {
        userQuery = `
          UPDATE nostros_users SET contact = TRUE WHERE id = '${pubkey}';
        `;
      } else {
        userQuery = `
          INSERT INTO nostros_users (id, contact) VALUES ('${pubkey}', TRUE);
        `;
      }
      db.transaction((transaction) => {
        transaction.executeSql(userQuery, [], () => resolve(), errorCallback(userQuery, reject));
      });
    });
  });
};

export const getUsers: (
  db: SQLiteDatabase,
  options: { exludeIds?: string[]; contacts?: boolean },
) => Promise<User[]> = async (db, { exludeIds, contacts }) => {
  let userQuery = `SELECT * FROM nostros_users `;

  if (contacts) {
    userQuery += `WHERE contact = TRUE `;
  }

  if (exludeIds && exludeIds.length > 0) {
    if (!contacts) {
      userQuery += `WHERE `;
    } else {
      userQuery += `AND `;
    }
    userQuery += `id NOT IN ('${exludeIds.join("', '")}') `;
  }

  userQuery += `ORDER BY name,id`;

  return await new Promise<User[]>((resolve, reject) => {
    db.readTransaction((transaction) => {
      transaction.executeSql(
        userQuery,
        [],
        (_transaction, resultSet) => {
          if (resultSet.rows.length > 0) {
            const items: object[] = getItems(resultSet);
            const users: User[] = items.map((object) => databaseToEntity(object));
            resolve(users);
          } else {
            resolve([]);
          }
        },
        errorCallback(userQuery, reject),
      );
    });
  });
};
