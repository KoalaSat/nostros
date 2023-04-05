import React, { useContext, useEffect, useState } from 'react'
import { Badge, Button, Text, TouchableRipple, useTheme } from 'react-native-paper'
import ConversationsFeed from './ConversationsFeed'
import HomeFeed from './HomeFeed'
import NotificationsFeed from './NotificationsFeed'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import { UserContext } from '../../Contexts/UserContext'
import { RelayPoolContext } from '../../Contexts/RelayPoolContext'
import { Kind, nip19 } from 'nostr-tools'
import { AppContext } from '../../Contexts/AppContext'
import { StyleSheet } from 'react-native'
import RBSheet from 'react-native-raw-bottom-sheet'
import { useTranslation } from 'react-i18next'
import { navigate } from '../../lib/Navigation'
import { getDirectMessagesCount } from '../../Functions/DatabaseFunctions/DirectMessages'
import GroupsFeed from './GroupsFeed'
import { getUserGroupMessagesCount } from '../../Functions/DatabaseFunctions/Groups'
import { getNotifications } from '../../Functions/DatabaseFunctions/Notifications'
import { getTaggedEventIds } from '../../Functions/RelayFunctions/Events'

export const HomePage: React.FC = () => {
  const theme = useTheme()
  const { t } = useTranslation('common')
  const { language, setPushedTab } = React.useContext(AppContext)
  const { privateKey, publicKey, mutedEvents, mutedUsers } = React.useContext(UserContext)
  const { database, notificationSeenAt, clipboardNip21, setClipboardNip21, refreshBottomBarAt } =
    useContext(AppContext)
  const { relayPool, lastEventId } = useContext(RelayPoolContext)
  const [newNotifications, setNewNotifications] = useState<number>(0)
  const [newdirectMessages, setNewdirectMessages] = useState<number>(0)
  const [newGroupMessages, setNewGroupMessages] = useState<number>(0)
  const bottomSheetClipboardRef = React.useRef<RBSheet>(null)

  useEffect(() => {
    if (clipboardNip21) {
      bottomSheetClipboardRef.current?.open()
    }
  }, [clipboardNip21])

  useEffect(() => {
    if (publicKey && database && relayPool) {
      getNotifications(database, { since: notificationSeenAt }).then((results) => {
        setNewNotifications(
          results.filter((event) => {
            const eTags = getTaggedEventIds(event)
            return (
              !mutedUsers.includes(event.pubkey) && !mutedEvents.some((id) => eTags.includes(id))
            )
          }).length,
        )
      })
      getUserGroupMessagesCount(database, publicKey).then(setNewGroupMessages)
      getDirectMessagesCount(database, publicKey).then(setNewdirectMessages)
      subscribe()
    }
  }, [lastEventId, notificationSeenAt, refreshBottomBarAt, database, publicKey, relayPool])

  const subscribe: () => void = () => {
    if (publicKey && database) {
      relayPool?.subscribe('notification-icon', [
        {
          kinds: [Kind.ChannelMessage],
          '#p': [publicKey],
          limit: 30,
        },
        {
          kinds: [Kind.EncryptedDirectMessage],
          '#p': [publicKey],
          limit: 30,
        },
        {
          kinds: [Kind.Text, Kind.Reaction, 9735],
          '#p': [publicKey],
          limit: 30,
        },
      ])
    }
  }

  React.useEffect(() => {}, [language])

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
                      <Badge style={styles.notificationBadge}>{newGroupMessages}</Badge>
                    )}
                  </>
                ),
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
                    {newdirectMessages > 0 && (
                      <Badge style={styles.notificationBadge}>{newdirectMessages}</Badge>
                    )}
                  </>
                ),
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
                  <Badge style={styles.notificationBadge}>{newNotifications}</Badge>
                )}
              </>
            ),
          }}
          listeners={{
            tabPress: () => setPushedTab('Notifications'),
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
