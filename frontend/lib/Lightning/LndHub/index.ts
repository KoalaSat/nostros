import axios from 'axios'
import { getUnixTime } from 'date-fns'
import type WalletAction from '..'

export interface LndHubConfig {
  accessToken: string
  refreshToken: string
  url: string
}

class LndHub {
  constructor(config?: LndHubConfig) {
    this.config = config
  }

  public config: LndHubConfig | undefined

  private readonly getHeaders: () => object | undefined = () => {
    if (!this.config) return
    return {
      Authorization: `Bearer ${this.config.accessToken}`,
    }
  }

  public payInvoice: (invoice: string) => Promise<{ status: number } | undefined> = async (
    invoice,
  ) => {
    if (!this.config) return
    if (invoice && invoice !== '') {
      const params = {
        invoice,
      }
      const response = await axios.post(`${this.config?.url}/payinvoice`, params, {
        headers: this.getHeaders(),
      })
      if (response) {
        return { status: response.status }
      }
    }
  }

  public getBalance: () => Promise<{ balance?: number; status: number } | undefined> = async () => {
    if (!this.config) return
    const response = await axios.get(`${this.config.url}/balance`, { headers: this.getHeaders() })
    if (response) {
      return {
        balance: response.data?.BTC?.AvailableBalance ?? 0,
        status: response.status,
      }
    }
  }

  private readonly getTransactions: () => Promise<WalletAction[] | undefined> = async () => {
    if (!this.config) return
    const response = await axios.get(`${this.config.url}/gettxs`, { headers: this.getHeaders() })
    if (response) {
      return response.data.map((item: any) => {
        return {
          id: item.payment_preimage,
          monto: item.value,
          type: 'transaction',
          description: item.memo,
          timestamp: item.timestamp,
        }
      })
    }
  }

  private readonly getInvoices: () => Promise<WalletAction[] | undefined> = async () => {
    if (!this.config) return
    const response = await axios.get(`${this.config.url}/getuserinvoices`, {
      headers: this.getHeaders(),
    })
    if (response) {
      return response.data
        .filter((item: any) => item.ispaid)
        .map((item: any) => {
          return {
            id: item.payment_hash,
            monto: item.amt,
            type: 'invoice',
            description: item.description,
            timestamp: item.timestamp,
          }
        })
    }
  }

  public getMovements: (
    setTransactions: (transactions: WalletAction[]) => void,
    setInvoices: (transactions: WalletAction[]) => void,
    setUpdatedAt: (updatedAt: string) => void,
  ) => Promise<void> = async (setTransactions, setInvoices, setUpdatedAt) => {
    if (!this.config) return
    setTransactions((await this.getTransactions()) ?? [])
    setInvoices((await this.getInvoices()) ?? [])
    setUpdatedAt(`${getUnixTime(new Date())}-movements`)
  }

  public refresh: (params: any) => Promise<{ config: LndHubConfig; status: number } | undefined> =
    async (params) => {
      let requestParams:
        | { type: string; refresh_token?: string; login?: string; password?: string }
        | undefined
      if (this.config?.refreshToken) {
        requestParams = {
          type: 'refresh_token',
          refresh_token: this.config?.refreshToken,
        }
        params.uri = this.config?.url
      } else if (params.login !== '' && params.password !== '' && params.uri !== '') {
        requestParams = {
          type: 'auth',
          login: params.login,
          password: params.password,
        }
      }
      if (params?.uri) {
        const response = await axios.post(`${params.uri}/auth`, {}, { params: requestParams })
        if (response) {
          return {
            config: {
              accessToken: response.data.access_token,
              refreshToken: response.data.refresh_token,
              url: params.uri,
            },
            status: response.status,
          }
        }
      }
    }
}

export default LndHub
