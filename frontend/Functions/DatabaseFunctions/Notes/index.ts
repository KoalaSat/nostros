import { SQLiteDatabase } from 'react-native-sqlite-storage';
import { getItems } from '..';
import { Event, EventKind, verifySignature } from '../../../lib/nostr/Events';
import { getMainEventId, getReplyEventId } from '../../RelayFunctions/Events';
import { errorCallback } from '../Errors';

export interface Note extends Event {
  name: string;
  picture: string;
}

const databaseToEntity: (object: any) => Note = (object) => {
  object.tags = JSON.parse(object.tags);
  return object as Note;
};

export const insertNote: (event: Event, db: SQLiteDatabase) => Promise<void> = async (
  event,
  db,
) => {
  return await new Promise<void>((resolve, reject) => {
    if (!verifySignature(event) || !event.id) return reject(new Error('Bad event'));
    if (![EventKind.textNote, EventKind.recommendServer].includes(event.kind))
      return reject(new Error('Bad Kind'));

    getNotes(db, { filters: { id: event.id } }).then((notes) => {
      if (notes.length === 0 && event.id && event.sig) {
        const mainEventId = getMainEventId(event) ?? '';
        const replyEventId = getReplyEventId(event) ?? '';
        const content = event.content.split("'").join("''");
        const tags = JSON.stringify(event.tags).split("'").join("''");
        const eventQuery = `INSERT INTO nostros_notes
          (id,content,created_at,kind,pubkey,sig,tags,main_event_id,reply_event_id)
          VALUES 
          (
            '${event.id}',
            '${content}',
            ${event.created_at},
            ${event.kind},
            '${event.pubkey}',
            '${event.sig}',
            '${tags}',
            '${mainEventId}',
            '${replyEventId}'
          );`;
        db.transaction((transaction) => {
          transaction.executeSql(
            eventQuery,
            [],
            () => resolve(),
            errorCallback(eventQuery, reject),
          );
        });
      } else {
        reject(new Error('Note already exists'));
      }
    });
  });
};

export const getNotes: (
  db: SQLiteDatabase,
  options: {
    filters?: { [column: string]: string };
    limit?: number;
    contacts?: boolean;
  },
) => Promise<Note[]> = async (db, { filters = {}, limit, contacts }) => {
  let notesQuery = `
    SELECT nostros_notes.*, nostros_users.name, nostros_users.picture, nostros_users.contact FROM nostros_notes 
    LEFT JOIN nostros_users ON nostros_users.id = nostros_notes.pubkey
  `;

  if (filters) {
    const keys = Object.keys(filters);
    if (Object.keys(filters).length > 0) {
      notesQuery += 'WHERE ';
      keys.forEach((column, index) => {
        notesQuery += `nostros_notes.${column} = '${filters[column]}' `;
        if (index < keys.length - 1) notesQuery += 'AND ';
      });
    }
  }
  if (contacts) {
    if (Object.keys(filters).length > 0) {
      notesQuery += 'AND nostros_users.contact = TRUE ';
    } else {
      notesQuery += 'WHERE nostros_users.contact = TRUE ';
    }
  }
  notesQuery += 'ORDER BY nostros_notes.created_at DESC ';
  if (limit) {
    notesQuery += `LIMIT ${limit}`;
  }
  return await new Promise<Note[]>((resolve, reject) => {
    db.readTransaction((transaction) => {
      transaction.executeSql(
        notesQuery,
        [],
        (_transaction, resultSet) => {
          const items: object[] = getItems(resultSet);
          const notes: Note[] = items.map((object) => databaseToEntity(object));
          resolve(notes);
        },
        errorCallback(notesQuery, reject),
      );
    });
  });
};
