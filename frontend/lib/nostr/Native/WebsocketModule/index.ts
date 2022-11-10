import { NativeModules } from 'react-native'
const { WebsocketModule } = NativeModules

interface WebsocketInterface {
  connectWebsocket: (callback: (message: string) => void) => void
  send: (message: string) => void
}

export default WebsocketModule as WebsocketInterface
