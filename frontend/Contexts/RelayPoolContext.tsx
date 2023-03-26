import React, { useContext, useEffect, useMemo, useState } from 'react'
import RelayPool, { fallbackRelays } from '../lib/nostr/RelayPool/intex'
import { AppContext } from './AppContext'
import { DeviceEventEmitter } from 'react-native'
import debounce from 'lodash.debounce'
import { getActiveRelays, getRelays, type Relay } from '../Functions/DatabaseFunctions/Relays'
import { UserContext } from './UserContext'
import { getUnixTime } from 'date-fns'
import { signEvent, type Event } from '../lib/nostr/Events'
import { randomInt } from '../Functions/NativeFunctions'
import axios from 'axios'

export interface RelayPoolContextProps {
  relayPoolReady: boolean
  relayPool?: RelayPool
  setRelayPool: (relayPool: RelayPool) => void
  lastEventId?: string
  setDisplayrelayDrawer: (displayRelayDrawer: string | undefined) => void
  displayRelayDrawer?: string
  lastConfirmationtId?: string
  relays: Relay[]
  addRelayItem: (relay: Relay) => Promise<void>
  removeRelayItem: (relay: Relay) => Promise<void>
  updateRelayItem: (relay: Relay) => Promise<void>
  sendRelays: (url?: string) => Promise<void>
  loadRelays: () => Promise<Relay[]>
  createRandomRelays: () => Promise<void>
  sendEvent: (event: Event, relayUrl?: string) => Promise<Event | null | undefined>
}

export interface WebsocketEvent {
  eventId: string
}

export interface RelayPoolContextProviderProps {
  children: React.ReactNode
  images?: string
}

export const initialRelayPoolContext: RelayPoolContextProps = {
  relayPoolReady: true,
  setRelayPool: () => {},
  addRelayItem: async () => {},
  removeRelayItem: async () => {},
  updateRelayItem: async () => {},
  relays: [],
  setDisplayrelayDrawer: () => {},
  sendRelays: async () => {},
  loadRelays: async () => [],
  createRandomRelays: async () => {},
  sendEvent: async () => null,
}

