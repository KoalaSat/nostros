import * as React from 'react'
import { Platform, View } from 'react-native'
import type { DrawerNavigationProp } from '@react-navigation/drawer'
import { CardStyleInterpolators, createStackNavigator } from '@react-navigation/stack'
import { Appbar, Snackbar, Text, useTheme } from 'react-native-paper'
import RBSheet from 'react-native-raw-bottom-sheet'
import { useTranslation } from 'react-i18next'
import HomePage from '../HomePage'
import RelaysPage from '../RelaysPage'
import AboutPage from '../AboutPage'
import ProfileConfigPage from '../ProfileConfigPage'
import ProfilePage from '../ProfilePage'
import ProfileCard from '../../Components/ProfileCard'
import NotePage from '../NotePage'
import SendPage from '../SendPage'

export const HomeNavigator: React.FC = () => {
  const theme = useTheme()
  const { t } = useTranslation('common')
  const bottomSheetKeysRef = React.useRef<RBSheet>(null)
  const bottomSheetProfileRef = React.useRef<RBSheet>(null)
  const Stack = React.useMemo(() => createStackNavigator(), [])
  const [showProfile, setShowProfile] = React.useState<string>()
  const cardStyleInterpolator = React.useMemo(
    () =>
      Platform.OS === 'android'
        ? CardStyleInterpolators.forFadeFromBottomAndroid
        : CardStyleInterpolators.forHorizontalIOS,
    [],
  )
  const bottomSheetStyles = React.useMemo(() => {
    return {
      container: {
        backgroundColor: theme.colors.background,
        padding: 16,
        borderTopRightRadius: 28,
        borderTopLeftRadius: 28
      },
      draggableIcon: {
        backgroundColor: '#000',
      },
    }
  }, [])

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
                  {route.name === 'Profile' && (
                    <Appbar.Action
                      icon='dots-vertical'
                      onPress={() => {
                        const params = route?.params as { pubKey : string }
                        setShowProfile(params?.pubKey ?? '')
                        bottomSheetProfileRef.current?.open()
                      }}
                    />
                  )}
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
          <Stack.Screen name='Note' component={NotePage} />
          <Stack.Screen name='Send' component={SendPage} />
          <Stack.Screen name='Reply' component={SendPage} />
        </Stack.Group>
      </Stack.Navigator>
      <RBSheet
        ref={bottomSheetProfileRef}
        closeOnDragDown={true}
        height={280}
        customStyles={bottomSheetStyles}
      >
        <ProfileCard userPubKey={showProfile ?? ''} bottomSheetRef={bottomSheetProfileRef}/>
      </RBSheet>
      <RBSheet
        ref={bottomSheetKeysRef}
        closeOnDragDown={true}
        height={380}
        customStyles={bottomSheetStyles}
      >
        <View>
          <Text variant='headlineSmall'>¿Qué son las claves?</Text>
          <Text variant='bodyMedium'>
            En nostr tienes dos claves: tu clave pública y tu clave privada.
          </Text>
          <Text variant='titleMedium'>Clave pública</Text>
          <Text variant='bodyMedium'>
            Piensa en la clave pública como tu nombre de usuario (como tu @handle en Twitter).
            Compártela con otras personas para que te añadan a su red.
          </Text>
          <Text variant='titleMedium'>Clave privada</Text>
          <Text variant='bodyMedium'>Piensa en tu clave privada como tu contraseña.</Text>
          <Snackbar visible onDismiss={() => {}}>
            Muy importante. Guarda tu clave privada en un lugar seguro, si la pierdes no podrás
            volver a acceder con ella ni recuperar tu cuenta.
          </Snackbar>
        </View>
      </RBSheet>
    </>
  )
}

export default HomeNavigator
