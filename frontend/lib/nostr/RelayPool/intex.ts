import { signEvent, validateEvent, Event } from '../Events'
import Relay, { RelayFilters, RelayOptions } from '../Relay'

export interface OnFunctions {
  open: { [id: string]: (relay: Relay) => void }
  event: { [id: string]: (relay: Relay, subId: string, event: Event) => void }
  esoe: { [id: string]: (relay: Relay, subId: string) => void }
  notice: { [id: string]: (relay: Relay, events: Event[]) => void }
}

class RelayPool {
  constructor(relaysUrls: string[], privateKey?: string, options: RelayOptions = {}) {
    this.relays = {}
    this.privateKey = privateKey
    this.options = options

    this.onFunctions = {
      open: {},
      event: {},
      esoe: {},
      notice: {},
    }

    relaysUrls.forEach((relayUrl) => {
      this.add(relayUrl)
    })

    this.setupHandlers()
  }

  private readonly privateKey?: string
  private readonly options: RelayOptions
  private readonly onFunctions: OnFunctions
  public relays: { [url: string]: Relay }

  private readonly setupHandlers: () => void = () => {
    Object.keys(this.relays).forEach((relayUrl: string) => {
      const relay: Relay = this.relays[relayUrl]

      relay.onOpen = (openRelay) => {
        Object.keys(this.onFunctions.open).forEach((id) => this.onFunctions.open[id](openRelay))
      }
      relay.onEvent = (eventRelay, subId, event) => {
        Object.keys(this.onFunctions.event).forEach((id) =>
          this.onFunctions.event[id](eventRelay, subId, event),
        )
      }
      relay.onEsoe = (eventRelay, subId) => {
        Object.keys(this.onFunctions.esoe).forEach((id) =>
          this.onFunctions.esoe[id](eventRelay, subId),
        )
      }
      relay.onNotice = (eventRelay, events) => {
        Object.keys(this.onFunctions.notice).forEach((id) =>
          this.onFunctions.notice[id](eventRelay, events),
        )
      }
    })
  }

  public on: (
    method: 'open' | 'event' | 'esoe' | 'notice',
    id: string,
    fn: (relay: Relay, subId?: string, event?: Event) => void,
  ) => void = (method, id, fn) => {
    this.onFunctions[method][id] = fn
  }

  public removeOn: (method: 'open' | 'event' | 'esoe' | 'notice', id: string) => void = (
    method,
    id,
  ) => {
    delete this.onFunctions[method][id]
  }

  public readonly add: (relayUrl: string) => boolean = (relayUrl) => {
    if (this.relays[relayUrl]) return false

    this.relays[relayUrl] = new Relay(relayUrl, this.options)
    this.setupHandlers()

    return true
  }

  public readonly close: () => void = () => {
    Object.keys(this.relays).forEach((relayUrl: string) => {
      const relay: Relay = this.relays[relayUrl]
      relay.close()
    })
  }

  public readonly remove: (relayUrl: string) => boolean = (relayUrl) => {
    const relay: Relay | undefined = this.relays[relayUrl]

    if (relay) {
      relay.close()
      delete this.relays[relayUrl]
      return true
    }

    return false
  }

  public readonly sendEvent: (event: Event) => Promise<Event | null> = async (event) => {
    if (!this.privateKey) return null

    const signedEvent: Event = await signEvent(event, this.privateKey)

    if (validateEvent(signedEvent)) {
      Object.keys(this.relays).forEach((relayUrl: string) => {
        const relay: Relay = this.relays[relayUrl]
        relay.sendEvent(signedEvent)
      })

      return signedEvent
    } else {
      console.log('Not valid event', event)
    }

    return null
  }

  public readonly subscribe: (subId: string, filters?: RelayFilters) => void = (subId, filters) => {
    Object.keys(this.relays).forEach((relayUrl: string) => {
      this.relays[relayUrl].subscribe(subId, filters)
    })
  }

  public readonly unsubscribe: (subId: string) => void = (subId) => {
    Object.keys(this.relays).forEach((relayUrl: string) => {
      this.relays[relayUrl].unsubscribe(subId)
    })
  }

  public readonly unsubscribeAll: () => void = () => {
    Object.keys(this.relays).forEach((relayUrl: string) => {
      this.relays[relayUrl].unsubscribeAll()
    })
  }
}

export default RelayPool
