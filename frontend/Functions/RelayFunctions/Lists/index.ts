import getUnixTime from 'date-fns/getUnixTime'
import { QuickSQLiteConnection } from 'react-native-quick-sqlite'
import RelayPool from '../../../lib/nostr/RelayPool/intex'
import { Event } from '../../../lib/nostr/Events'
import { getList } from '../../DatabaseFunctions/Lists'
import { getETags } from '../Events'

export const updateBookmarkList: (
  relayPool: RelayPool,
  database: QuickSQLiteConnection,
  publicKey: string,
  eventId: string,
  remove?: boolean,
) => void = async (relayPool, database, publicKey, eventId, remove) => {
  if (!eventId || eventId === '') return

  const result = await getList(database, 10001, publicKey)
  let bookmarks = remove ? [] : [['e', eventId]]
  if (result) {
    let eTags = getETags(result)
    if (remove) eTags = eTags.filter((tag) => tag[1] !== eventId)
    bookmarks = [...bookmarks, ...eTags]
  }

  const event: Event = {
    content: '',
    created_at: getUnixTime(new Date()),
    kind: 10001,
    pubkey: publicKey,
    tags: bookmarks,
  }
  relayPool?.sendEvent(event)
}
