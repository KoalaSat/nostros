import React from 'react'
import { TouchableRipple, useTheme } from 'react-native-paper'
import ContactsFeed from '../ContactsFeed'
import ConversationsFeed from '../ConversationsFeed'
import HomeFeed from '../HomeFeed'
import NotificationsFeed from '../NotificationsFeed'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'

export const HomePage: React.FC = () => {
  const theme = useTheme()

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
            <MaterialCommunityIcons name={focused ? 'home' : 'home-outline'} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name='messages'
        component={ConversationsFeed}
        options={{
          tabBarIcon: ({ focused, size }) => (
            <MaterialCommunityIcons name={focused ? 'email' : 'email-outline'} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name='contacts'
        component={ContactsFeed}
        options={{
          tabBarIcon: ({ focused, size }) => (
            <MaterialCommunityIcons
              name={focused ? 'account-group' : 'account-group-outline'}
              size={size}
            />
          ),
        }}
      />
      <Tab.Screen
        name='notifications'
        component={NotificationsFeed}
        options={{
          tabBarIcon: ({ focused, size }) => (
            <MaterialCommunityIcons name={focused ? 'bell' : 'bell-outline'} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  )
}

export default HomePage
