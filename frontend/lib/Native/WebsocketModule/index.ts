import { NativeModules } from 'react-native'
const { RelayPoolModule } = NativeModules

interface RelayPoolInterface {
  send: (message: string) => void
  connect: (pubKey: string, callback: (eventId: string) => void) => void
  add: (url: string, callback: () => void) => void
  remove: (url: string, callback: () => void) => void
  active: (url: string, callback: () => void) => void
  desactive: (url: string, callback: () => void) => void
  onEventId: (callback: (eventId: string) => void) => void
}

export default RelayPoolModule as RelayPoolInterface
