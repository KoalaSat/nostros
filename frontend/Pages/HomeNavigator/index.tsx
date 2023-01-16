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
        <Text variant='headlineSmall'>{t('drawers.keysTitle')}</Text>
        <Text variant='bodyMedium'>
          {t('drawers.keysDescription')}
        </Text>
        <Text variant='titleMedium'>{t('drawers.publicKeys')}</Text>
        <Text variant='bodyMedium'>
          {t('drawers.publicKeysDescription')}
        </Text>
        <Text variant='titleMedium'>{t('drawers.privateKey')}</Text>
        <Text variant='bodyMedium'>{t('drawers.privateKeyDescription')}</Text>
        <Snackbar visible onDismiss={() => {}}>
          {t('drawers.privateKeysSnackbar')}
        </Snackbar>
      </View>
    ),
    [],
  )

  const BottomSheetRelays = React.useMemo(
    () => (
      <View>
        <Text variant='headlineSmall'>{t('drawers.relaysTitle')}</Text>
        <Text variant='bodyMedium'>
          {t('drawers.relaysDescription')}
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
    },
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
                  <Appbar.Content title={t(`homeNavigator.${route.name}`)} />
                  <Appbar.Action
                    icon='help-circle-outline'
                    isLeading
                    onPress={() => onPressQuestion(route.name)}
                  />
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
            borderTopLeftRadius: 28,
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
