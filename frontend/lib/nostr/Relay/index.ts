import { Event } from '../Events'
import { v5 as uuidv5 } from 'uuid'
import WebsocketModule from '../Native/WebsocketModule'

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

export interface RelayOptions {
  reconnect?: boolean
}

class Relay {
  constructor(relayUrl: string, options: RelayOptions = { reconnect: true }) {
    this.url = relayUrl
    this.options = options
    this.manualClose = false
    this.socket = new WebSocket(this.url)
    this.subscriptions = {}

    this.onOpen = () => {}
    this.onEvent = () => {}
    this.onEsoe = () => {}
    this.onNotice = () => {}

    this.initWebsocket()
  }

  private readonly options: RelayOptions
  private socket: WebSocket
  private manualClose: boolean
  private subscriptions: { [subId: string]: string[] }

  private readonly initWebsocket: () => void = async () => {
    this.socket.onmessage = (message) => {
      this.handleNostrMessage(message as RelayMessage)
    }
    this.socket.onclose = this.onClose
    this.socket.onerror = this.onError
    this.socket.onopen = () => this.onOpen(this)
  }

  private readonly onClose: () => void = async () => {
    if (!this.manualClose && this.options.reconnect) this.initWebsocket()
  }

  private readonly onError: () => void = async () => {
    if (this.options.reconnect) this.initWebsocket()
  }

  private readonly handleNostrMessage: (message: RelayMessage) => void = async (message) => {
    const data: any[] = JSON.parse(message.data)

    if (data.length >= 2) {
      const id: string = data[1]
      if (data[0] === 'EVENT') {
        if (data.length < 3) return
        const message: Event = data[2]
        return this.onEvent(this, id, message)
      } else if (data[0] === 'EOSE') {
        return this.onEsoe(this, id)
      } else if (data[0] === 'NOTICE') {
        return this.onNotice(this, [...data.slice(1)])
      }
    }
  }

  private readonly send: (message: object) => void = async (message) => {
    const tosend = JSON.stringify(message)
    console.log('SEND =====>', tosend)
    WebsocketModule.send(tosend)
  }

  public url: string
  public onOpen: (relay: Relay) => void
  public onEvent: (relay: Relay, subId: string, event: Event) => void
  public onEsoe: (relay: Relay, subId: string) => void
  public onNotice: (relay: Relay, events: Event[]) => void

  public readonly close: () => void = async () => {
    if (this.socket) {
      this.manualClose = true
      this.socket.close()
    }
  }

  public readonly sendEvent: (event: Event) => void = async (event) => {
    this.send(['EVENT', event])
  }

  public readonly subscribe: (subId: string, filters?: RelayFilters) => void = async (
    subId,
    filters = {},
  ) => {
    const uuid = uuidv5(
      `${subId}${JSON.stringify(filters)}`,
      '57003344-b2cb-4b6f-a579-fae9e82c370a',
    )
    if (this.subscriptions[subId]?.includes(uuid)) {
      console.log('Subscription already done!')
    } else {
      this.send(['REQ', subId, filters])
      const newSubscriptions = [...(this.subscriptions[subId] ?? []), uuid]
      this.subscriptions[subId] = newSubscriptions
    }
  }

  public readonly unsubscribe: (subId: string) => void = async (subId) => {
    this.send(['CLOSE', subId])
    delete this.subscriptions[subId]
  }

  public readonly unsubscribeAll: () => void = async () => {
    Object.keys(this.subscriptions).forEach((subId: string) => {
      this.unsubscribe(subId)
    })
  }
}

export default Relay
