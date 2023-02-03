import React, { useContext, useEffect, useState } from 'react'
import { Badge, Button, Text, TouchableRipple, useTheme } from 'react-native-paper'
import ContactsFeed from '../ContactsFeed'
import ConversationsFeed from '../ConversationsFeed'
import HomeFeed from '../HomeFeed'
import NotificationsFeed from '../NotificationsFeed'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import { UserContext } from '../../Contexts/UserContext'
import { RelayPoolContext } from '../../Contexts/RelayPoolContext'
import { Kind } from 'nostr-tools'
import { getMentionNotes, getNotificationsCount } from '../../Functions/DatabaseFunctions/Notes'
import { AppContext } from '../../Contexts/AppContext'
import { StyleSheet } from 'react-native'
import RBSheet from 'react-native-raw-bottom-sheet'
import { useTranslation } from 'react-i18next'
import { navigate } from '../../lib/Navigation'
import { decode } from 'nostr-tools/nip19'

export const HomePage: React.FC = () => {
  const theme = useTheme()
  const { t } = useTranslation('common')
  const { language } = React.useContext(AppContext)
  const { privateKey, publicKey } = React.useContext(UserContext)
  const { database, notificationSeenAt, clipboardNip21, setClipboardNip21 } = useContext(AppContext)
  const { relayPool, lastEventId } = useContext(RelayPoolContext)
  const [newNotifications, setNewNotifications] = useState<number>(0)
  const bottomSheetClipboardRef = React.useRef<RBSheet>(null)

  useEffect(() => {
    if (clipboardNip21) {
      bottomSheetClipboardRef.current?.open()
    }
  }, [clipboardNip21])

  useEffect(() => {
    if (publicKey && database) {
      getNotificationsCount(database, publicKey, notificationSeenAt).then(setNewNotifications)
    }
  }, [lastEventId, notificationSeenAt])

  useEffect(() => {
    if (publicKey && database) {
      getMentionNotes(database, publicKey, 1).then((results) => {
        relayPool?.subscribe('notification-icon', [
          {
            kinds: [Kind.Text],
            '#p': [publicKey],
            since: results[0].created_at,
          },
          {
            kinds: [Kind.Text],
            '#e': [publicKey],
            since: results[0].created_at,
          },
        ])
      })
    }
  }, [publicKey])

  React.useEffect(() => {}, [language])

  const goToEvent: () => void = () => {
    if (clipboardNip21) {
      const key = decode(clipboardNip21.replace('nostr:', ''))
      if (key) {
        if (key.type === 'nevent') {
          navigate('Note', { noteId: key.data })
        } else if (key.type === 'nprofile' || key.type === 'npub') {
          navigate('Profile', { pubKey: key.data })
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
            height: 60,
          },
          tabBarInactiveBackgroundColor: '#001C37',
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
        />
        {privateKey && (
          <Tab.Screen
            name='messages'
            component={ConversationsFeed}
            options={{
              tabBarIcon: ({ focused, size }) => (
                <MaterialCommunityIcons
                  name={focused ? 'email' : 'email-outline'}
                  size={size}
                  color={theme.colors.onPrimaryContainer}
                />
              ),
            }}
          />
        )}
        <Tab.Screen
          name='contacts'
          component={ContactsFeed}
          options={{
            tabBarIcon: ({ focused, size }) => (
              <MaterialCommunityIcons
                name={focused ? 'account-group' : 'account-group-outline'}
                size={size}
                color={theme.colors.onPrimaryContainer}
              />
            ),
          }}
        />
        <Tab.Screen
          name='notifications'
          component={NotificationsFeed}
          options={{
            tabBarIcon: ({ focused, size }) => (
              <>
                {newNotifications > 0 && (
                  <Badge style={styles.notificationBadge}>{newNotifications}</Badge>
                )}
                <MaterialCommunityIcons
                  name={focused ? 'bell' : 'bell-outline'}
                  size={size}
                  color={theme.colors.onPrimaryContainer}
                />
              </>
            ),
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
