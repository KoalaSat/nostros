import axios from 'axios'
import { getUnixTime } from 'date-fns'
import type WalletAction from '..'

export interface LnBitsConfig {
  lnBitsAddress: string
  lnBitsAdminKey: string
  lnBitsInvoiceKey: string
}

class LndHub {
  constructor(config?: LnBitsConfig) {
    this.config = config
  }

  public config: LnBitsConfig | undefined

  private readonly getHeaders: () => object | undefined = () => {
    if (!this.config) return
    return {
      'X-Api-Key': this.config.lnBitsInvoiceKey,
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
      const response = await axios.post(`${this.config?.lnBitsAddress}/payinvoice`, params, {
        headers: this.getHeaders(),
      })
      if (response) {
        return { status: response.status }
      }
    }
  }

  public getBalance: () => Promise<{ balance?: number; status: number } | undefined> = async () => {
    if (!this.config) return
    const headers = {
      'X-Api-Key': this.config.lnBitsInvoiceKey,
    }
    const response = await axios.get(`${this.config.lnBitsAddress}/api/v1/wallet`, { headers })
    if (response) {
      return {
        balance: (response.data?.balance ?? 0) / 1000,
        status: response.status,
      }
    }
  }

  public getMovements: (
    setTransactions: (transactions: WalletAction[]) => void,
    setInvoices: (invoices: WalletAction[]) => void,
    setUpdatedAt: (updatedAt: string) => void,
  ) => Promise<void> = async (setTransactions, setInvoices, setUpdatedAt) => {
    if (!this.config) return
    const headers = {
      'X-Api-Key': this.config.lnBitsInvoiceKey,
    }
    const response = await axios.get(`${this.config.lnBitsAddress}/api/v1/payments`, { headers })
    if (response) {
      setTransactions(
        response.data
          .filter((item: any) => item.amount < 0)
          .map((item: any) => {
            return {
              id: item.payment_preimage,
              monto: Math.abs(item.amount / 1000),
              type: 'transaction',
              description: item.memo,
              timestamp: item.time,
            }
          }),
      )
      setInvoices(
        response.data
          .filter((item: any) => item.amount > 0)
          .map((item: any) => {
            return {
              id: item.payment_preimage,
              monto: item.amount / 1000,
              type: 'invoice',
              description: item.memo,
              timestamp: item.time,
            }
          }),
      )
      setUpdatedAt(`${getUnixTime(new Date())}-movements`)
    }
  }

  public refresh: (params: any) => Promise<{ config: LnBitsConfig; status: number } | undefined> =
    async (params) => {
      if (params?.lnBitsAddress) {
        return {
          config: params,
          status: 200,
        }
      }
    }
}

export default LndHub
