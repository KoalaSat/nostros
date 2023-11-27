import React, { useEffect, useRef, useState } from 'react'
import { type QuickSQLiteConnection } from 'react-native-quick-sqlite'
import { initDatabase } from '../Functions/DatabaseFunctions'
import SInfo from 'react-native-sensitive-info'
import { AppState, Linking, NativeModules, Platform, StyleSheet } from 'react-native'
import { Text } from 'react-native-paper'
import { imageHostingServices } from '../Constants/Services'
import { randomInt, validNip21 } from '../Functions/NativeFunctions'
import Clipboard from '@react-native-clipboard/clipboard'
import i18next from 'i18next'

export interface Config {
  satoshi: 'kebab' | 'sats'
  show_public_images: boolean
  show_sensitive: boolean
  last_notification_seen_at: number
  last_pets_at: number
  image_hosting_service: string
  language: string
  relay_coloruring: boolean
  long_press_zap: number | undefined
  sign_height: boolean
}

export interface AppContextProps {
  init: () => void
  loadingDb: boolean
  database: QuickSQLiteConnection | null
  notificationSeenAt: number
  setNotificationSeenAt: (unix: number) => void
  language: string
  setLanguage: (language: string) => void
  showPublicImages: boolean
  setShowPublicImages: (showPublicImages: boolean) => void
  relayColouring: boolean
  setRelayColouring: (relayColouring: boolean) => void
  showSensitive: boolean
  setShowSensitive: (showPublicImages: boolean) => void
  satoshi: 'kebab' | 'sats'
  imageHostingService: string
  setImageHostingService: (imageHostingService: string) => void
  setSatoshi: (showPublicImages: 'kebab' | 'sats') => void
  getSatoshiSymbol: (fontSize?: number) => JSX.Element
  getImageHostingService: () => string
  clipboardNip21?: string
  setClipboardNip21: (clipboardNip21: string | undefined) => void
  checkClipboard: () => void
  displayUserDrawer?: string
  setDisplayUserDrawer: (displayUserDrawer: string | undefined) => void
  displayNoteDrawer?: string
  refreshBottomBarAt?: number
  setRefreshBottomBarAt: (refreshBottomBarAt: number) => void
  longPressZap?: number | undefined
  setLongPressZap: (longPressZap: number | undefined) => void
  pushedTab?: string
  setPushedTab: (pushedTab: string) => void
  qrReader?: string
  setQrReader: (qrReader: string | undefined) => void
  signHeight: boolean
  setSignWithHeight: (signHeight: boolean) => void
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
  refreshBottomBarAt: 0,
  setRefreshBottomBarAt: () => {},
  showPublicImages: false,
  setShowPublicImages: () => {},
  language:
    (Platform.OS === 'ios'
      ? NativeModules.SettingsManager.settings.AppleLocale
      : NativeModules.I18nManager.localeIdentifier
    )?.split('_')[0] ?? 'en',
  setLanguage: () => {},
  showSensitive: false,
  setRelayColouring: () => {},
  relayColouring: true,
  setShowSensitive: () => {},
  satoshi: 'kebab',
  setSatoshi: () => {},
  checkClipboard: () => {},
  imageHostingService: 'random',
  setImageHostingService: () => {},
  setQrReader: () => {},
  pushedTab: 'random',
  setPushedTab: () => {},
  getImageHostingService: () => '',
  getSatoshiSymbol: () => <></>,
  setClipboardNip21: () => {},
  setDisplayUserDrawer: () => {},
  longPressZap: undefined,
  setLongPressZap: () => {},
  signHeight: false,
  setSignWithHeight: () => {}
}

