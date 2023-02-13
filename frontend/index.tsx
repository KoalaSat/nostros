import React from 'react'
import { AppContextProvider } from './Contexts/AppContext'
import { RelayPoolContextProvider } from './Contexts/RelayPoolContext'
import { I18nextProvider } from 'react-i18next'
import {
  NavigationContainer,
  DefaultTheme as NavigationDefaultTheme,
  DarkTheme as NavigationDarkTheme,
} from '@react-navigation/native'
import {
  adaptNavigationTheme,
  Provider as PaperProvider,
  MD3DarkTheme,
  MD3LightTheme,
} from 'react-native-paper'
import merge from 'deepmerge'
import { SafeAreaProvider, SafeAreaInsetsContext } from 'react-native-safe-area-context'
import i18n from './i18n.config'
import nostrosDarkTheme from './Constants/Theme/theme-dark.json'
import { navigationRef } from './lib/Navigation'
import { UserContextProvider } from './Contexts/UserContext'
import NostrosDrawerNavigator from './Pages/NostrosDrawerNavigator'

export const Frontend: React.FC = () => {
  const { LightTheme, DarkTheme } = adaptNavigationTheme({
    reactNavigationLight: NavigationDefaultTheme,
    reactNavigationDark: NavigationDarkTheme,
  })

  const CombinedDefaultTheme = React.useMemo(() => merge(MD3LightTheme, LightTheme), [])
  const CombinedDarkTheme = React.useMemo(() => merge(MD3DarkTheme, DarkTheme), [])

  // TODO: Light theme
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const NostrosDefaultTheme = React.useMemo(() => merge(CombinedDefaultTheme, nostrosDarkTheme), [])
  const NostrosDarkTheme = React.useMemo(() => merge(CombinedDarkTheme, nostrosDarkTheme), [])

  return (
    <PaperProvider theme={NostrosDarkTheme}>
      <NavigationContainer theme={NostrosDarkTheme} ref={navigationRef}>
        <SafeAreaProvider>
          <I18nextProvider i18n={i18n}>
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
          </I18nextProvider>
        </SafeAreaProvider>
      </NavigationContainer>
    </PaperProvider>
  )
}

export default Frontend
