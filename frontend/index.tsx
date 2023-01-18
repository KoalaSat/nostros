import React from 'react'
import { AppContextProvider } from './Contexts/AppContext'
import {
  NavigationContainer,
  DefaultTheme as NavigationDefaultTheme,
  DarkTheme as NavigationDarkTheme,
} from '@react-navigation/native'
import { RelayPoolContextProvider } from './Contexts/RelayPoolContext'
import { I18nextProvider } from 'react-i18next'
import { adaptNavigationTheme, Provider as PaperProvider } from 'react-native-paper'
import { SafeAreaProvider, SafeAreaInsetsContext } from 'react-native-safe-area-context'
import i18n from './i18n.config'
import nostrosDarkTheme from './Constants/Theme/theme-dark.json'
import { navigationRef } from './lib/Navigation'
import { UserContextProvider } from './Contexts/UserContext'
import { LogBox } from 'react-native'
import NostrosDrawerNavigator from './Pages/NostrosDrawerNavigator'

LogBox.ignoreAllLogs()

export const Frontend: React.FC = () => {
  const { DarkTheme } = adaptNavigationTheme({
    reactNavigationLight: NavigationDefaultTheme,
    reactNavigationDark: NavigationDarkTheme,
  })
  const CombinedDefaultTheme = React.useMemo(() => {
    return {
      ...DarkTheme,
      ...nostrosDarkTheme,
      colors: {
        ...DarkTheme.colors,
        ...nostrosDarkTheme.colors,
      },
    }
  }, [])

  return (
    <PaperProvider theme={nostrosDarkTheme}>
      <SafeAreaProvider>
        <I18nextProvider i18n={i18n}>
          <NavigationContainer theme={CombinedDefaultTheme} ref={navigationRef}>
            <AppContextProvider>
              <UserContextProvider>
                <RelayPoolContextProvider>
                  <React.Fragment>
                    <SafeAreaInsetsContext.Consumer>
                      {() => <NostrosDrawerNavigator />}
                    </SafeAreaInsetsContext.Consumer>
                  </React.Fragment>
                </RelayPoolContextProvider>
              </UserContextProvider>
            </AppContextProvider>
          </NavigationContainer>
        </I18nextProvider>
      </SafeAreaProvider>
    </PaperProvider>
  )
}

export default Frontend
