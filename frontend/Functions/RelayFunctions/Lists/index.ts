import getUnixTime from 'date-fns/getUnixTime'
import { QuickSQLiteConnection } from 'react-native-quick-sqlite'
import RelayPool from '../../../lib/nostr/RelayPool/intex'
import { Event } from '../../../lib/nostr/Events'
import { getList } from '../../DatabaseFunctions/Lists'
import { decrypt, encrypt } from '../../../lib/nostr/Nip04'

export const addBookmarkList: (
  relayPool: RelayPool,
  database: QuickSQLiteConnection,
  privateKey: string,
  publicKey: string,
  eventId: string,
  publicBookmark: boolean,
) => void = async (relayPool, database, privateKey, publicKey, eventId, publicBookmark) => {
  if (!eventId || eventId === '') return

  const result = await getList(database, 10001, publicKey)
  let tags: string[][] = result?.tags ?? []
  let content: string = result?.content ?? ''
  if (publicBookmark) {
    tags = [...tags, ['e', eventId]]
  } else {
    let decryptedContent: string[][] = []
    if (content !== '') {
      content = decrypt(privateKey, publicKey, result.content ?? '')
      decryptedContent = JSON.parse(content) ?? []
      decryptedContent.push(['e', eventId])
    } else {
      decryptedContent = [['e', eventId]]
    }
    content = await encrypt(privateKey, publicKey, JSON.stringify(decryptedContent))
  }

  const event: Event = {
    content,
    created_at: getUnixTime(new Date()),
    kind: 10001,
    pubkey: publicKey,
    tags,
  }
  relayPool?.sendEvent(event)
}
export const addList: (
  relayPool: RelayPool,
  database: QuickSQLiteConnection,
  publicKey: string,
  eventId: string,
  tag: string,
) => void = async (relayPool, database, publicKey, eventId, tag) => {
  if (!eventId || eventId === '') return

  const result = await getList(database, 30001, publicKey, tag)
  let tags: string[][] = result?.tags ?? [['d', tag]]
  const content: string = result?.content ?? ''
  tags = [...tags, ['e', eventId]]

  const event: Event = {
    content,
    created_at: getUnixTime(new Date()),
    kind: 30001,
    pubkey: publicKey,
    tags,
  }
  relayPool?.sendEvent(event)
}

export const removeBookmarkList: (
  relayPool: RelayPool,
  database: QuickSQLiteConnection,
  privateKey: string,
  publicKey: string,
  eventId: string,
) => void = async (relayPool, database, privateKey, publicKey, eventId) => {
  if (!eventId || eventId === '') return

  const result = await getList(database, 10001, publicKey)
  if (result) {
    let content: string = result?.content ?? ''
    const tags = result.tags.filter((tag) => tag[1] !== eventId)
    if (content !== '') {
      content = decrypt(privateKey, publicKey, result.content)
      let decryptedContent: string[][] = JSON.parse(content) ?? []
      decryptedContent = decryptedContent.filter((tag) => tag[1] !== eventId)
      content = await encrypt(privateKey, publicKey, JSON.stringify(decryptedContent))
    }
    const event: Event = {
      content,
      created_at: getUnixTime(new Date()),
      kind: 10001,
      pubkey: publicKey,
      tags,
    }
    relayPool?.sendEvent(event)
  }
}

export const removeList: (
  relayPool: RelayPool,
  database: QuickSQLiteConnection,
  publicKey: string,
  eventId: string,
  tag: string,
) => void = async (relayPool, database, publicKey, eventId, tag) => {
  if (!eventId || eventId === '') return

  const result = await getList(database, 30001, publicKey, tag)
  if (result) {
    const content: string = result?.content ?? ''
    const tags = result.tags.filter((tag) => tag[1] !== eventId)
    const event: Event = {
      content,
      created_at: getUnixTime(new Date()),
      kind: 30001,
      pubkey: publicKey,
      tags,
    }
    relayPool?.sendEvent(event)
  }
}
