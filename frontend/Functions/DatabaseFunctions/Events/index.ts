import { QuickSQLiteConnection } from 'react-native-quick-sqlite'
import { Event, EventKind } from '../../../lib/nostr/Events'
import { insertNote } from '../Notes'
import { insertUserMeta } from '../Users'

export const storeEvent: (event: Event, db: QuickSQLiteConnection) => Promise<void> = async (
  event,
  db,
) => {
  if (event.kind === EventKind.meta) {
    await insertUserMeta(event, db)
  } else if (event.kind === EventKind.textNote || event.kind === EventKind.recommendServer) {
    await insertNote(event, db)
  }
}
