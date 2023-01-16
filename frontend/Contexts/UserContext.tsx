import React, { useContext, useEffect, useState } from 'react'
import { getPublickey } from '../lib/nostr/Bip'
import SInfo from 'react-native-sensitive-info'
import { RelayPoolContext } from './RelayPoolContext'
import { AppContext } from './AppContext'
import {
  getContactsCount,
  getFollowersCount,
  getUser,
  User,
} from '../Functions/DatabaseFunctions/Users'
import { dropTables } from '../Functions/DatabaseFunctions'
import { navigate, jumpTo } from '../lib/Navigation'
import { npubEncode, nsecEncode } from 'nostr-tools/nip19'

export interface UserContextProps {
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
  const { relayPool } = React.useContext(RelayPoolContext)
  const [publicKey, setPublicKey] = useState<string>()
  const [nPub, setNpub] = useState<string>()
  const [nSec, setNsec] = useState<string>()
  const [privateKey, setPrivateKey] = useState<string>()
  const [user, setUser] = React.useState<User>()
  const [contactsCount, setContantsCount] = React.useState<number>(0)
  const [followersCount, setFollowersCount] = React.useState<number>(0)

  const reloadUser: () => void = () => {
    if (database && publicKey) {
      getUser(publicKey, database).then((result) => {
        if (result) setUser(result)
      })
      getContactsCount(database).then(setContantsCount)
      getFollowersCount(database).then(setFollowersCount)
    }
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
      const publicKey: string = getPublickey(privateKey)
      setPublicKey(publicKey)
    }
  }, [privateKey])

  useEffect(() => {
    if (publicKey && publicKey !== '') {
      SInfo.setItem('publicKey', publicKey, {})
      setNpub(npubEncode(publicKey))
      reloadUser()
    }
  }, [publicKey])

  useEffect(() => {
    if (user) {
      navigate('Feed')
    }
  }, [user])

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
              jumpTo('Feed')
            }
          })
        }
      })
    }
  }, [loadingDb])

  return (
    <UserContext.Provider
      value={{
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
