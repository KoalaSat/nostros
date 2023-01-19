import App from './frontend'
import { Buffer as SafeBuffer } from 'safe-buffer'
import { randomBytes } from '@noble/hashes/utils'
import 'text-encoding-polyfill'
import 'react-native-gesture-handler'
import { NativeModules } from 'react-native'
import moment from 'moment'
import 'moment/src/locale/en-gb'
import 'moment/src/locale/es'
import 'moment/src/locale/ru'

global.Buffer = SafeBuffer
global.randomBytes = randomBytes

const deviceLocale = NativeModules.I18nManager.localeIdentifier?.split('_')[0] ?? 'en'
moment.locale([deviceLocale])

export default App
