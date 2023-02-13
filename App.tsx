import App from './frontend'
import { Buffer as SafeBuffer } from 'safe-buffer'
import { randomBytes } from '@noble/hashes/utils'
import 'text-encoding-polyfill'
import 'react-native-gesture-handler'
import { LogBox } from 'react-native'

global.Buffer = SafeBuffer
global.randomBytes = randomBytes

LogBox.ignoreAllLogs()

export default App
