import App from './frontend'
import { Buffer as SafeBuffer } from 'safe-buffer'
import SQLite from 'react-native-sqlite-storage'

global.Buffer = SafeBuffer

SQLite.DEBUG(true)

export default App
