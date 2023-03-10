import { NativeModules } from 'react-native'
const { RelayPoolModule } = NativeModules

interface RelayPoolInterface {
  sendAll: (message: string, globalFeed: boolean) => void
  sendRelay: (message: string, relayUrl: string) => void
  connect: (pubKey: string, callback: (eventId: string) => void) => void
  add: (url: string, callback: () => void) => void
  remove: (url: string, callback: () => void) => void
  removeAll: (callback?: () => void) => void
  update: (
    relayUrl: string,
    active: number,
    globalfeed: number,
    paid: number,
    callback?: () => void,
  ) => void
  onEventId: (callback: (eventId: string) => void) => void
}

export default RelayPoolModule as RelayPoolInterface
