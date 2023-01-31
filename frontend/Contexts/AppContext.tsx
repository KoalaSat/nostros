import React, { useEffect, useState } from 'react'
import { QuickSQLiteConnection } from 'react-native-quick-sqlite'
import { initDatabase } from '../Functions/DatabaseFunctions'
import SInfo from 'react-native-sensitive-info'
import { Linking, StyleSheet } from 'react-native'
import { Text } from 'react-native-paper'
import { Config } from '../Pages/ConfigPage'
import { imageHostingServices } from '../Constants/Services'
import { randomInt } from '../Functions/NativeFunctions'

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
  imageHostingService: string
  setImageHostingService: (imageHostingService: string) => void
  setSatoshi: (showPublicImages: 'kebab' | 'sats') => void
  getSatoshiSymbol: (fontSize?: number) => JSX.Element
  getImageHostingService: () => string
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
  imageHostingService: Object.keys(imageHostingServices)[0],
  setImageHostingService: () => {},
  getImageHostingService: () => "",
  getSatoshiSymbol: () => <></>,
}

export const AppContextProvider = ({ children }: AppContextProviderProps): JSX.Element => {
  const [showPublicImages, setShowPublicImages] = React.useState<boolean>(
    initialAppContext.showPublicImages,
  )
  const [showSensitive, setShowSensitive] = React.useState<boolean>(initialAppContext.showSensitive)
  const [imageHostingService, setImageHostingService] = React.useState<string>(
    initialAppContext.imageHostingService,
  )
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
        setImageHostingService(
          config.image_hosting_service ?? initialAppContext.imageHostingService,
        )
      } else {
        const config: Config = {
          show_public_images: initialAppContext.showPublicImages,
          show_sensitive: initialAppContext.showSensitive,
          image_hosting_service: initialAppContext.imageHostingService,
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

  const getImageHostingService: () => string = () => {
    if (imageHostingService !== 'random') return imageHostingService

    const randomIndex = randomInt(1, Object.keys(imageHostingServices).length)

    return Object.keys(imageHostingServices)[randomIndex - 1]
  }

  useEffect(init, [])

  return (
    <AppContext.Provider
      value={{
        imageHostingService,
        setImageHostingService,
        getImageHostingService,
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
