import React, { useEffect, useState } from 'react'
import { QuickSQLiteConnection } from 'react-native-quick-sqlite'
import { initDatabase } from '../Functions/DatabaseFunctions'
import SInfo from 'react-native-sensitive-info'

export interface AppContextProps {
  init: () => void
  loadingDb: boolean
  database: QuickSQLiteConnection | null
}

export interface AppContextProviderProps {
  children: React.ReactNode
}

export const initialAppContext: AppContextProps = {
  init: () => {},
  loadingDb: true,
  database: null,
}

export const AppContextProvider = ({ children }: AppContextProviderProps): JSX.Element => {
  const [database, setDatabase] = useState<QuickSQLiteConnection | null>(null)
  const [loadingDb, setLoadingDb] = useState<boolean>(initialAppContext.loadingDb)

  const init: () => void = () => {
    const db = initDatabase()
    setDatabase(db)
    SInfo.getItem('publicKey', {}).then((value) => {
      setLoadingDb(false)
    })
  }

  useEffect(init, [])

  return (
    <AppContext.Provider
      value={{
        init,
        loadingDb,
        database,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export const AppContext = React.createContext(initialAppContext)
