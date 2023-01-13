import * as React from 'react'
import { Platform, View } from 'react-native'
import { CardStyleInterpolators, createStackNavigator } from '@react-navigation/stack'
import { Appbar, Snackbar, Text, useTheme } from 'react-native-paper'
import ProfileConnectPage from '../../Pages/ProfileConnectPage'
import ProfileLoadPage from '../../Pages/ProfileLoadPage'
import RBSheet from 'react-native-raw-bottom-sheet'
import AboutPage from '../../Pages/AboutPage'
import { useTranslation } from 'react-i18next'
import ProfileCreatePage from '../../Pages/ProfileCreatePage'
import { DrawerNavigationProp } from '@react-navigation/drawer'
import RelaysPage from '../RelaysPage'
import { useState } from 'react'

export const HomeNavigator: React.FC = () => {
  const theme = useTheme()
  const { t } = useTranslation('common')
  const [bottomSheetPage, setBottomSheetPage] = useState<'keys' | 'relays'>('keys')
  const bottomSheetRef = React.useRef<RBSheet>(null)
  const Stack = React.useMemo(() => createStackNavigator(), [])
  const cardStyleInterpolator = React.useMemo(
    () =>
      Platform.OS === 'android'
        ? CardStyleInterpolators.forFadeFromBottomAndroid
        : CardStyleInterpolators.forHorizontalIOS,
    [],
  )
  const onPressQuestion: (pageName: string) => void = (pageName) => {
    bottomSheetRef.current?.open()
    setBottomSheetPage(pageName === 'Relays' ? 'relays' : 'keys')
  }

  const BottomSheetKeys = React.useMemo(
    () => (
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
          Muy importante. Guarda tu clave privada en un lugar seguro, si la pierdes no podrás volver
          a acceder con ella ni recuperar tu cuenta.
        </Snackbar>
      </View>
    ),
    [],
  )
  
  const BottomSheetRelays = React.useMemo(
    () => (
      <View>
        <Text variant='headlineSmall'>Relés</Text>
        <Text variant='bodyMedium'>
          Los relés son nodos en la red que actúan como intermediarios para la transmisión de mensajes entre aplicaciones. 
          Los relés pueden ser utilizados para mejorar la resiliencia y la disponibilidad de la red, ya que permiten que los mensajes sean entregados aun cuando hay fallos o interrupciones en la conectividad.
          Los relés también pueden ser utilizados para mejorar la privacidad y la seguridad de la red, ya que pueden ocultar la ubicación y el identidad de las aplicaciones que se comunican entre sí a través de ellos. Esto puede ser útil en entornos donde la censura o la vigilancia son un problema.
          Es importante tener en cuenta que los relés también pueden ser utilizados para propósitos malintencionados, como para rastrear o censurar el tráfico de la red. 
          Por lo tanto, es importante evaluar cuidadosamente el uso de relés y considerar medidas de seguridad adecuadas para proteger la privacidad y la seguridad de la red.
        </Text>
      </View>
    ),
    [],
  )

  const BottomSheets = {
    keys: {
      component: BottomSheetKeys,
      height: 380,
    },
    relays: {
      component: BottomSheetRelays,
      height: 600,
    }
  }

  return (
    <>
      <Stack.Navigator
        screenOptions={({ navigation }) => {
          return {
            detachPreviousScreen: !navigation.isFocused(),
            cardStyleInterpolator,
            header: ({ navigation, route, back }) => {
              const leftAction: () => JSX.Element = () => {
                if (back && route.name !== 'ProfileLoad') {
                  return <Appbar.BackAction onPress={() => navigation.goBack()} />
                } else if ((navigation as any as DrawerNavigationProp<{}>).openDrawer) {
                  return (
                    <Appbar.Action
                      icon='menu'
                      isLeading
                      onPress={() => (navigation as any as DrawerNavigationProp<{}>).openDrawer()}
                    />
                  )
                } else {
                  return <Appbar.Action icon='' />
                }
              }

              return (
                <Appbar.Header>
                  {leftAction()}
                  <Appbar.Content title={t(`loggerPage.${route.name}`)} />
                  <Appbar.Action icon='help-circle-outline' isLeading onPress={() => onPressQuestion(route.name)} />
                </Appbar.Header>
              )
            },
          }
        }}
      >
        <Stack.Group>
          <Stack.Screen name='ProfileConnect' component={ProfileConnectPage} />
          <Stack.Screen name='ProfileCreate' component={ProfileCreatePage} />
          <Stack.Screen name='ProfileLoad' component={ProfileLoadPage} />
        </Stack.Group>
        <Stack.Group>
          <Stack.Screen name='About' component={AboutPage} />
          <Stack.Screen name='Relays' component={RelaysPage} />
        </Stack.Group>
      </Stack.Navigator>
      <RBSheet
        ref={bottomSheetRef}
        closeOnDragDown={true}
        height={BottomSheets[bottomSheetPage].height}
        customStyles={{
          container: {
            backgroundColor: theme.colors.background,
            padding: 16,
            borderTopRightRadius: 28,
            borderTopLeftRadius: 28
          },
          draggableIcon: {
            backgroundColor: '#000',
          },
        }}
      >
        {BottomSheets[bottomSheetPage].component}
      </RBSheet>
    </>
  )
}

export default HomeNavigator