export const RelayPoolContextProvider = ({
  children,
  images,
}: RelayPoolContextProviderProps): JSX.Element => {
  const { database, signHeight } = useContext(AppContext)
  const { publicKey, privateKey } = React.useContext(UserContext)
  const [relayPool, setRelayPool] = useState<RelayPool>()
  const [relayPoolReady, setRelayPoolReady] = useState<boolean>(false)
  const [lastEventId, setLastEventId] = useState<string>('')
  const [lastConfirmationtId, setLastConfirmationId] = useState<string>('')
  const [relays, setRelays] = React.useState<Relay[]>([])
  const [displayRelayDrawer, setDisplayrelayDrawer] = React.useState<string>()

  const sendEvent: (event: Event, relayUrl?: string) => Promise<Event | null | undefined> = async (
    event,
    relayUrl,
  ) => {
    if (signHeight) {
      try {
        const response = await axios.get('https://mempool.space/api/v1/blocks')
        if (response) {
          const lastBlock: { id: string; height: number; timestamp: number } = response.data[0]
          const newTags = event.tags.filter((tag) => tag[0] !== 'bitcoin')
          newTags.push([
            'bitcoin',
            lastBlock.id,
            lastBlock.height.toString(),
            lastBlock.timestamp.toString(),
          ])
          event.tags = newTags
        }
      } catch {}
    }
    if (!event.sig && privateKey) {
      event = await signEvent(event, privateKey)
    }

    return await relayPool?.sendEvent(event, relayUrl)
  }

  const sendRelays: (url?: string) => Promise<void> = async (url) => {
    if (publicKey && database) {
      getActiveRelays(database).then((results) => {
        if (publicKey && results.length > 0) {
          const event: Event = {
            content: '',
            created_at: getUnixTime(new Date()),
            kind: 10002,
            pubkey: publicKey,
            tags: results.map((relay) => ['r', relay.url, relay.mode ?? '']),
          }
          url ? sendEvent(event, url) : sendEvent(event)
        }
      })
    }
  }

  const changeEventIdHandler: (event: WebsocketEvent) => void = (event) => {
    setLastEventId(event.eventId)
  }
  const changeConfirmationIdHandler: (event: WebsocketEvent) => void = (event) => {
    setLastConfirmationId(event.eventId)
  }

  const debouncedEventIdHandler = useMemo(
    () => debounce(changeEventIdHandler, 250),
    [setLastEventId],
  )
  const debouncedConfirmationHandler = useMemo(
    () => debounce(changeConfirmationIdHandler, 250),
    [setLastConfirmationId],
  )

  const loadRelayPool: () => void = async () => {
    if (database && publicKey) {
      const initRelayPool = new RelayPool(privateKey)
      initRelayPool.connect(publicKey, () => {
        setRelayPool(initRelayPool)
      })
    }
  }

  const loadRelays: () => Promise<Relay[]> = async () => {
    return await new Promise<Relay[]>((resolve, _reject) => {
      if (database) {
        getRelays(database).then((results) => {
          setRelays(results)
          resolve(results)
        })
      } else {
        resolve([])
      }
    })
  }

  const updateRelayItem: (relay: Relay) => Promise<void> = async (relay) => {
    setRelays((prev) => {
      return prev.map((item) => {
        if (item.url === relay.url) {
          return relay
        } else {
          return item
        }
      })
    })
    return await new Promise((resolve, _reject) => {
      if (relayPool && database && publicKey) {
        relayPool.update(
          relay.url,
          relay.active ?? 1,
          relay.global_feed ?? 1,
          relay.paid ?? 0,
          () => {
            loadRelays().then(() => resolve())
          },
        )
      }
    })
  }

  const addRelayItem: (relay: Relay) => Promise<void> = async (relay) => {
    setRelays((prev) => [...prev, relay])
    return await new Promise((resolve, _reject) => {
      if (relayPool && database && publicKey) {
        relayPool.add(relay.url, relay.resilient ?? 0, relay.global_feed ?? 1, () => {
          loadRelays().then(() => {
            resolve()
          })
        })
      }
    })
  }

  const removeRelayItem: (relay: Relay) => Promise<void> = async (relay) => {
    setRelays((prev) => prev.filter((item) => item.url !== relay.url))
    return await new Promise((resolve, _reject) => {
      if (relayPool && database && publicKey) {
        relayPool.remove(relay.url, () => {
          loadRelays().then(() => {
            resolve()
          })
        })
      }
    })
  }

  const createRandomRelays: () => Promise<void> = async () => {
    const randomrelays: string[] = []
    while (randomrelays.length < 8) {
      const index = randomInt(0, fallbackRelays.length - 1)
      const url = fallbackRelays[index]
      if (!randomrelays.includes(url)) {
        randomrelays.push(url)
      }
    }
    randomrelays.forEach(async (url) => await addRelayItem({ url }))
  }

  useEffect(() => {
    if (publicKey && publicKey !== '') {
      DeviceEventEmitter.addListener('WebsocketEvent', debouncedEventIdHandler)
      DeviceEventEmitter.addListener('WebsocketConfirmation', debouncedConfirmationHandler)
      loadRelayPool()
    }
  }, [publicKey])

  useEffect(() => {
    if (database && relayPool) {
      loadRelays().then(() => setRelayPoolReady(true))
    }
  }, [relayPool])

  return (
    <RelayPoolContext.Provider
      value={{
        displayRelayDrawer,
        setDisplayrelayDrawer,
        relayPoolReady,
        relayPool,
        setRelayPool,
        lastEventId,
        lastConfirmationtId,
        relays,
        addRelayItem,
        removeRelayItem,
        updateRelayItem,
        sendRelays,
        loadRelays,
        createRandomRelays,
        sendEvent,
      }}
    >
      {children}
    </RelayPoolContext.Provider>
  )
}

export const RelayPoolContext = React.createContext(initialRelayPoolContext)
