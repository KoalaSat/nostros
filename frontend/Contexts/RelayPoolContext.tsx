import React, { useContext, useEffect, useMemo, useState } from 'react'
import RelayPool from '../lib/nostr/RelayPool/intex'
import { AppContext } from './AppContext'
import SInfo from 'react-native-sensitive-info'
import { getPublickey } from '../lib/nostr/Bip'
import { DeviceEventEmitter } from 'react-native'
import debounce from 'lodash.debounce'

export interface RelayPoolContextProps {
  loadingRelayPool: boolean
  relayPool?: RelayPool
  setRelayPool: (relayPool: RelayPool) => void
  publicKey?: string
  setPublicKey: (privateKey: string | undefined) => void
  privateKey?: string
  setPrivateKey: (privateKey: string | undefined) => void
  lastEventId?: string
  lastConfirmationtId?: string
}

export interface WebsocketEvent {
  eventId: string
}

export interface RelayPoolContextProviderProps {
  children: React.ReactNode
  images?: string
}

export const initialRelayPoolContext: RelayPoolContextProps = {
  loadingRelayPool: true,
  setPublicKey: () => {},
  setPrivateKey: () => {},
  setRelayPool: () => {},
}

export const RelayPoolContextProvider = ({
  children,
  images,
}: RelayPoolContextProviderProps): JSX.Element => {
  const { database, loadingDb, goToPage, page } = useContext(AppContext)

  const [publicKey, setPublicKey] = useState<string>()
  const [privateKey, setPrivateKey] = useState<string>()
  const [relayPool, setRelayPool] = useState<RelayPool>()
  const [loadingRelayPool, setLoadingRelayPool] = useState<boolean>(
    initialRelayPoolContext.loadingRelayPool,
  )
  const [lastEventId, setLastEventId] = useState<string>('')
  const [lastConfirmationtId, setLastConfirmationId] = useState<string>('')
  const [lastPage, setLastPage] = useState<string>(page)

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
      setLoadingRelayPool(false)
    }
  }

  useEffect(() => {
    if (relayPool && lastPage !== page) {
      setLastPage(page)
    }
  }, [page])

  useEffect(() => {
    if (publicKey && publicKey !== '') {
      SInfo.setItem('publicKey', publicKey, {})
      if (!loadingRelayPool && page !== 'landing') {
        goToPage('home', true)
      } else {
        loadRelayPool()
      }
    }
  }, [publicKey, loadingRelayPool])

  useEffect(() => {
    if (privateKey && privateKey !== '') {
      SInfo.setItem('privateKey', privateKey, {})
      const publicKey: string = getPublickey(privateKey)
      setPublicKey(publicKey)
    }
  }, [privateKey])

  useEffect(() => {
    if (!loadingDb) {
      SInfo.getItem('privateKey', {}).then((privateResult) => {
        if (privateResult && privateResult !== '') {
          setPrivateKey(privateResult)
          setPublicKey(getPublickey(privateResult))
        } else {
          SInfo.getItem('publicKey', {}).then((publicResult) => {
            if (publicResult && publicResult !== '') {
              setPublicKey(publicResult)
            } else {
              goToPage('landing', true)
            }
          })
        }
      })
    }
  }, [loadingDb])

  return (
    <RelayPoolContext.Provider
      value={{
        loadingRelayPool,
        relayPool,
        setRelayPool,
        publicKey,
        setPublicKey,
        privateKey,
        setPrivateKey,
        lastEventId,
        lastConfirmationtId,
      }}
    >
      {children}
    </RelayPoolContext.Provider>
  )
}

export const RelayPoolContext = React.createContext(initialRelayPoolContext)
