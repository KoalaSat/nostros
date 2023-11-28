import React, { useContext, useEffect, useState } from 'react'
import SInfo from 'react-native-sensitive-info'
import { RelayPoolContext } from './RelayPoolContext'
import { AppContext } from './AppContext'
import { getUser } from '../Functions/DatabaseFunctions/Users'
import { getPublicKey, nip19 } from 'nostr-tools'
import { dropTables } from '../Functions/DatabaseFunctions'
import { navigate } from '../lib/Navigation'
import { getNpub } from '../lib/nostr/Nip19'
import { getGroups } from '../Functions/DatabaseFunctions/Groups'
import { getList } from '../Functions/DatabaseFunctions/Lists'
import { getETags } from '../Functions/RelayFunctions/Events'
import { decrypt } from '../lib/nostr/Nip04'
import DatabaseModule from '../lib/Native/DatabaseModule'

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
  reloadLists: () => void
  reloadBookmarks: () => void
  publicBookmarks: string[]
  privateBookmarks: string[]
  mutedEvents: string[]
  mutedUsers: string[]
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
  setLnAddress: (value: string) => void
  lnAddress?: string
  setBanner: (banner: string) => void
  banner?: string
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
  reloadLists: () => {},
  reloadBookmarks: () => {},
  logout: () => {},
  setName: () => {},
  setPicture: () => {},
  setAbout: () => {},
  setLnurl: () => {},
  setLnAddress: () => {},
  setNip05: () => {},
  setBanner: () => {},
  publicBookmarks: [],
  privateBookmarks: [],
  mutedEvents: [],
  mutedUsers: [],
}

export const UserContextProvider = ({ children }: UserContextProviderProps): JSX.Element => {
  const { database, loadingDb, init } = useContext(AppContext)
  const { relayPool, relayPoolReady } = useContext(RelayPoolContext)
  const [userState, setUserState] = useState<'loading' | 'access' | 'ready'>('loading')
  const [publicKey, setPublicKey] = useState<string>()
  const [nPub, setNpub] = useState<string>()
  const [nSec, setNsec] = useState<string>()
  const [privateKey, setPrivateKey] = useState<string>()
  const [name, setName] = useState<string>()
  const [picture, setPicture] = useState<string>()
  const [about, setAbout] = useState<string>()
  const [lnurl, setLnurl] = useState<string>()
  const [lnAddress, setLnAddress] = useState<string>()
  const [nip05, setNip05] = useState<string>()
  const [validNip05, setValidNip05] = useState<boolean>()
  const [publicBookmarks, setPublicBookmarks] = useState<string[]>([])
  const [privateBookmarks, setPrivateBookmarks] = useState<string[]>([])
  const [mutedEvents, setMutedEvents] = useState<string[]>([])
  const [mutedUsers, setMutedUsers] = useState<string[]>([])
  const [banner, setBanner] = useState<string>()

  const reloadUser: () => void = () => {
    if (database && publicKey) {
      getUser(publicKey, database).then((result) => {
        if (result) {
          setName(result.name)
          setPicture(result.picture)
          setAbout(result.about)
          setLnurl(result.lnurl)
          setLnAddress(result.ln_address)
          setNip05(result.nip05)
          setValidNip05(result.valid_nip05)
          setBanner(result.banner)
        }
      })
    }
  }

  const decryptBookmarks: (content: string) => void = async (content) => {
    if (privateKey && publicKey && content && content !== '') {
      const privateJson = decrypt(privateKey, publicKey, content)
      const privateList: string[][] = JSON.parse(privateJson)
      setPrivateBookmarks(privateList.map((tag) => tag[1]))
    }
  }

  const reloadBookmarks: () => void = () => {
    if (database && publicKey && privateKey) {
      getList(database, 10003, publicKey).then((result) => {
        if (result) {
          const eTags = getETags(result)
          setPublicBookmarks(eTags.map((tag) => tag[1]))
          decryptBookmarks(result.content)
        }
      })
    }
  }

  const reloadLists: () => void = () => {
    if (database && publicKey && privateKey) {
      getList(database, 10000, publicKey).then((result) => {
        if (result) {
          const eTags = getETags(result)
          setMutedUsers(eTags.map((tag) => tag[1]))
        }
      })
      getList(database, 30001, publicKey, 'mute').then((result) => {
        if (result) {
          const eTags = getETags(result)
          setMutedEvents(eTags.map((tag) => tag[1]))
        }
      })
    }
  }

  const logout: () => void = () => {
    if (database) {
      relayPool?.unsubscribeAll()
      relayPool?.removeAll()
      setPrivateKey(undefined)
      setPublicKey(undefined)
      setNpub(undefined)
      setNsec(undefined)
      setName(undefined)
      setPicture(undefined)
      setAbout(undefined)
      setLnurl(undefined)
      setLnAddress(undefined)
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
      setNsec(nip19.nsecEncode(privateKey))
      setPublicKey(getPublicKey(privateKey))
    }
  }, [privateKey])

  useEffect(() => {
    if (publicKey && publicKey !== '') {
      SInfo.setItem('publicKey', publicKey, {})
      setNpub(getNpub(publicKey))
      reloadUser()
      reloadLists()
      reloadBookmarks()
    }
  }, [publicKey])

  useEffect(() => {
    if (userState === 'ready' && publicKey && relayPoolReady && database) {
      getGroups(database).then((results) => {
        if (results.length === 0) {
          DatabaseModule.addGroup(
            '8d37308d97356600f67a28039d598a52b8c4fa1b73ef6f2e7b7d40197c3afa56',
            'Nostros',
            '645681b9d067b1a362c4bee8ddff987d2466d49905c26cb8fec5e6fb73af5c84',
            () => {},
          )
        }
      })
      navigate('Feed')
    }
  }, [userState, publicKey, relayPoolReady])

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
        reloadLists,
        reloadBookmarks,
        publicBookmarks,
        privateBookmarks,
        mutedEvents,
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
        lnAddress,
        setLnAddress,
        mutedUsers,
        banner,
        setBanner
      }}
    >
      {children}
    </UserContext.Provider>
  )
}

export const UserContext = React.createContext(initialUserContext)
