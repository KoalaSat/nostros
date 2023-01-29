import React, { useContext, useEffect, useState } from 'react'
import { Badge, TouchableRipple, useTheme } from 'react-native-paper'
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

export const HomePage: React.FC = () => {
  const theme = useTheme()
  const { privateKey, publicKey } = React.useContext(UserContext)
  const { database, notificationSeenAt } = useContext(AppContext)
  const { relayPool, lastEventId } = useContext(RelayPoolContext)
  const [newNotifications, setNewNotifications] = useState<number>(0)

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

  const Tab = createBottomTabNavigator()

  return (
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
  )
}

const styles = StyleSheet.create({
  notificationBadge: {
    position: 'absolute',
    right: 25,
    top: 10,
  },
})

export default HomePage
