import React, { useEffect, useState } from 'react'
import { QuickSQLiteConnection } from 'react-native-quick-sqlite'
import { initDatabase } from '../Functions/DatabaseFunctions'
import SInfo from 'react-native-sensitive-info'
import { Linking, StyleSheet } from 'react-native'
import { Config } from '../Functions/DatabaseFunctions/Config'
import { Text } from 'react-native-paper'

export interface AppContextProps {
  init: () => void
  loadingDb: boolean
  database: QuickSQLiteConnection | null
  notificationSeenAt: number
  setNotificationSeenAt: (unix: number) => void
  showPublicImages: boolean
  setShowPublicImages: (showPublicImages: boolean) => void
  showSensitive: boolean
  setShowSensitive: (showPublicImages: boolean) => void
  satoshi: 'kebab' | 'sats'
  setSatoshi: (showPublicImages: 'kebab' | 'sats') => void
  getSatoshiSymbol: (fontSize?: number) => JSX.Element
}

export interface AppContextProviderProps {
  children: React.ReactNode
}

export const initialAppContext: AppContextProps = {
  init: () => {},
  loadingDb: true,
  database: null,
  notificationSeenAt: 0,
  setNotificationSeenAt: () => {},
  showPublicImages: false,
  setShowPublicImages: () => {},
  showSensitive: false,
  setShowSensitive: () => {},
  satoshi: 'kebab',
  setSatoshi: () => {},
  getSatoshiSymbol: () => <></>,
}

export const AppContextProvider = ({ children }: AppContextProviderProps): JSX.Element => {
  const [showPublicImages, setShowPublicImages] = React.useState<boolean>(
    initialAppContext.showPublicImages,
  )
  const [showSensitive, setShowSensitive] = React.useState<boolean>(initialAppContext.showSensitive)
  const [notificationSeenAt, setNotificationSeenAt] = React.useState<number>(0)
  const [satoshi, setSatoshi] = React.useState<'kebab' | 'sats'>(initialAppContext.satoshi)
  const [database, setDatabase] = useState<QuickSQLiteConnection | null>(null)
  const [loadingDb, setLoadingDb] = useState<boolean>(initialAppContext.loadingDb)

  const init: () => void = () => {
    const db = initDatabase()
    setDatabase(db)

    SInfo.getItem('publicKey', {}).then((value) => {
      setLoadingDb(false)
    })

    SInfo.getItem('config', {}).then((result) => {
      const config: Config = JSON.parse(result)
      if (result) {
        setShowPublicImages(config.show_public_images ?? initialAppContext.showPublicImages)
        setShowSensitive(config.show_sensitive ?? initialAppContext.showSensitive)
        setSatoshi(config.satoshi)
        setNotificationSeenAt(config.last_notification_seen_at ?? 0)
      } else {
        const config: Config = {
          show_public_images: initialAppContext.showPublicImages,
          show_sensitive: initialAppContext.showSensitive,
          satoshi: initialAppContext.satoshi,
          last_notification_seen_at: 0,
          last_pets_at: 0,
        }
        SInfo.setItem('config', JSON.stringify(config), {})
      }
    })
    Linking.addEventListener('url', (event) => {
      console.log(event.url)
    })
  }

  const getSatoshiSymbol: (fontSize?: number) => JSX.Element = (fontSize) => {
    return satoshi === 'sats' ? (
      <Text>Sats</Text>
    ) : (
      <Text style={[styles.satoshi, { fontSize }]}>s</Text>
    )
  }

  useEffect(init, [])

  return (
    <AppContext.Provider
      value={{
        init,
        loadingDb,
        database,
        notificationSeenAt,
        setNotificationSeenAt,
        showPublicImages,
        setShowPublicImages,
        showSensitive,
        setShowSensitive,
        satoshi,
        setSatoshi,
        getSatoshiSymbol,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

const styles = StyleSheet.create({
  satoshi: {
    fontFamily: 'Satoshi-Symbol',
  },
})

export const AppContext = React.createContext(initialAppContext)
