import axios from 'axios'
import { getUnixTime } from 'date-fns'
import React, { useEffect, useState } from 'react'
import SInfo from 'react-native-sensitive-info'

export interface LndHub {
  accessToken: string
  refreshToken: string
  url: string
}

export interface WalletAction {
  id: string
  monto: number
  type: 'invoice' | 'transaction'
  description: string
  timestamp: number
}

export interface WalletContextProps {
  active: boolean
  updatedAt?: number
  lndHub?: LndHub
  setLndHub: (lndHub: LndHub) => void
  balance?: number
  transactions: WalletAction[]
  invoices: WalletAction[]
  refreshLndHub: (login?: string, password?: string, uri?: string) => void
  payInvoice: (invoice: string) => Promise<boolean>
  logoutWallet: () => void
}

export interface WalletContextProviderProps {
  children: React.ReactNode
}

export const initialWalletContext: WalletContextProps = {
  active: false,
  setLndHub: () => {},
  transactions: [],
  invoices: [],
  refreshLndHub: () => {},
  payInvoice: async () => false,
  logoutWallet: () => {},
}

export const WalletContextProvider = ({ children }: WalletContextProviderProps): JSX.Element => {
  const [active, setActive] = React.useState<boolean>(initialWalletContext.active)
  const [lndHub, setLndHub] = useState<LndHub>()
  const [balance, setBalance] = useState<number>()
  const [updatedAt, setUpdatedAt] = useState<string>()
  const [transactions, setTransactions] = useState<WalletAction[]>(
    initialWalletContext.transactions,
  )
  const [invoices, setInvoices] = useState<WalletAction[]>(initialWalletContext.invoices)

  useEffect(() => {
    SInfo.getItem('lndHub', {}).then((value) => {
      if (value) {
        setLndHub(JSON.parse(value))
      }
    })
  }, [])

  const refreshLndHub: (login?: string, password?: string, uri?: string) => void = (
    login,
    password,
    uri,
  ) => {
    setLndHub(undefined)
    let params:
      | { type: string; refresh_token?: string; login?: string; password?: string }
      | undefined
    if (lndHub?.refreshToken) {
      params = {
        type: 'refresh_token',
        refresh_token: lndHub?.refreshToken,
      }
      uri = lndHub?.url
    } else if (login !== '' && password !== '' && uri !== '') {
      params = {
        type: 'auth',
        login,
        password,
      }
    }
    if (params && uri) {
      axios.post(`${uri}/auth`, {}, { params }).then((response) => {
        if (response?.data?.refresh_token && response.data?.access_token && uri) {
          setLndHub({
            accessToken: response.data.access_token,
            refreshToken: response.data.refresh_token,
            url: uri,
          })
        }
      })
    }
  }

  const updateLndHub: () => void = () => {
    if (!lndHub) return

    const headers = {
      Authorization: `Bearer ${lndHub.accessToken}`,
    }

    axios.get(`${lndHub.url}/balance`, { headers }).then((response) => {
      if (response) {
        if (response.status === 200) {
          setUpdatedAt(`${getUnixTime(new Date())}-balance`)
          setBalance(response.data?.BTC?.AvailableBalance ?? 0)
          SInfo.setItem('lndHub', JSON.stringify(lndHub), {})
          setActive(true)
        } else if (response.status === 401) {
          refreshLndHub()
        }
      }
    })
    axios.get(`${lndHub.url}/gettxs`, { headers }).then((response) => {
      if (response) {
        setTransactions(
          response.data.map((item: any) => {
            return {
              id: item.payment_preimage,
              monto: item.value,
              type: 'transaction',
              description: item.memo,
              timestamp: item.timestamp,
            }
          }),
        )
        setUpdatedAt(`${getUnixTime(new Date())}-gettxs`)
      }
    })
    axios.get(`${lndHub.url}/getuserinvoices`, { headers }).then((response) => {
      if (response) {
        setInvoices(
          response.data
            .filter((item: any) => item.ispaid)
            .map((item: any) => {
              return {
                id: item.payment_hash,
                monto: item.amt,
                type: 'invoice',
                description: item.description,
                timestamp: item.timestamp,
              }
            }),
        )
        setUpdatedAt(`${getUnixTime(new Date())}-getuserinvoices`)
      }
    })
  }

  useEffect(updateLndHub, [lndHub])

  const payInvoice: (invoice: string) => Promise<boolean> = async (invoice) => {
    if (active && invoice && invoice !== '') {
      const headers = {
        Authorization: `Bearer ${lndHub?.accessToken}`,
      }
      const params = {
        invoice,
      }
      const response = await axios.post(`${lndHub?.url}/payinvoice`, params, { headers })
      if (response) {
        if (response.status === 200) {
          updateLndHub()
          return response?.data?.payment_error === ''
        } else if (response.status === 401) {
          refreshLndHub()
        }
      }
    }

    return false
  }

  const logoutWallet: () => void = () => {
    SInfo.deleteItem('lndHub', {})
    setActive(false)
    setLndHub(undefined)
    setBalance(undefined)
    setUpdatedAt(undefined)
    setTransactions([])
    setInvoices([])
  }

  return (
    <WalletContext.Provider
      value={{
        active,
        updatedAt,
        setLndHub,
        balance,
        transactions,
        invoices,
        refreshLndHub,
        payInvoice,
        logoutWallet,
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}

export const WalletContext = React.createContext(initialWalletContext)
