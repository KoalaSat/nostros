import React, { useEffect, useState } from 'react'
import { QuickSQLiteConnection } from 'react-native-quick-sqlite'
import { initDatabase } from '../Functions/DatabaseFunctions'
import SInfo from 'react-native-sensitive-info'
import { BackHandler } from 'react-native'

export interface AppContextProps {
  page: string
  goToPage: (path: string, root?: boolean) => void
  goBack: () => void
  getActualPage: () => string
  init: () => void
  loadingDb: boolean
  database: QuickSQLiteConnection | null
}

export interface AppContextProviderProps {
  children: React.ReactNode
}

export const initialAppContext: AppContextProps = {
  page: '',
  init: () => {},
  goToPage: () => {},
  getActualPage: () => '',
  goBack: () => {},
  loadingDb: true,
  database: null,
}

export const AppContextProvider = ({ children }: AppContextProviderProps): JSX.Element => {
  const [page, setPage] = useState<string>(initialAppContext.page)
  const [database, setDatabase] = useState<QuickSQLiteConnection | null>(null)
  const [loadingDb, setLoadingDb] = useState<boolean>(initialAppContext.loadingDb)

  const init: () => void = () => {
    const db = initDatabase()
    setDatabase(db)
    SInfo.getItem('privateKey', {}).then(() => {
      setLoadingDb(false)
    })
  }

  useEffect(init, [])

  useEffect(() => {
    BackHandler.addEventListener('hardwareBackPress', () => {
      goBack()
      return true
    })
  }, [page])

  const goToPage: (path: string, root?: boolean) => void = (path, root) => {
    if (page !== '' && !root) {
      setPage(`${page}%${path}`)
    } else {
      setPage(path)
    }
  }

  const goBack: () => void = () => {
    const breadcrump = page.split('%')
    if (breadcrump.length > 1) {
      setPage(breadcrump.slice(0, -1).join('%'))
    }
  }

  const getActualPage: () => string = () => {
    const breadcrump = page.split('%')
    return breadcrump[breadcrump.length - 1]
  }

  return (
    <AppContext.Provider
      value={{
        page,
        init,
        goToPage,
        goBack,
        getActualPage,
        loadingDb,
        database,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export const AppContext = React.createContext(initialAppContext)
