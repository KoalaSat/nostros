import moment from 'moment'
import { QuickSQLiteConnection } from 'react-native-quick-sqlite'
import RelayPool from '../../../lib/nostr/RelayPool/intex'
import { getUser, getUsers, User } from '../../DatabaseFunctions/Users'
import { Event } from '../../../lib/nostr/Events'
import { getNpub } from '../../../lib/nostr/Nip19'

export const usersToTags: (users: User[]) => string[][] = (users) => {
  return users.map((user): string[] => {
    return ['p', user.id, user.main_relay ?? '', user.name ?? '']
  })
}

export const tagToUser: (tag: string[]) => User = (tag) => {
  return {
    id: tag[1],
    main_relay: tag[2],
    name: tag[3],
  }
}

export const username: (user: User) => string = (user) => {
  return user.name && user.name !== '' ? user.name : formatPubKey(getNpub(user.id))
}

export const usernamePubKey: (name: string, pubKey: string) => string = (name, pubKey) => {
  return name && name !== '' ? name : formatPubKey(pubKey)
}

export const formatPubKey: (pubKey: string) => string = (pubKey) => {
  if (!pubKey) return ''

  return `${pubKey.slice(0, 6)}...${pubKey.slice(-6)}`
}

export const populatePets: (
  relayPool: RelayPool,
  database: QuickSQLiteConnection,
  publicKey: string,
) => void = async (relayPool, database, publicKey) => {
  const results = await getUsers(database, { exludeIds: [publicKey], contacts: true })
  if (results) {
    const event: Event = {
      content: '',
      created_at: moment().unix(),
      kind: 3,
      pubkey: publicKey,
      tags: usersToTags(results),
    }
    relayPool?.sendEvent(event)
  }
}

export const populateProfile: (
  relayPool: RelayPool,
  database: QuickSQLiteConnection,
  publicKey: string,
) => void = async (relayPool, database, publicKey) => {
  const result = await getUser(publicKey, database)
  if (result) {
    const profile = {
      name: result.name,
      main_relay: result.main_relay,
      picture: result.picture,
      about: result.about,
    }
    const event: Event = {
      content: JSON.stringify(profile),
      created_at: moment().unix(),
      kind: 0,
      pubkey: publicKey,
      tags: usersToTags([result]),
    }
    relayPool?.sendEvent(event)
  }
}
