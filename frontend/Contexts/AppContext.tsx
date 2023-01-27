import React, { useEffect, useState } from 'react'
import { QuickSQLiteConnection } from 'react-native-quick-sqlite'
import { initDatabase } from '../Functions/DatabaseFunctions'
import SInfo from 'react-native-sensitive-info'
import { Linking, StyleSheet } from 'react-native'
import { Config, getConfig, updateConfig } from '../Functions/DatabaseFunctions/Config'
import { Text } from 'react-native-paper'

export interface AppContextProps {
  init: () => void
  loadingDb: boolean
  database: QuickSQLiteConnection | null
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
  const [satoshi, setSatoshi] = React.useState<'kebab' | 'sats'>(initialAppContext.satoshi)
  const [database, setDatabase] = useState<QuickSQLiteConnection | null>(null)
  const [loadingDb, setLoadingDb] = useState<boolean>(initialAppContext.loadingDb)

  const init: () => void = () => {
    const db = initDatabase()
    setDatabase(db)
    SInfo.getItem('publicKey', {}).then((value) => {
      setLoadingDb(false)
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

  useEffect(() => {
    if (database) {
      getConfig(database).then((result) => {
        if (result) {
          setShowPublicImages(result.show_public_images ?? initialAppContext.showPublicImages)
          setShowSensitive(result.show_sensitive ?? initialAppContext.showSensitive)
          setSatoshi(result.satoshi)
        }
      })
    }
  }, [database])

  useEffect(() => {
    if (database) {
      const config: Config = {
        show_public_images: showPublicImages,
        show_sensitive: showSensitive,
        satoshi,
      }
      updateConfig(config, database)
    }
  }, [database])

  return (
    <AppContext.Provider
      value={{
        init,
        loadingDb,
        database,
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
