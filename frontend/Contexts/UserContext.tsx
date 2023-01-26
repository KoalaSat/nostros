import React, { useContext, useEffect, useState } from 'react'
import SInfo from 'react-native-sensitive-info'
import { RelayPoolContext } from './RelayPoolContext'
import { AppContext } from './AppContext'
import {
  getContactsCount,
  getFollowersCount,
  getUser,
  User,
} from '../Functions/DatabaseFunctions/Users'
import { getPublicKey } from 'nostr-tools'
import { dropTables } from '../Functions/DatabaseFunctions'
import { navigate } from '../lib/Navigation'
import { nsecEncode } from 'nostr-tools/nip19'
import { getNpub } from '../lib/nostr/Nip19'
import Clipboard from '@react-native-clipboard/clipboard'
import { validNip21 } from '../Functions/NativeFunctions'

export interface UserContextProps {
  userState: 'loading' | 'access' | 'ready'
  setUserState: (userState: 'loading' | 'access' | 'ready') => void
  nPub?: string
  nSec?: string
  publicKey?: string
  setPublicKey: (privateKey: string | undefined) => void
  privateKey?: string
  setPrivateKey: (privateKey: string | undefined) => void
  setUser: (user: User) => void
  user?: User
  contactsCount: number
  followersCount: number
  setContantsCount: (count: number) => void
  setFollowersCount: (count: number) => void
  reloadUser: () => void
  logout: () => void
}

export interface UserContextProviderProps {
  children: React.ReactNode
}

export const initialUserContext: UserContextProps = {
  userState: 'loading',
  setUserState: () => {},
  setPublicKey: () => {},
  setPrivateKey: () => {},
  setUser: () => {},
  reloadUser: () => {},
  logout: () => {},
  setContantsCount: () => {},
  setFollowersCount: () => {},
  contactsCount: 0,
  followersCount: 0,
}

export const UserContextProvider = ({ children }: UserContextProviderProps): JSX.Element => {
  const { database, loadingDb, init } = useContext(AppContext)
  const { relayPool, lastEventId } = useContext(RelayPoolContext)
  const [userState, setUserState] = useState<'loading' | 'access' | 'ready'>('loading')
  const [publicKey, setPublicKey] = useState<string>()
  const [nPub, setNpub] = useState<string>()
  const [nSec, setNsec] = useState<string>()
  const [privateKey, setPrivateKey] = useState<string>()
  const [user, setUser] = React.useState<User>()
  const [clipboardLoads, setClipboardLoads] = React.useState<string[]>([])
  const [contactsCount, setContantsCount] = React.useState<number>(0)
  const [followersCount, setFollowersCount] = React.useState<number>(0)

  const reloadUser: () => void = () => {
    if (database && publicKey) {
      getUser(publicKey, database).then((result) => {
        if (result) {
          setUser(result)
        } else {
          setUser({
            id: publicKey,
          })
        }
        checkClipboard()
      })
      getContactsCount(database).then(setContantsCount)
      getFollowersCount(database).then(setFollowersCount)
    }
  }

  const checkClipboard: () => void = () => {
    Clipboard.getString().then((clipboardContent) => {
      if (validNip21(clipboardContent) && !clipboardLoads.includes(clipboardContent)) {
        setClipboardLoads((prev) => [...prev, clipboardContent])
        console.log(clipboardContent)
      }
    })
  }

  const logout: () => void = () => {
    if (database) {
      relayPool?.unsubscribeAll()
      setPrivateKey(undefined)
      setPublicKey(undefined)
      setNpub(undefined)
      setNsec(undefined)
      setUser(undefined)
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
    if (!user) reloadUser()
  }, [lastEventId])

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
        setUser,
        publicKey,
        setPublicKey,
        privateKey,
        setPrivateKey,
        user,
        contactsCount,
        followersCount,
        reloadUser,
        logout,
        setContantsCount,
        setFollowersCount,
      }}
    >
      {children}
    </UserContext.Provider>
  )
}

export const UserContext = React.createContext(initialUserContext)
