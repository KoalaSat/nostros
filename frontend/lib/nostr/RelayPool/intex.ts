// import { spawnThread } from 'react-native-multithreading'
import { signEvent, validateEvent, Event } from '../Events'
import RelayPoolModule from '../../Native/WebsocketModule'
import { QuickSQLiteConnection } from 'react-native-quick-sqlite'
import { median, randomInt } from '../../../Functions/NativeFunctions'
import {
  activateResilientRelays,
  createResilientRelay,
  desactivateResilientRelays,
} from '../../../Functions/DatabaseFunctions/Relays'
import { getNoteRelaysPresence } from '../../../Functions/DatabaseFunctions/NotesRelays'

export interface RelayFilters {
  ids?: string[]
  authors?: string[]
  kinds?: number[]
  '#e'?: string[]
  '#p'?: string[]
  since?: number
  limit?: number
  until?: number
}

export interface RelayMessage {
  data: string
}

export interface ResilientAssignation {
  resilientRelays: Record<string, string[]>
  smallRelays: Record<string, string[]>
  centralizedRelays: Record<string, string[]>
}

export const fallbackRelays = [
  'wss://brb.io',
  'wss://damus.io',
  'wss://nostr-pub.wellorder.net',
  'wss://nostr.swiss-enigma.ch',
  'wss://nostr.onsats.org',
  'wss://nostr-pub.semisol.dev',
  'wss://nostr.openchain.fr',
  'wss://relay.nostr.info',
  'wss://nostr.oxtr.dev',
  'wss://nostr.ono.re',
  'wss://relay.grunch.dev',
  'wss://nostr.developer.li',
]

class RelayPool {
  constructor(privateKey?: string) {
    this.privateKey = privateKey
    this.subscriptions = {}
    this.resilientAssignation = {
      resilientRelays: {},
      smallRelays: {},
      centralizedRelays: {},
      fallback: {},
    }
  }

  private readonly privateKey?: string
  private subscriptions: Record<string, string[]>
  public resilientAssignation: ResilientAssignation

  private readonly send: (message: object, globalFeed?: boolean) => void = async (
    message,
    globalFeed,
  ) => {
    const tosend = JSON.stringify(message)
    RelayPoolModule.send(tosend, globalFeed ?? false)
  }

  public readonly connect: (publicKey: string, onEventId: (eventId: string) => void) => void =
    async (publicKey, onEventId) => {
      RelayPoolModule.connect(publicKey, onEventId)
    }

