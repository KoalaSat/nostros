import App from './frontend'
import { Buffer as SafeBuffer } from 'safe-buffer'

global.Buffer = SafeBuffer

export default App
