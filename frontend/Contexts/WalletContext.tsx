import { getUnixTime } from 'date-fns'
import React, { useEffect, useState } from 'react'
import SInfo from 'react-native-sensitive-info'
import type WalletAction from '../lib/Lightning'
import LnBits, { type LnBitsConfig } from '../lib/Lightning/LnBits'
import LndHub, { type LndHubConfig } from '../lib/Lightning/LndHub'

export interface WalletContextProps {
  type?: string
  setType: (type: string) => void
  updatedAt?: string
  lndHub?: LndHubConfig | LnBitsConfig
  balance?: number
  transactions: WalletAction[]
  invoices: WalletAction[]
  updateWallet: () => Promise<void>
  refreshWallet: (params?: object, type?: string) => void
  payInvoice: (invoice: string) => Promise<boolean>
  logoutWallet: () => void
}

export interface WalletContextProviderProps {
  children: React.ReactNode
}

export const initialWalletContext: WalletContextProps = {
  transactions: [],
  invoices: [],
  setType: () => {},
  updateWallet: async () => {},
  refreshWallet: () => {},
  payInvoice: async () => false,
  logoutWallet: () => {},
}

export const WalletContextProvider = ({ children }: WalletContextProviderProps): JSX.Element => {
  const [type, setType] = React.useState<string>()
  const [config, setConfig] = useState<LndHubConfig | LnBitsConfig>()
  const [balance, setBalance] = useState<number>()
  const [updatedAt, setUpdatedAt] = useState<string>()
  const [transactions, setTransactions] = useState<WalletAction[]>(
    initialWalletContext.transactions,
  )
  const [invoices, setInvoices] = useState<WalletAction[]>(initialWalletContext.invoices)

  useEffect(() => {
    SInfo.getItem('lndHub', {}).then((value) => {
      if (value) {
        setConfig(JSON.parse(value))
        setType('lndHub')
      }
    })
    SInfo.getItem('lnBits', {}).then((value) => {
      if (value) {
        setConfig(JSON.parse(value))
        setType('lnBits')
      }
    })
  }, [])

  useEffect(() => {
    if (config && type) updateWallet()
  }, [config, type])

  const getClient: (params?: any, clientType?: string) => LndHub | LnBits | undefined = (
    params,
    clientType,
  ) => {
    const kind = clientType ?? type
    let client
    if (kind === 'lndHub') {
      client = new LndHub(params ?? config)
    } else if (kind === 'lnBits') {
      client = new LnBits(params ?? config)
    }

    return client
  }

  const refreshWallet: (params?: any, clientType?: string) => void = (params, clientType) => {
    setConfig(undefined)
    if (clientType) {
      setType(clientType)
      const client = getClient(params, clientType)
      if (client) {
        client.refresh(params).then((response) => {
          if (response?.status === 200) setConfig(response.config)
        })
      }
    }
  }

  const updateWallet: () => Promise<void> = async () => {
    if (!config || !type) return

    const client = getClient()
    if (client) {
      client.getBalance().then((response) => {
        if (response?.status === 200) {
          setUpdatedAt(`${getUnixTime(new Date())}-balance`)
          setBalance(response.balance)
          SInfo.setItem(type, JSON.stringify(client.config), {})
        } else if (response?.status === 401) {
          refreshWallet()
        }
      })

      client.getMovements(setTransactions, setInvoices, setUpdatedAt)
    }
  }

  const payInvoice: (invoice: string) => Promise<boolean> = async (invoice) => {
    if (type && config) {
      const client = new LndHub(config as LndHubConfig)
      const response = await client.payInvoice(invoice)
      if (response?.status === 200) {
        updateWallet()
        return true
      } else if (response?.status === 401) {
        refreshWallet()
        return true
      }
    }

    return false
  }

  const logoutWallet: () => void = () => {
    SInfo.deleteItem('lndHub', {})
    SInfo.deleteItem('lnBits', {})
    setType(undefined)
    setConfig(undefined)
    setBalance(undefined)
    setUpdatedAt(undefined)
    setTransactions([])
    setInvoices([])
  }

  return (
    <WalletContext.Provider
      value={{
        type,
        setType,
        updatedAt,
        balance,
        transactions,
        invoices,
        refreshWallet,
        updateWallet,
        payInvoice,
        logoutWallet,
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}

export const WalletContext = React.createContext(initialWalletContext)
