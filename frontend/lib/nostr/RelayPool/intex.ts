import { validateEvent, type Event } from '../Events'
import RelayPoolModule from '../../Native/WebsocketModule'

export interface RelayFilters {
  ids?: string[]
  authors?: string[]
  kinds?: number[]
  '#e'?: string[]
  '#p'?: string[]
  '#t'?: string[]
  '#preimage'?: string[]
  since?: number
  limit?: number
  until?: number
}

export interface RelayMessage {
  data: string
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
  'wss://soloco.nl',
]

class RelayPool {
  constructor(privateKey?: string) {
    this.privateKey = privateKey
    this.subscriptions = {}
  }

  private readonly privateKey?: string
  private subscriptions: Record<string, string[]>

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

  public readonly add: (
    relayUrl: string,
    resilient: number,
    globalFeed: number,
    callback?: () => void,
  ) => void = async (relayUrl, resilient, globalFeed, callback = () => {}) => {
    RelayPoolModule.add(relayUrl, resilient, globalFeed, callback)
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
    if (validateEvent(event)) {
      if (relayUrl) {
        this.sendRelay(['EVENT', event], relayUrl)
      } else {
        this.sendAll(['EVENT', event])
      }
      return event
    } else {
      console.log('Not valid event', event)
      return null
    }
  }

  public readonly sendAuth: (event: Event, relayUrl: string) => Promise<Event | null> = async (
    event,
    relayUrl,
  ) => {
    if (validateEvent(event)) {
      this.sendRelay(['AUTH', event], relayUrl)
      return event
    } else {
      console.log('Not valid event', event)
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
