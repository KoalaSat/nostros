import React from 'react'
import { BottomNavigation } from 'react-native-paper'
import ContactsFeed from '../ContactsFeed'
import HomeFeed from '../HomeFeed'
import NotificationsFeed from '../NotificationsFeed'

export const HomePage: React.FC = () => {
  const [index, setIndex] = React.useState(0)
  const [routes] = React.useState([
    { key: 'feed', focusedIcon: 'home', unfocusedIcon: 'home-outline' },
    { key: 'contacts', focusedIcon: 'account-group', unfocusedIcon: 'account-group-outline' },
    { key: 'notifications', focusedIcon: 'bell', unfocusedIcon: 'bell-outline' },
  ])

  const renderScene = BottomNavigation.SceneMap({
    feed: HomeFeed,
    contacts: ContactsFeed,
    notifications: NotificationsFeed,
  })

  return (
    <BottomNavigation
      navigationState={{ index, routes }}
      onIndexChange={setIndex}
      renderScene={renderScene}
      labeled={false}
    />
  )
}

export default HomePage
