/**
 * @format
 */

import { AppRegistry } from 'react-native'
import App from './App'
import { name as appName } from './app.json'

// FIXME: https://github.com/facebook/react-native/issues/30034#issuecomment-1277360480
import ViewReactNativeStyleAttributes from 'react-native/Libraries/Components/View/ReactNativeStyleAttributes'
ViewReactNativeStyleAttributes.scaleY = true

AppRegistry.registerComponent(appName, () => App)
