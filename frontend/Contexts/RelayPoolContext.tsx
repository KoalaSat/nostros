import React, { useContext, useEffect, useState } from 'react'
import Relay from '../lib/nostr/Relay'
import { Event, EventKind } from '../lib/nostr/Events'
import RelayPool from '../lib/nostr/RelayPool/intex'
import { AppContext } from './AppContext'
import { storeEvent } from '../Functions/DatabaseFunctions/Events'
import { getRelays, Relay as RelayEntity, storeRelay } from '../Functions/DatabaseFunctions/Relays'
import { showMessage } from 'react-native-flash-message'
import SInfo from 'react-native-sensitive-info'
import { getPublickey } from '../lib/nostr/Bip'

export interface RelayPoolContextProps {
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
  const [lastEventId, setLastEventId] = useState<string>()
  const [lastPage, setLastPage] = useState<string>(page)

  const loadRelayPool: () => void = () => {
    if (database) {
      getRelays(database).then((relays: RelayEntity[]) => {
        const initRelayPool = new RelayPool([], privateKey)
        if (relays.length > 0) {
          relays.forEach((relay) => {
            initRelayPool.add(relay.url)
          })
        } else {
          ;['wss://relay.damus.io'].forEach((relayUrl) => {
            initRelayPool.add(relayUrl)
            storeRelay({ url: relayUrl }, database)
          })
        }

        initRelayPool?.on(
          'notice',
          'RelayPoolContextProvider',
          (relay: Relay, _subId?: string, event?: Event) => {
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
          (relay: Relay, _subId?: string, event?: Event) => {
            console.log('RELAYPOOL EVENT =======>', relay.url, event)
            if (database && event?.id && event.kind !== EventKind.petNames) {
              storeEvent(event, database)
                .then(() => setLastEventId(event.id))
                .catch(() => setLastEventId(event.id))
            }
          },
        )
        setRelayPool(initRelayPool)
      })
    }
  }

  useEffect(() => {
    if ((privateKey !== '' || publicKey !== '') && !loadingDb && !relayPool) {
      loadRelayPool()
    }
  }, [privateKey, loadingDb])

  useEffect(() => {
    if (relayPool && lastPage !== page) {
      relayPool.removeOn('event', lastPage)
      setLastPage(page)
    }
  }, [page])

  useEffect(() => {
    SInfo.getItem('privateKey', {}).then((privateResult) => {
      if (privateResult && privateResult !== '') {
        loadRelayPool()
        goToPage('home', true)
        setPrivateKey(privateResult)
        setPublicKey(getPublickey(privateResult))
      } else {
        SInfo.getItem('publicKey', {}).then((publicResult) => {
          if (publicResult && publicResult !== '') {
            loadRelayPool()
            goToPage('home', true)
            setPublicKey(publicResult)
          } else {
            goToPage('landing', true)
          }
        })
      }
    })
  }, [])

  return (
    <RelayPoolContext.Provider
      value={{
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
