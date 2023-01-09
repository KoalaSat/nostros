import App from './frontend'
import { Buffer as SafeBuffer } from 'safe-buffer'
import { randomBytes } from '@noble/hashes/utils'
import 'text-encoding-polyfill'

global.Buffer = SafeBuffer
global.randomBytes = randomBytes

export default App
