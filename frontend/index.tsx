import React from 'react'
import { AppContextProvider } from './Contexts/AppContext'
import {
  InitialState,
  NavigationContainer,
  DefaultTheme as NavigationDefaultTheme,
  DarkTheme as NavigationDarkTheme,
} from '@react-navigation/native'
import { createDrawerNavigator } from '@react-navigation/drawer'
import { RelayPoolContextProvider } from './Contexts/RelayPoolContext'
import { I18nextProvider } from 'react-i18next'
import { adaptNavigationTheme, Provider as PaperProvider } from 'react-native-paper'
import { SafeAreaProvider, SafeAreaInsetsContext } from 'react-native-safe-area-context'
import i18n from './i18n.config'
import nostrosDarkTheme from './Constants/Theme/theme-dark.json'
import { navigationRef } from './lib/Navigation'
import HomeNavigator from './Pages/HomeNavigator'
import MenuItems from './Components/MenuItems'
import FeedNavigator from './Pages/FeedNavigator'

const DrawerNavigator = createDrawerNavigator()

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
              <RelayPoolContextProvider>
                <React.Fragment>
                  <SafeAreaInsetsContext.Consumer>
                    {() => {
                      return (
                        <DrawerNavigator.Navigator
                          drawerContent={({ navigation }) => <MenuItems navigation={navigation} />}
                          screenOptions={{
                            drawerStyle: {
                              borderRadius: 28,
                              width: 296
                            },
                          }}
                        >
                          <DrawerNavigator.Screen
                            name='Home'
                            component={HomeNavigator}
                            options={{ headerShown: false }}
                          />
                          <DrawerNavigator.Screen
                            name='Feed'
                            component={FeedNavigator}
                            options={{ headerShown: false }}
                          />
                        </DrawerNavigator.Navigator>
                      )
                    }}
                  </SafeAreaInsetsContext.Consumer>
                </React.Fragment>
              </RelayPoolContextProvider>
            </AppContextProvider>
          </NavigationContainer>
        </I18nextProvider>
      </SafeAreaProvider>
    </PaperProvider>
  )
}

export default Frontend