  public readonly resilientMode: (db: QuickSQLiteConnection, publicKey: string) => void = async (
    db,
  ) => {
    await desactivateResilientRelays(db)
    // Get relays with contacts' pubkeys with at least one event found, randomly sorted
    const relaysPresence: Record<string, string[]> = await getNoteRelaysPresence(db)
    // Median of users per relay
    const medianUsage = median(
      Object.keys(relaysPresence).map((relay) => relaysPresence[relay].length),
    )

    // Sort relays by abs distance from the mediam
    const relaysByPresence = Object.keys(relaysPresence).sort((n1: string, n2: string) => {
      return (
        Math.abs(relaysPresence[n1].length - medianUsage) -
        Math.abs(relaysPresence[n2].length - medianUsage)
      )
    })
    //  Get top5 relays closer to the mediam
    const medianRelays = relaysByPresence.slice(0, 5)

    //  Set helpers
    let biggestRelayLenght = 0
    this.resilientAssignation.resilientRelays = {}
    const allocatedUsers: string[] = []
    medianRelays.forEach((relayUrl) => {
      this.resilientAssignation.resilientRelays[relayUrl] = []
      const length = relaysPresence[relayUrl].length
      if (length > biggestRelayLenght) biggestRelayLenght = length
    })

    // Iterate over the N index of top5 relay list removing identical pubkey from others
    for (let index = 0; index < biggestRelayLenght - 1; index++) {
      medianRelays.forEach((relayUrl) => {
        const pubKey = relaysPresence[relayUrl][index]
        if (pubKey && !allocatedUsers.includes(pubKey)) {
          allocatedUsers.push(pubKey)
          this.resilientAssignation.resilientRelays[relayUrl].push(pubKey)
        }
      })
    }

    // Iterate over remaining relays and assigns as much remaining users as possible
    relaysByPresence.slice(5, relaysByPresence.length).forEach((relayUrl) => {
      relaysPresence[relayUrl].forEach((pubKey) => {
        if (!allocatedUsers.includes(pubKey)) {
          allocatedUsers.push(pubKey)
          if (relaysPresence[relayUrl].length > medianUsage) {
            if (!this.resilientAssignation.centralizedRelays[relayUrl])
              this.resilientAssignation.centralizedRelays[relayUrl] = []
            this.resilientAssignation.centralizedRelays[relayUrl].push(pubKey)
          } else {
            if (!this.resilientAssignation.smallRelays[relayUrl])
              this.resilientAssignation.smallRelays[relayUrl] = []
            this.resilientAssignation.smallRelays[relayUrl].push(pubKey)
          }
        }
      })
    })

    // Target list size is 5, adds random relays from a fallback list
    const resilientUrls = [
      ...Object.keys(this.resilientAssignation.resilientRelays),
      ...Object.keys(this.resilientAssignation.centralizedRelays),
      ...Object.keys(this.resilientAssignation.smallRelays),
    ]
    while (resilientUrls.length < 5) {
      let fallbackRelay = ''
      while (fallbackRelay === '') {
        const randomRelayIndex = randomInt(0, fallbackRelays.length - 1)
        if (!resilientUrls.includes(fallbackRelays[randomRelayIndex])) {
          fallbackRelay = fallbackRelays[randomRelayIndex]
        }
      }
      resilientUrls.push(fallbackRelay)
      this.resilientAssignation.centralizedRelays[fallbackRelay] = []
    }

    // Stores in DB
    resilientUrls.forEach(async (relayUrl) => await createResilientRelay(db, relayUrl))
    activateResilientRelays(db, resilientUrls)
  }

  public readonly add: (relayUrl: string, callback?: () => void) => void = async (
    relayUrl,
    callback = () => {},
  ) => {
    RelayPoolModule.add(relayUrl, callback)
  }

  public readonly remove: (relayUrl: string, callback?: () => void) => void = async (
    relayUrl,
    callback = () => {},
  ) => {
    RelayPoolModule.remove(relayUrl, callback)
  }

  public readonly update: (
    relayUrl: string,
    active: number,
    globalfeed: number,
    callback?: () => void,
  ) => void = async (relayUrl, active, globalfeed, callback = () => {}) => {
    RelayPoolModule.update(relayUrl, active, globalfeed, callback)
  }

  public readonly sendEvent: (event: Event) => Promise<Event | null> = async (event) => {
    if (this.privateKey) {
      const signedEvent: Event = await signEvent(event, this.privateKey)

      if (validateEvent(signedEvent)) {
        this.send(['EVENT', event])

        return signedEvent
      } else {
        console.log('Not valid event', event)
        return null
      }
    } else {
      return null
    }
  }

  public readonly subscribe: (subId: string, filters?: RelayFilters[]) => void = async (
    subId,
    filters,
  ) => {
    const id = `${subId}${JSON.stringify(filters)}`
    if (this.subscriptions[subId]?.includes(id)) {
      console.log('Subscription already done!', subId)
    } else {
      this.send([...['REQ', subId], ...(filters ?? [])], subId.includes('-global-'))
      const newSubscriptions = [...(this.subscriptions[subId] ?? []), id]
      this.subscriptions[subId] = newSubscriptions
    }
  }

  public readonly unsubscribe: (subIds: string[]) => void = async (subIds) => {
    subIds.forEach((subId: string) => {
      this.send(['CLOSE', subId])
      delete this.subscriptions[subId]
    })
  }

  public readonly unsubscribeAll: () => void = async () => {
    this.unsubscribe(Object.keys(this.subscriptions))
    this.subscriptions = {}
  }
}

export default RelayPool
