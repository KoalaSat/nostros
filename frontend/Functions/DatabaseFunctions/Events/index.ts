import { SQLiteDatabase } from 'react-native-sqlite-storage';
import { Event, EventKind } from '../../../lib/nostr/Events';
import { insertNote } from '../Notes';
import { insertUserMeta } from '../Users';

export const storeEvent: (event: Event, db: SQLiteDatabase) => Promise<void> = async (
  event,
  db,
) => {
  return await new Promise<void>((resolve, reject) => {
    try {
      if (event.kind === EventKind.meta) {
        insertUserMeta(event, db).then(resolve);
      } else if (event.kind === EventKind.textNote || event.kind === EventKind.recommendServer) {
        insertNote(event, db).then(resolve);
      }
    } catch (e) {
      reject(e);
    }
  });
};
