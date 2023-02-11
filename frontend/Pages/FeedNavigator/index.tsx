import * as React from 'react'
import { Platform, View } from 'react-native'
import type { DrawerNavigationProp } from '@react-navigation/drawer'
import { CardStyleInterpolators, createStackNavigator } from '@react-navigation/stack'
import { Appbar, Text, useTheme } from 'react-native-paper'
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
import ConversationPage from '../ConversationPage'
import ConfigPage from '../ConfigPage'
import { RelayPoolContext } from '../../Contexts/RelayPoolContext'
import { AppContext } from '../../Contexts/AppContext'
import RelayCard from '../../Components/RelayCard'
import { updateAllRead } from '../../Functions/DatabaseFunctions/DirectMessages'
import { getUnixTime } from 'date-fns'
import ContactsPage from '../ContactsPage'
import GroupPage from '../GroupPage'
import GroupHeaderIcon from '../../Components/GroupHeaderIcon'

export const HomeNavigator: React.FC = () => {
  const theme = useTheme()
  const { t } = useTranslation('common')
  const { displayRelayDrawer, setDisplayrelayDrawer } = React.useContext(RelayPoolContext)
  const { displayUserDrawer, setDisplayUserDrawer, setRefreshBottomBarAt, database } =
    React.useContext(AppContext)
  const bottomSheetRef = React.useRef<RBSheet>(null)
  const bottomSheetProfileRef = React.useRef<RBSheet>(null)
  const bottomSheetRelayRef = React.useRef<RBSheet>(null)
  const Stack = React.useMemo(() => createStackNavigator(), [])
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
        paddingTop: 16,
        paddingRight: 16,
        paddingBottom: 32,
        paddingLeft: 16,
        borderTopRightRadius: 28,
        borderTopLeftRadius: 28,
        height: 'auto',
      },
    }
  }, [])

  const onPressQuestion: (pageName: string) => void = (pageName) => {
    bottomSheetRef.current?.open()
  }

  const onPressCheckAll: () => void = () => {
    if (database) updateAllRead(database)
    setRefreshBottomBarAt(getUnixTime(new Date()))
  }

  React.useEffect(() => {
    if (displayRelayDrawer) bottomSheetRelayRef.current?.open()
  }, [displayRelayDrawer])

  React.useEffect(() => {
    if (displayUserDrawer) bottomSheetProfileRef.current?.open()
  }, [displayUserDrawer])

  return (
    <>
      <Stack.Navigator
        screenOptions={({ navigation }) => {
          return {
            detachPreviousScreen: !navigation.isFocused(),
            cardStyleInterpolator,
            header: (headerData) => {
              const { navigation, route, back } = headerData
              const routes = navigation.getState().routes
              const routeState = routes[0]?.state
              const history = routeState?.history ?? []
              const historyKey = history[0]?.key
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
                  <Appbar.Content
                    title={
                      route.params?.title ? route.params?.title : t(`homeNavigator.${route.name}`)
                    }
                  />
                  {['Profile', 'Conversation'].includes(route.name) && (
                    <Appbar.Action
                      icon='dots-vertical'
                      onPress={() => {
                        const params = route?.params as { pubKey: string }
                        setDisplayUserDrawer(params?.pubKey ?? '')
                      }}
                    />
                  )}
                  {['Relays'].includes(route.name) && (
                    <Appbar.Action
                      icon='help-circle-outline'
                      isLeading
                      onPress={() => onPressQuestion(route.name)}
                    />
                  )}
                  {['Landing'].includes(route.name) && historyKey?.includes('messages-') && (
                    <Appbar.Action icon='check-all' isLeading onPress={() => onPressCheckAll()} />
                  )}
                  {['GroupPage'].includes(route.name) && (
                    <GroupHeaderIcon groupId={route.params?.groupId}/>
                  )}
                </Appbar.Header>
              )
            },
          }
        }}
      >
        <Stack.Group>
          <Stack.Screen name='Landing' component={HomePage} />
          <Stack.Screen name='Note' component={NotePage} />
          <Stack.Screen name='Send' component={SendPage} />
          <Stack.Screen name='Repost' component={SendPage} />
          <Stack.Screen name='Reply' component={SendPage} />
          <Stack.Screen name='Conversation' component={ConversationPage} />
          <Stack.Screen name='GroupPage' component={GroupPage} />
        </Stack.Group>
        <Stack.Group>
          <Stack.Screen name='Contacts' component={ContactsPage} />
          <Stack.Screen name='Relays' component={RelaysPage} />
          <Stack.Screen name='About' component={AboutPage} />
          <Stack.Screen name='Config' component={ConfigPage} />
          <Stack.Screen name='ProfileConfig' component={ProfileConfigPage} />
          <Stack.Screen name='Profile' component={ProfilePage} />
        </Stack.Group>
      </Stack.Navigator>
      <RBSheet
        ref={bottomSheetProfileRef}
        closeOnDragDown={true}
        customStyles={bottomSheetStyles}
        onClose={() => setDisplayUserDrawer(undefined)}
      >
        <ProfileCard bottomSheetRef={bottomSheetProfileRef} />
      </RBSheet>
      <RBSheet
        ref={bottomSheetRelayRef}
        closeOnDragDown={true}
        customStyles={bottomSheetStyles}
        onClose={() => setDisplayrelayDrawer(undefined)}
      >
        <RelayCard url={displayRelayDrawer} bottomSheetRef={bottomSheetRelayRef} />
      </RBSheet>
      <RBSheet ref={bottomSheetRef} closeOnDragDown={true} customStyles={bottomSheetStyles}>
        <View>
          <Text variant='headlineSmall'>{t('drawers.relaysTitle')}</Text>
          <Text variant='bodyMedium'>{t('drawers.relaysDescription')}</Text>
        </View>
      </RBSheet>
    </>
  )
}

export default HomeNavigator