export const AppContextProvider = ({ children }: AppContextProviderProps): JSX.Element => {
  const currentState = useRef(AppState.currentState)
  const [appState, setAppState] = useState(currentState.current)
  const [qrReader, setQrReader] = useState<string>()
  const [showPublicImages, setShowPublicImages] = React.useState<boolean>(
    initialAppContext.showPublicImages,
  )
  const [showSensitive, setShowSensitive] = React.useState<boolean>(initialAppContext.showSensitive)
  const [relayColouring, setRelayColouring] = React.useState<boolean>(
    initialAppContext.relayColouring,
  )
  const [language, setLanguage] = React.useState<string>(initialAppContext.language)
  const [imageHostingService, setImageHostingService] = React.useState<string>(
    initialAppContext.imageHostingService,
  )
  const [longPressZap, setLongPressZap] = React.useState<number>()
  const [notificationSeenAt, setNotificationSeenAt] = React.useState<number>(0)
  const [refreshBottomBarAt, setRefreshBottomBarAt] = React.useState<number>(0)
  const [satoshi, setSatoshi] = React.useState<'kebab' | 'sats'>(initialAppContext.satoshi)
  const [database, setDatabase] = useState<QuickSQLiteConnection | null>(null)
  const [loadingDb, setLoadingDb] = useState<boolean>(initialAppContext.loadingDb)
  const [clipboardLoads, setClipboardLoads] = React.useState<string[]>([])
  const [clipboardNip21, setClipboardNip21] = React.useState<string>()
  const [displayUserDrawer, setDisplayUserDrawer] = React.useState<string>()
  const [pushedTab, setPushedTab] = useState<string>()
  const [signHeight, setSignWithHeight] = useState<boolean>(initialAppContext.signHeight)

  useEffect(() => {
    if (pushedTab) setPushedTab(undefined)
  }, [pushedTab])

  useEffect(() => {
    const handleChange = AppState.addEventListener('change', (changedState) => {
      currentState.current = changedState
      setAppState(currentState.current)
    })

    return () => {
      handleChange.remove()
    }
  }, [])

  useEffect(() => {
    if (appState === 'active') {
      checkClipboard()
    }
  }, [appState])

  useEffect(() => {
    i18next.changeLanguage(language)
  }, [language])

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
        setLanguage(config.language ?? initialAppContext.language)
        setLongPressZap(config.long_press_zap ?? initialAppContext.longPressZap)
        setRelayColouring(config.relay_coloruring ?? initialAppContext.relayColouring)
        setSignWithHeight(config.sign_height ?? initialAppContext.signHeight)
      } else {
        const config: Config = {
          show_public_images: initialAppContext.showPublicImages,
          show_sensitive: initialAppContext.showSensitive,
          image_hosting_service: initialAppContext.imageHostingService,
          satoshi: initialAppContext.satoshi,
          last_notification_seen_at: 0,
          last_pets_at: 0,
          language: initialAppContext.language,
          relay_coloruring: initialAppContext.relayColouring,
          long_press_zap: initialAppContext.longPressZap,
          sign_height: initialAppContext.signHeight,
        }
        SInfo.setItem('config', JSON.stringify(config), {})
      }
    })
    Linking.addEventListener('url', (event) => {
      if (validNip21(event?.url)) {
        setClipboardNip21(event.url)
      }
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

  const checkClipboard: () => void = () => {
    if (Clipboard.hasString()) {
      Clipboard.getString().then((clipboardContent) => {
        if (validNip21(clipboardContent) && !clipboardLoads.includes(clipboardContent)) {
          setClipboardLoads((prev) => [...prev, clipboardContent])
          setClipboardNip21(clipboardContent)
        }
      })
    }
  }

  useEffect(init, [])

  return (
    <AppContext.Provider
      value={{
        relayColouring,
        setRelayColouring,
        displayUserDrawer,
        setDisplayUserDrawer,
        language,
        setLanguage,
        checkClipboard,
        clipboardNip21,
        setClipboardNip21,
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
        refreshBottomBarAt,
        setRefreshBottomBarAt,
        pushedTab,
        setPushedTab,
        longPressZap,
        setLongPressZap,
        qrReader,
        setQrReader,
        signHeight,
        setSignWithHeight
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
