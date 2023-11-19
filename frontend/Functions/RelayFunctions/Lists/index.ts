import getUnixTime from 'date-fns/getUnixTime'
import { type QuickSQLiteConnection } from 'react-native-quick-sqlite'
import { type Event } from '../../../lib/nostr/Events'
import { getList } from '../../DatabaseFunctions/Lists'
import { decrypt, encrypt } from '../../../lib/nostr/Nip04'

export const addBookmarkList: (
  sendEvent: (event: Event, relayUrl?: string) => Promise<Event | null | undefined>,
  database: QuickSQLiteConnection,
  privateKey: string,
  publicKey: string,
  eventId: string,
  publicBookmark: boolean,
) => void = async (sendEvent, database, privateKey, publicKey, eventId, publicBookmark) => {
  if (!eventId || eventId === '') return

  const result = await getList(database, 10003, publicKey)
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
    kind: 10003,
    pubkey: publicKey,
    tags,
  }
  sendEvent(event)
}

export const addMutedUsersList: (
  sendEvent: (event: Event, relayUrl?: string) => Promise<Event | null | undefined>,
  database: QuickSQLiteConnection,
  publicKey: string,
  userId: string,
) => void = async (sendEvent, database, publicKey, userId) => {
  if (!userId || userId === '') return

  const result = await getList(database, 10000, publicKey)
  let tags: string[][] = result?.tags ?? []
  const content: string = result?.content ?? ''
  tags = [...tags, ['e', userId]]

  const event: Event = {
    content,
    created_at: getUnixTime(new Date()),
    kind: 10000,
    pubkey: publicKey,
    tags,
  }
  sendEvent(event)
}

export const addList: (
  sendEvent: (event: Event, relayUrl?: string) => Promise<Event | null | undefined>,
  database: QuickSQLiteConnection,
  publicKey: string,
  eventId: string,
  tag: string,
) => void = async (sendEvent, database, publicKey, eventId, tag) => {
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
  sendEvent(event)
}

export const removeBookmarkList: (
  sendEvent: (event: Event, relayUrl?: string) => Promise<Event | null | undefined>,
  database: QuickSQLiteConnection,
  privateKey: string,
  publicKey: string,
  eventId: string,
) => void = async (sendEvent, database, privateKey, publicKey, eventId) => {
  if (!eventId || eventId === '') return

  const result = await getList(database, 10003, publicKey)
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
      kind: 10003,
      pubkey: publicKey,
      tags,
    }
    sendEvent(event)
  }
}

export const removeMutedUsersList: (
  sendEvent: (event: Event, relayUrl?: string) => Promise<Event | null | undefined>,
  database: QuickSQLiteConnection,
  publicKey: string,
  userId: string,
) => void = async (sendEvent, database, publicKey, userId) => {
  if (!userId || userId === '') return

  const result = await getList(database, 10000, publicKey)

  const content: string = result?.content ?? ''
  const tags = result?.tags.filter((tag) => tag[1] !== userId) ?? []
  const event: Event = {
    content,
    created_at: getUnixTime(new Date()),
    kind: 10000,
    pubkey: publicKey,
    tags,
  }
  sendEvent(event)
}

export const removeList: (
  sendEvent: (event: Event, relayUrl?: string) => Promise<Event | null | undefined>,
  database: QuickSQLiteConnection,
  publicKey: string,
  eventId: string,
  tag: string,
) => void = async (sendEvent, database, publicKey, eventId, tag) => {
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
    sendEvent(event)
  }
}
