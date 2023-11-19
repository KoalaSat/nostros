import React, { useContext, useEffect } from 'react'
import { Badge, Button, Text, TouchableRipple, useTheme } from 'react-native-paper'
import ConversationsFeed from './ConversationsFeed'
import HomeFeed from './HomeFeed'
import NotificationsFeed from './NotificationsFeed'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import { UserContext } from '../../Contexts/UserContext'
import { nip19 } from 'nostr-tools'
import { AppContext } from '../../Contexts/AppContext'
import { StyleSheet } from 'react-native'
import RBSheet from 'react-native-raw-bottom-sheet'
import { useTranslation } from 'react-i18next'
import { navigate } from '../../lib/Navigation'
import GroupsFeed from './GroupsFeed'
import { RelayPoolContext } from '../../Contexts/RelayPoolContext'

export const HomePage: React.FC = () => {
  const theme = useTheme()
  const { t } = useTranslation('common')
  const { relayPool, newNotifications, setNewNotifications, newDirectMessages, setNewDirectMessages, newGroupMessages, setNewGroupMessages } = useContext(RelayPoolContext)
  const { setPushedTab } = React.useContext(AppContext)
  const { privateKey, publicKey } = React.useContext(UserContext)
  const { clipboardNip21, setClipboardNip21 } = useContext(AppContext)
  const bottomSheetClipboardRef = React.useRef<RBSheet>(null)

  useEffect(() => {
    if (clipboardNip21) {
      bottomSheetClipboardRef.current?.open()
    }
  }, [clipboardNip21])

  useEffect(() => {
    if (publicKey && relayPool) {
      relayPool?.subscribe(`home${publicKey.substring(0, 8)}`, [
        {
          kinds: [10000],
          limit: 1,
          authors: [publicKey],
        },
        {
          kinds: [10001],
          limit: 1,
          authors: [publicKey],
        },
        {
          kinds: [30001],
          authors: [publicKey],
        },
        {
          kinds: [4, 1, 7, 9735, 42],
          '#p': [publicKey],
          limit: 40
        },
      ])
    }
  }, [publicKey, relayPool])

  const goToEvent: () => void = () => {
    if (clipboardNip21) {
      const key = nip19.decode(clipboardNip21.replace('nostr:', ''))
      if (key?.data) {
        if (key.type === 'nevent') {
          navigate('Note', { noteId: key.data.id })
        } else if (key.type === 'npub') {
          navigate('Profile', { pubKey: key.data })
        } else if (key.type === 'nprofile' && key.data.pubkey) {
          navigate('Profile', { pubKey: key.data.pubkey })
        }
      }
    }
    bottomSheetClipboardRef.current?.close()
    setClipboardNip21(undefined)
  }

  const Tab = createBottomTabNavigator()

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

  return (
    <>
      <Tab.Navigator
        initialRouteName='feed'
        backBehavior='none'
        screenOptions={{
          unmountOnBlur: true,
          tabBarShowLabel: false,
          headerStyle: {
            height: 0,
          },
          tabBarStyle: {
            borderTopWidth: 0,
            height: 54,
          },
          tabBarInactiveBackgroundColor: theme.colors.elevation.level2,
          tabBarActiveBackgroundColor: theme.colors.secondaryContainer,
          tabBarButton: (props) => <TouchableRipple {...props} />,
        }}
      >
        <Tab.Screen
          name='feed'
          component={HomeFeed}
          options={{
            tabBarIcon: ({ focused, size }) => (
              <MaterialCommunityIcons
                name={focused ? 'home' : 'home-outline'}
                size={size}
                color={theme.colors.onPrimaryContainer}
              />
            ),
          }}
          listeners={{
            tabPress: () => setPushedTab('Home'),
          }}
        />
        {privateKey && (
          <>
            <Tab.Screen
              name='groups'
              component={GroupsFeed}
              options={{
                tabBarIcon: ({ focused, size }) => (
                  <>
                    <MaterialCommunityIcons
                      name={focused ? 'account-group' : 'account-group-outline'}
                      size={size}
                      color={theme.colors.onPrimaryContainer}
                    />
                    {newGroupMessages > 0 && (
                      <Badge style={styles.notificationBadge}>
                        {newGroupMessages}
                      </Badge>
                    )}
                  </>
                ),
              }}
              listeners={{
                tabPress: () => {
                  setNewGroupMessages(0)
                },
              }}
            />
            <Tab.Screen
              name='messages'
              component={ConversationsFeed}
              options={{
                tabBarIcon: ({ focused, size }) => (
                  <>
                    <MaterialCommunityIcons
                      name={focused ? 'email' : 'email-outline'}
                      size={size}
                      color={theme.colors.onPrimaryContainer}
                    />
                    {newDirectMessages > 0 && (
                      <Badge style={styles.notificationBadge}>
                        {newDirectMessages}
                      </Badge>
                    )}
                  </>
                ),
              }}
              listeners={{
                tabPress: () => {
                  setNewDirectMessages(0)
                },
              }}
            />
          </>
        )}
        <Tab.Screen
          name='notifications'
          component={NotificationsFeed}
          options={{
            tabBarIcon: ({ focused, size }) => (
              <>
                <MaterialCommunityIcons
                  name={focused ? 'bell' : 'bell-outline'}
                  size={size}
                  color={theme.colors.onPrimaryContainer}
                />
                {newNotifications > 0 && (
                  <Badge style={styles.notificationBadge}>
                    {newNotifications}
                  </Badge>
                )}
              </>
            ),
          }}
          listeners={{
            tabPress: () => {
              setNewNotifications(0)
              setPushedTab('Notifications')
            },
          }}
        />
      </Tab.Navigator>
      <RBSheet
        ref={bottomSheetClipboardRef}
        closeOnDragDown={true}
        customStyles={bottomSheetStyles}
      >
        <Text variant='titleMedium'>{t('homePage.clipboardTitle')}</Text>
        <Text>{clipboardNip21}</Text>
        <Button style={styles.buttonSpacer} mode='contained' onPress={goToEvent}>
          {t('homePage.goToEvent')}
        </Button>
        <Button
          mode='outlined'
          onPress={() => {
            bottomSheetClipboardRef.current?.close()
            setClipboardNip21(undefined)
          }}
        >
          {t('homePage.cancel')}
        </Button>
      </RBSheet>
    </>
  )
}

const styles = StyleSheet.create({
  notificationBadge: {
    position: 'absolute',
    right: 25,
    top: 10,
  },
  buttonSpacer: {
    marginTop: 16,
    marginBottom: 16,
  },
})

export default HomePage
