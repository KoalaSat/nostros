import App from './frontend'
import { Buffer as SafeBuffer } from 'safe-buffer'
// import SQLite from 'react-native-sqlite-storage'

// SQLite.DEBUG(true)

global.Buffer = SafeBuffer

export default App
