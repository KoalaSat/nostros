import * as React from 'react'
import { Platform, StyleSheet, View } from 'react-native'
import { CardStyleInterpolators, createStackNavigator } from '@react-navigation/stack'
import { Appbar, Text, useTheme } from 'react-native-paper'
import ProfileConnectPage from '../../Pages/ProfileConnectPage'
import ProfileLoadPage from '../../Pages/ProfileLoadPage'
import RBSheet from 'react-native-raw-bottom-sheet'
import AboutPage from '../../Pages/AboutPage'
import { useTranslation } from 'react-i18next'
import ProfileCreatePage from '../../Pages/ProfileCreatePage'
import { type DrawerNavigationProp } from '@react-navigation/drawer'
import RelaysPage from '../RelaysPage'
import ConfigPage from '../ConfigPage'
import QrReaderPage from '../QrReaderPage'

export const HomeNavigator: React.FC = () => {
  const theme = useTheme()
  const { t } = useTranslation('common')
  const bottomSheetKeysRef = React.useRef<RBSheet>(null)
  const bottomSheetRelaysRef = React.useRef<RBSheet>(null)
  const Stack = React.useMemo(() => createStackNavigator(), [])
  const cardStyleInterpolator = React.useMemo(
    () =>
      Platform.OS === 'android'
        ? CardStyleInterpolators.forFadeFromBottomAndroid
        : CardStyleInterpolators.forHorizontalIOS,
    [],
  )
  const onPressQuestion: (pageName: string) => void = (pageName) => {
    pageName === 'Relays'
      ? bottomSheetRelaysRef.current?.open()
      : bottomSheetKeysRef.current?.open()
  }

  const BottomSheetKeys = React.useMemo(
    () => (
      <View style={styles.bottomSheetKeysContainer}>
        <Text variant='headlineSmall'>{t('drawers.keysTitle')}</Text>
        <Text variant='bodyMedium'>{t('drawers.keysDescription')}</Text>
        <Text variant='titleMedium'>{t('drawers.publicKeys')}</Text>
        <Text variant='bodyMedium'>{t('drawers.publicKeysDescription')}</Text>
        <Text variant='titleMedium'>{t('drawers.privateKey')}</Text>
        <Text variant='bodyMedium'>{t('drawers.privateKeyDescription')}</Text>
        <View style={[styles.warning, { backgroundColor: '#683D00' }]}>
          <Text style={[styles.bold, { color: '#FFDCBB' }]}>
            {t('drawers.privateKeysSnackbarTitle')}
          </Text>
          <Text style={{ color: '#FFDCBB' }}>{t('drawers.privateKeysSnackbarDescription')}</Text>
        </View>
      </View>
    ),
    [],
  )

  const BottomSheetRelays = React.useMemo(
    () => (
      <View>
        <Text variant='headlineSmall'>{t('drawers.relaysTitle')}</Text>
        <Text variant='bodyMedium'>{t('drawers.relaysDescription')}</Text>
      </View>
    ),
    [],
  )

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
          <Stack.Screen name='Config' component={ConfigPage} />
          <Stack.Screen name='QrReader' component={QrReaderPage} />
        </Stack.Group>
      </Stack.Navigator>
      <RBSheet
        ref={bottomSheetKeysRef}
        closeOnDragDown={true}
        height={420}
        customStyles={{
          container: {
            backgroundColor: theme.colors.background,
            paddingTop: 16,
            paddingRight: 16,
            paddingBottom: 32,
            paddingLeft: 16,
            borderTopRightRadius: 28,
            borderTopLeftRadius: 28,
          },
        }}
      >
        {BottomSheetKeys}
      </RBSheet>
      <RBSheet
        ref={bottomSheetRelaysRef}
        closeOnDragDown={true}
        customStyles={{
          container: {
            backgroundColor: theme.colors.background,
            paddingTop: 16,
            paddingRight: 16,
            paddingBottom: 32,
            paddingLeft: 16,
            borderTopRightRadius: 28,
            borderTopLeftRadius: 28,
            height: 'auto',
          },
        }}
      >
        {BottomSheetRelays}
      </RBSheet>
    </>
  )
}

const styles = StyleSheet.create({
  warning: {
    borderRadius: 4,
    padding: 16,
    marginTop: 16,
    marginBottom: 16,
  },
  warningTitle: {
    marginBottom: 8,
  },
  warningAction: {
    marginTop: 16,
  },
  warningActionOuterLayout: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  bottomSheetKeysContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  bold: {
    fontWeight: 'bold',
  },
})

export default HomeNavigator
