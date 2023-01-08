import App from './frontend'
import { Buffer as SafeBuffer } from 'safe-buffer'
import 'text-encoding-polyfill'

global.Buffer = SafeBuffer

export default App
