import React, { useContext, useEffect, useState } from 'react'
import RelayPool from '../lib/nostr/RelayPool/intex'
import { AppContext } from './AppContext'
import SInfo from 'react-native-sensitive-info'
import { getPublickey } from '../lib/nostr/Bip'
import moment from 'moment'

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
    if (database && publicKey) {
      const initRelayPool = new RelayPool([], privateKey)
      initRelayPool.connect(publicKey)
      setRelayPool(initRelayPool)
      setLoadingRelayPool(false)
    }
  }

  const setClock: () => void = () => {
    setLastEventId(moment().unix().toString())
    setTimeout(setClock, 500)
  }

  useEffect(() => {
    setClock()
  }, [])

  useEffect(() => {
    if (relayPool && lastPage !== page) {
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
