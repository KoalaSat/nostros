import * as React from 'react'
import { Platform, View } from 'react-native'
import type { DrawerNavigationProp } from '@react-navigation/drawer'
import { CardStyleInterpolators, createStackNavigator } from '@react-navigation/stack'
import { Appbar, Snackbar, Text, useTheme } from 'react-native-paper'
import RBSheet from "react-native-raw-bottom-sheet"
import { useTranslation } from 'react-i18next'
import HomePage from '../HomePage'
import RelaysPage from '../RelaysPage'
import AboutPage from '../AboutPage'
import ProfileConfigPage from '../ProfileConfigPage'
import ProfilePage from '../ProfilePage'

export const HomeNavigator: React.FC = () => {
  const theme = useTheme()
  const { t } = useTranslation('common')
  const bottomSheetRef = React.useRef<RBSheet>(null)
  const Stack = React.useMemo(() => createStackNavigator(), [])
  const cardStyleInterpolator = React.useMemo(
    () =>
      Platform.OS === 'android'
        ? CardStyleInterpolators.forFadeFromBottomAndroid
        : CardStyleInterpolators.forHorizontalIOS,
    [],
  )

  return (
    <>
      <Stack.Navigator
        screenOptions={({ navigation }) => {
          return {
            detachPreviousScreen: !navigation.isFocused(),
            cardStyleInterpolator,
            header: ({ navigation, route, options, back }) => {
              return (
                <Appbar.Header>
                  {back ? (
                    <Appbar.BackAction onPress={() => navigation.goBack()} />
                  ) : (navigation as any).openDrawer ? (
                    <Appbar.Action
                      icon='menu'
                      isLeading
                      onPress={() => (navigation as any as DrawerNavigationProp<{}>).openDrawer()}
                    />
                  ) : null}
                  <Appbar.Content title={t(`homeNavigator.${route.name}`)} />
                </Appbar.Header>
              )
            },
          }
        }}
      >
        <Stack.Group>
          <Stack.Screen name='Landing' component={HomePage} />
        </Stack.Group>
        <Stack.Group>
          <Stack.Screen name='Relays' component={RelaysPage} />
          <Stack.Screen name='About' component={AboutPage} />
          <Stack.Screen name='ProfileConfig' component={ProfileConfigPage} />
          <Stack.Screen name='Profile' component={ProfilePage} />
        </Stack.Group>
      </Stack.Navigator>
      <RBSheet
        ref={bottomSheetRef}
        closeOnDragDown={true}
        height={380}
        customStyles={{
          container: {
            backgroundColor: theme.colors.background,
            padding: 16,
          },
          draggableIcon: {
            backgroundColor: "#000"
          }
        }}
      >
        <View>
          <Text variant="headlineSmall">¿Qué son las claves?</Text>
          <Text variant="bodyMedium">En nostr tienes dos claves: tu clave pública y tu clave privada.</Text>
          <Text variant="titleMedium">Clave pública</Text>
          <Text variant="bodyMedium">Piensa en la clave pública como tu nombre de usuario (como tu @handle en Twitter). Compártela con otras personas para que te añadan a su red.</Text>
          <Text variant="titleMedium">Clave privada</Text>
          <Text variant="bodyMedium">Piensa en tu clave privada como tu contraseña.</Text>
          <Snackbar visible onDismiss={() => {}}>
            Muy importante.
            Guarda tu clave privada en un lugar seguro, si la pierdes no podrás volver a acceder con ella ni recuperar tu cuenta.
          </Snackbar>
        </View>
      </RBSheet>
    </>
  )
}

export default HomeNavigator
