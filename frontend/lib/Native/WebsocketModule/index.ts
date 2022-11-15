import { NativeModules } from 'react-native'
const { RelayPoolModule } = NativeModules

interface RelayPoolInterface {
  send: (message: string) => void
  connect: (pubKey: string, callback: () => void) => void
  add: (url: string, callback: () => void) => void
  remove: (url: string, callback: () => void) => void
}

export default RelayPoolModule as RelayPoolInterface
