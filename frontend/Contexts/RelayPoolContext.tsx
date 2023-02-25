import React, { useContext, useEffect, useMemo, useState } from 'react'
import RelayPool, { fallbackRelays } from '../lib/nostr/RelayPool/intex'
import { AppContext } from './AppContext'
import { DeviceEventEmitter } from 'react-native'
import debounce from 'lodash.debounce'
import { getActiveRelays, getRelays, Relay } from '../Functions/DatabaseFunctions/Relays'
import { UserContext } from './UserContext'
import { randomInt } from '../Functions/NativeFunctions'
import { getUnixTime } from 'date-fns'
import { Event } from '../lib/nostr/Events'

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
}

export const RelayPoolContextProvider = ({
  children,
  images,
}: RelayPoolContextProviderProps): JSX.Element => {
  const { database } = useContext(AppContext)
  const { publicKey, privateKey } = React.useContext(UserContext)

  const [relayPool, setRelayPool] = useState<RelayPool>()
  const [relayPoolReady, setRelayPoolReady] = useState<boolean>(false)
  const [lastEventId, setLastEventId] = useState<string>('')
  const [lastConfirmationtId, setLastConfirmationId] = useState<string>('')
  const [relays, setRelays] = React.useState<Relay[]>([])
  const [displayRelayDrawer, setDisplayrelayDrawer] = React.useState<string>()

  const sendRelays: (url?: string) => Promise<void> = async (url) => {
    if (publicKey && database) {
      getActiveRelays(database).then((results) => {
        if (publicKey && results.length > 0) {
          const event: Event = {
            content: '',
            created_at: getUnixTime(new Date()),
            kind: 1002,
            pubkey: publicKey,
            tags: results.map((relay) => ['r', relay.url, relay.mode ?? '']),
          }
          url ? relayPool?.sendEvent(event, url) : relayPool?.sendEvent(event)
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

  const createRandomRelays: () => Promise<void> = async () => {
    const randomrelays: string[] = []
    while (randomrelays.length < 5) {
      const index = randomInt(0, fallbackRelays.length - 1)
      const url = fallbackRelays[index]
      if (!randomrelays.includes(url)) {
        randomrelays.push(fallbackRelays[index])
        await addRelayItem({ url })
      }
    }
  }

  const loadRelayPool: () => void = async () => {
    if (database && publicKey) {
      const initRelayPool = new RelayPool(privateKey)
      initRelayPool.connect(publicKey, () => {
        initRelayPool.resilientMode(database, publicKey)
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
        relayPool.update(relay.url, relay.active ?? 1, relay.global_feed ?? 1, () => {
          loadRelays().then(() => resolve())
        })
      }
    })
  }

  const addRelayItem: (relay: Relay) => Promise<void> = async (relay) => {
    setRelays((prev) => [...prev, relay])
    return await new Promise((resolve, _reject) => {
      if (relayPool && database && publicKey) {
        relayPool.add(relay.url, () => {
          loadRelays().then(() => {
            sendRelays()
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
            sendRelays()
            resolve()
          })
        })
      }
    })
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
      getActiveRelays(database).then((results) => {
        if (results.length < 1) {
          createRandomRelays()
        }
        loadRelays().then(() => setRelayPoolReady(true))
      })
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
      }}
    >
      {children}
    </RelayPoolContext.Provider>
  )
}

export const RelayPoolContext = React.createContext(initialRelayPoolContext)
