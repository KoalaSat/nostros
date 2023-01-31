import React, { useContext, useEffect, useState } from 'react'
import SInfo from 'react-native-sensitive-info'
import { RelayPoolContext } from './RelayPoolContext'
import { AppContext } from './AppContext'
import { getUser } from '../Functions/DatabaseFunctions/Users'
import { getPublicKey } from 'nostr-tools'
import { dropTables } from '../Functions/DatabaseFunctions'
import { navigate } from '../lib/Navigation'
import { nsecEncode } from 'nostr-tools/nip19'
import { getNpub } from '../lib/nostr/Nip19'

export interface UserContextProps {
  userState: 'loading' | 'access' | 'ready'
  setUserState: (userState: 'loading' | 'access' | 'ready') => void
  nPub?: string
  nSec?: string
  publicKey?: string
  setPublicKey: (privateKey: string | undefined) => void
  privateKey?: string
  setPrivateKey: (privateKey: string | undefined) => void
  reloadUser: () => void
  logout: () => void
  name?: string
  setName: (value: string) => void
  picture?: string
  setPicture: (value: string) => void
  about?: string
  setAbout: (value: string) => void
  lnurl?: string
  setLnurl: (value: string) => void
  nip05?: string
  setNip05: (value: string) => void
  validNip05?: boolean
}

export interface UserContextProviderProps {
  children: React.ReactNode
}

export const initialUserContext: UserContextProps = {
  userState: 'loading',
  setUserState: () => {},
  setPublicKey: () => {},
  setPrivateKey: () => {},
  reloadUser: () => {},
  logout: () => {},
  setName: () => {},
  setPicture: () => {},
  setAbout: () => {},
  setLnurl: () => {},
  setNip05: () => {},
}

export const UserContextProvider = ({ children }: UserContextProviderProps): JSX.Element => {
  const { database, loadingDb, init } = useContext(AppContext)
  const { relayPool } = useContext(RelayPoolContext)
  const [userState, setUserState] = useState<'loading' | 'access' | 'ready'>('loading')
  const [publicKey, setPublicKey] = useState<string>()
  const [nPub, setNpub] = useState<string>()
  const [nSec, setNsec] = useState<string>()
  const [privateKey, setPrivateKey] = useState<string>()
  const [name, setName] = useState<string>()
  const [picture, setPicture] = useState<string>()
  const [about, setAbout] = useState<string>()
  const [lnurl, setLnurl] = useState<string>()
  const [nip05, setNip05] = useState<string>()
  const [validNip05, setValidNip05] = useState<boolean>()

  const reloadUser: () => void = () => {
    if (database && publicKey) {
      getUser(publicKey, database).then((result) => {
        if (result) {
          setName(result.name)
          setPicture(result.picture)
          setAbout(result.about)
          setLnurl(result.lnurl)
          setNip05(result.nip05)
          setValidNip05(result.valid_nip05)
        }
      })
    }
  }

  const logout: () => void = () => {
    if (database) {
      relayPool?.unsubscribeAll()
      setPrivateKey(undefined)
      setPublicKey(undefined)
      setNpub(undefined)
      setNsec(undefined)
      setName(undefined)
      setPicture(undefined)
      setAbout(undefined)
      setLnurl(undefined)
      setNip05(undefined)
      setValidNip05(undefined)
      dropTables(database).then(() => {
        SInfo.deleteItem('privateKey', {}).then(() => {
          SInfo.deleteItem('publicKey', {}).then(() => {
            init()
            setUserState('access')
            navigate('Home', { screen: 'ProfileConnect' })
          })
        })
      })
    }
  }

  useEffect(() => {
    if (privateKey && privateKey !== '') {
      SInfo.setItem('privateKey', privateKey, {})
      setNsec(nsecEncode(privateKey))
      setPublicKey(getPublicKey(privateKey))
    }
  }, [privateKey])

  useEffect(() => {
    if (publicKey && publicKey !== '') {
      SInfo.setItem('publicKey', publicKey, {})
      setNpub(getNpub(publicKey))
      reloadUser()
    }
  }, [publicKey])

  useEffect(() => {
    if (userState === 'ready' && publicKey) {
      navigate('Feed')
    }
  }, [userState, publicKey])

  useEffect(() => {
    if (!loadingDb) {
      SInfo.getItem('privateKey', {}).then((privateResult) => {
        if (privateResult && privateResult !== '') {
          setPrivateKey(privateResult)
        }
      })
      SInfo.getItem('publicKey', {}).then((publicResult) => {
        if (publicResult && publicResult !== '') {
          setPublicKey(publicResult)
          setUserState('ready')
        } else {
          setUserState('access')
        }
      })
    }
  }, [loadingDb])

  return (
    <UserContext.Provider
      value={{
        userState,
        setUserState,
        nSec,
        nPub,
        publicKey,
        setPublicKey,
        privateKey,
        setPrivateKey,
        reloadUser,
        logout,
        name,
        setName,
        picture,
        setPicture,
        about,
        setAbout,
        lnurl,
        setLnurl,
        nip05,
        setNip05,
        validNip05,
      }}
    >
      {children}
    </UserContext.Provider>
  )
}

export const UserContext = React.createContext(initialUserContext)
