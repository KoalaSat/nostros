import React, { useContext, useEffect, useMemo, useState } from 'react'
import RelayPool from '../lib/nostr/RelayPool/intex'
import { AppContext } from './AppContext'
import { DeviceEventEmitter } from 'react-native'
import debounce from 'lodash.debounce'
import { getRelays, Relay } from '../Functions/DatabaseFunctions/Relays'
import { UserContext } from './UserContext'

export interface RelayPoolContextProps {
  relayPoolReady: boolean
  relayPool?: RelayPool
  setRelayPool: (relayPool: RelayPool) => void
  lastEventId?: string
  lastConfirmationtId?: string
  relays: Relay[]
  addRelayItem: (relay: Relay) => Promise<void>
  removeRelayItem: (relay: Relay) => Promise<void>
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
  addRelayItem: async () => await new Promise(() => {}),
  removeRelayItem: async () => await new Promise(() => {}),
  relays: [],
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

  const changeEventIdHandler: (event: WebsocketEvent) => void = (event) => {
    setLastEventId(event.eventId)
  }
  const changeConfirmationIdHandler: (event: WebsocketEvent) => void = (event) => {
    setLastConfirmationId(event.eventId)
  }

  const debouncedEventIdHandler = useMemo(
    () => debounce(changeEventIdHandler, 1000),
    [setLastEventId],
  )
  const debouncedConfirmationHandler = useMemo(
    () => debounce(changeConfirmationIdHandler, 500),
    [setLastConfirmationId],
  )

  const loadRelayPool: () => void = async () => {
    if (database && publicKey) {
      DeviceEventEmitter.addListener('WebsocketEvent', debouncedEventIdHandler)
      DeviceEventEmitter.addListener('WebsocketConfirmation', debouncedConfirmationHandler)
      const initRelayPool = new RelayPool([], privateKey)
      initRelayPool.connect(publicKey, (eventId: string) => setLastEventId(eventId))
      setRelayPool(initRelayPool)
      setRelayPoolReady(true)
      loadRelays()
    }
  }

  const loadRelays: () => void = () => {
    if (database) {
      getRelays(database).then((results) => setRelays(results))
    }
  }

  const addRelayItem: (relay: Relay) => Promise<void> = async (relay) => {
    return await new Promise((resolve, _reject) => {
      if (relayPool && database && publicKey) {
        relayPool.add(relay.url, () => {
          setRelays((prev) => [...prev, relay])
          resolve()
        })
      }
    })
  }

  const removeRelayItem: (relay: Relay) => Promise<void> = async (relay) => {
    return await new Promise((resolve, _reject) => {
      if (relayPool && database && publicKey) {
        relayPool.remove(relay.url, () => {
          setRelays((prev) => prev.filter((item) => item.url !== relay.url))
          resolve()
        })
      }
    })
  }

  useEffect(() => {
    if (publicKey && publicKey !== '') {
      loadRelayPool()
    }
  }, [publicKey])

  return (
    <RelayPoolContext.Provider
      value={{
        relayPoolReady,
        relayPool,
        setRelayPool,
        lastEventId,
        lastConfirmationtId,
        relays,
        addRelayItem,
        removeRelayItem,
      }}
    >
      {children}
    </RelayPoolContext.Provider>
  )
}

export const RelayPoolContext = React.createContext(initialRelayPoolContext)
