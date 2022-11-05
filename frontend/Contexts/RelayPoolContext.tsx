import React, { useContext, useEffect, useState } from 'react'
import Relay from '../lib/nostr/Relay'
import { Event, EventKind } from '../lib/nostr/Events'
import RelayPool from '../lib/nostr/RelayPool/intex'
import { AppContext } from './AppContext'
import { storeEvent } from '../Functions/DatabaseFunctions/Events'
import { getRelays, addRelay } from '../Functions/DatabaseFunctions/Relays'
import { showMessage } from 'react-native-flash-message'
import SInfo from 'react-native-sensitive-info'
import { getPublickey } from '../lib/nostr/Bip'
import { pickRandomItems } from '../Functions/NativeFunctions'
import { defaultRelays } from '../Constants/RelayConstants'

export interface RelayPoolContextProps {
  loadingRelayPool: boolean
  relayPool?: RelayPool
  setRelayPool: (relayPool: RelayPool) => void
  publicKey?: string
  setPublicKey: (privateKey: string | undefined) => void
  privateKey?: string
  setPrivateKey: (privateKey: string | undefined) => void
  lastEventId?: string
  setLastEventId: (lastEventId: string) => void
}

export interface RelayPoolContextProviderProps {
  children: React.ReactNode
}

export const initialRelayPoolContext: RelayPoolContextProps = {
  loadingRelayPool: true,
  setPublicKey: () => {},
  setPrivateKey: () => {},
  setRelayPool: () => {},
  setLastEventId: () => {},
}

export const RelayPoolContextProvider = ({
  children,
}: RelayPoolContextProviderProps): JSX.Element => {
  const { database, loadingDb, goToPage, page } = useContext(AppContext)

  const [publicKey, setPublicKey] = useState<string>()
  const [privateKey, setPrivateKey] = useState<string>()
  const [relayPool, setRelayPool] = useState<RelayPool>()
  const [loadingRelayPool, setLoadingRelayPool] = useState<boolean>(
    initialRelayPoolContext.loadingRelayPool,
  )
  const [lastEventId, setLastEventId] = useState<string>('')
  const [lastPage, setLastPage] = useState<string>(page)

  const loadRelayPool: () => void = async () => {
    if (database) {
      const relays = await getRelays(database)
      const initRelayPool = new RelayPool([], privateKey)
      if (relays && relays.length > 0) {
        relays.forEach((relay) => {
          initRelayPool.add(relay.url)
        })
      } else {
        pickRandomItems(defaultRelays, 2).forEach((relayUrl) => {
          initRelayPool.add(relayUrl)
          addRelay({ url: relayUrl }, database)
        })
      }

      initRelayPool?.on(
        'notice',
        'RelayPoolContextProvider',
        async (relay: Relay, _subId?: string, event?: Event) => {
          showMessage({
            message: relay.url,
            description: event?.content ?? '',
            type: 'info',
          })
        },
      )
      initRelayPool?.on(
        'event',
        'RelayPoolContextProvider',
        async (relay: Relay, _subId?: string, event?: Event) => {
          if (database && event?.id && event.kind !== EventKind.petNames) {
            console.log('RELAYPOOL EVENT =======>', relay.url, event)
            storeEvent(event, database).finally(() => setLastEventId(event.id ?? ''))
          }
        },
      )
      setRelayPool(initRelayPool)
      setLoadingRelayPool(false)
    }
  }

  useEffect(() => {
    if (relayPool && lastPage !== page) {
      relayPool.removeOn('event', lastPage)
      setLastPage(page)
    }
  }, [page])

  useEffect(() => {
    if (publicKey && publicKey !== '') {
      if (!loadingRelayPool && page !== 'landing') {
        goToPage('home', true)
      } else {
        loadRelayPool()
      }
    }
  }, [publicKey, loadingRelayPool])

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
        setLastEventId,
      }}
    >
      {children}
    </RelayPoolContext.Provider>
  )
}

export const RelayPoolContext = React.createContext(initialRelayPoolContext)
