// import { spawnThread } from 'react-native-multithreading'
import { signEvent, validateEvent, Event } from '../Events'
import RelayPoolModule from '../../Native/WebsocketModule'
import { QuickSQLiteConnection } from 'react-native-quick-sqlite'
import { median, randomInt } from '../../../Functions/NativeFunctions'
import { getNoteRelaysPresence } from '../../../Functions/DatabaseFunctions/NotesRelays'
import DatabaseModule from '../../Native/DatabaseModule'

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
  fallback: Record<string, string[]>
}

export const fallbackRelays = [
  'wss://brb.io',
  'wss://nostr-pub.wellorder.net',
  'wss://nostr.developer.li',
  'wss://nostr.oxtr.dev',
  'wss://nostr.swiss-enigma.ch',
  'wss://relay.nostr.snblago.com',
  'wss://nos.lol',
  'wss://relay.austrich.net',
  'wss://nostr.cro.social',
  'wss://relay.koreus.social',
  'wss://spore.ws',
  'wss://nostr.web3infra.xyz',
  'wss://nostr.snblago.com',
  'wss://relay.nostrified.org',
  'wss://relay.ryzizub.com',
  'wss://relay.wellorder.net',
  'wss://nostr.btcmp.com',
  'wss://relay.nostromo.social',
  'wss://nostr.massmux.com',
  'wss://nostr.robotesc.ro',
  'wss://relay.humanumest.social',
  'wss://relay-local.cowdle.gg',
  'wss://nostr-2.afarazit.eu',
  'wss://nostr.data.haus',
  'wss://nostr-pub.wellorder.net',
  'wss://nostr.thank.eu',
  'wss://relay-dev.cowdle.gg',
  'wss://nostrsxz4lbwe-nostr.functions.fnc.fr-par.scw.cloud',
  'wss://relay.nostrcheck.me',
  'wss://relay.nostrich.de',
  'wss://nostr.com.de',
  'wss://relay.nostr.scot',
  'wss://nostr.8e23.net',
  'wss://nostr.mouton.dev',
  'wss://nostr.l00p.org',
  'wss://nostr.island.network',
  'wss://nostr.handyjunky.com',
  'wss://relay.valera.co',
  'wss://relay.nostr.vet',
  'wss://tmp-relay.cesc.trade',
  'wss://relay.dwadziesciajeden.pl',
  'wss://nostr-1.afarazit.eu',
  'wss://lbrygen.xyz',
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

  private readonly sendAll: (message: object, globalFeed?: boolean) => void = async (
    message,
    globalFeed,
  ) => {
    const tosend = JSON.stringify(message)
    RelayPoolModule.sendAll(tosend, globalFeed ?? false)
  }

  private readonly sendRelay: (message: object, relayUrl: string) => void = async (
    message,
    relayUrl,
  ) => {
    const tosend = JSON.stringify(message)
    RelayPoolModule.sendRelay(tosend, relayUrl)
  }

  public readonly connect: (publicKey: string, onEventId: (eventId: string) => void) => void =
    async (publicKey, onEventId) => {
      RelayPoolModule.connect(publicKey, onEventId)
    }

  public readonly resilientMode: (db: QuickSQLiteConnection, publicKey: string) => void = async (
    db,
  ) => {
    await DatabaseModule.desactivateResilientRelays()
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
    // resilientUrls.forEach((url) => DatabaseModule.createResilientRelay(url))
    // resilientUrls.forEach((url) => DatabaseModule.activateResilientRelay(url))
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

  public readonly removeAll: (callback?: () => void) => void = async (callback) => {
    RelayPoolModule.removeAll(callback)
  }

  public readonly update: (
    relayUrl: string,
    active: number,
    globalfeed: number,
    paid: number,
    callback?: () => void,
  ) => void = async (relayUrl, active, globalfeed, paid, callback = () => {}) => {
    RelayPoolModule.update(relayUrl, active, globalfeed, paid, callback)
  }

  public readonly sendEvent: (event: Event, relayUrl?: string) => Promise<Event | null> = async (
    event,
    relayUrl,
  ) => {
    if (this.privateKey) {
      let signedEvent: Event = event

      if (!event.sig) {
        signedEvent = await signEvent(event, this.privateKey)
      }

      if (validateEvent(signedEvent)) {
        if (relayUrl) {
          this.sendRelay(['EVENT', event], relayUrl)
        } else {
          this.sendAll(['EVENT', event])
        }
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
      this.sendAll([...['REQ', subId], ...(filters ?? [])], subId.includes('-global-'))
      const newSubscriptions = [...(this.subscriptions[subId] ?? []), id]
      this.subscriptions[subId] = newSubscriptions
    }
  }

  public readonly unsubscribe: (subIds: string[]) => void = async (subIds) => {
    subIds.forEach((subId: string) => {
      this.sendAll(['CLOSE', subId])
      delete this.subscriptions[subId]
    })
  }

  public readonly unsubscribeAll: () => void = async () => {
    this.unsubscribe(Object.keys(this.subscriptions))
    this.subscriptions = {}
  }
}

export default RelayPool
