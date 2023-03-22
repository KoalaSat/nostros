export interface WalletAction {
  id: string
  monto: number
  type: 'invoice' | 'transaction'
  description: string
  timestamp: number
}

export default WalletAction
