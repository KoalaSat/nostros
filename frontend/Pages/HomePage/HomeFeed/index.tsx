import React, { useContext, useEffect } from 'react'
import { Dimensions, StyleSheet, View } from 'react-native'
import { UserContext } from '../../../Contexts/UserContext'
import { AnimatedFAB } from 'react-native-paper'
import { navigate } from '../../../lib/Navigation'
import GlobalFeed from './GlobalFeed'
import MyFeed from './MyFeed'
import Tabs from '../../../Components/Tabs'
import ZapsFeed from './ZapsFeed'
import BookmarksFeed from './BookmarksFeed'
import { RelayPoolContext } from '../../../Contexts/RelayPoolContext'
import { AppContext } from '../../../Contexts/AppContext'

interface HomeFeedProps {
  navigation: any
}

export const HomeFeed: React.FC<HomeFeedProps> = ({ navigation }) => {
  const { online } = useContext(AppContext)
  const { privateKey, publicKey } = useContext(UserContext)
  const { relayPool } = useContext(RelayPoolContext)
  const [activeTab, setActiveTab] = React.useState('myFeed')

  useEffect(() => {
    if (activeTab !== 'myFeed') {
      relayPool?.unsubscribe([
          `homepage-myfeed-main${publicKey?.substring(0, 8)}`,
          `homepage-myfeed-reposts${publicKey?.substring(0, 8)}`,
          `homepage-myfeed-reaction${publicKey?.substring(0, 8)}`
        ])
    }
    if (activeTab !== 'bookmarks') {
      relayPool?.unsubscribe([
        `homepage-bookmarks-main${publicKey?.substring(0, 8)}`,
        `homepage-bookmarks-reactions${publicKey?.substring(0, 8)}`,
        `homepage-bookmarks-reposts${publicKey?.substring(0, 8)}`,
      ])
    }
    if (activeTab !== 'globalFeed') {
      relayPool?.unsubscribe([
        `homepage-global-main${publicKey?.substring(0, 8)}`,
        `homepage-global-reposts${publicKey?.substring(0, 8)}`,
        `homepage-global-reactions${publicKey?.substring(0, 8)}`
      ])
    }
    if (activeTab !== 'zaps') {
      relayPool?.unsubscribe([
        `homepage-zaps-notes${publicKey?.substring(0, 8)}`,
        `homepage-zaps-reactions${publicKey?.substring(0, 8)}`,
        `homepage-zaps-reposts${publicKey?.substring(0, 8)}`,
        `homepage-zaps-main${publicKey?.substring(0, 8)}`,
      ])
    }
  }, [activeTab])

  const renderScene: Record<string, JSX.Element> = {
    globalFeed: (
      <GlobalFeed
        navigation={navigation}
      />
    ),
    myFeed: (
      <MyFeed
        navigation={navigation}
      />
    ),
    zaps: (
      <ZapsFeed
        navigation={navigation}
      />
    ),
    bookmarks: (
      <BookmarksFeed />
    ),
  }

  return (
    <View>
      <Tabs
        tabs={['myFeed', 'globalFeed', 'zaps', 'bookmarks']}
        setActiveTab={setActiveTab}
        defaultTab='myFeed'
      />
      <View style={styles.feed}>{renderScene[activeTab]}</View>
      {privateKey && online && (
        <AnimatedFAB
          style={[styles.fab, { top: Dimensions.get('window').height - 191 }]}
          icon='pencil-outline'
          label='Label'
          onPress={() => navigate('Send')}
          animateFrom='right'
          iconMode='static'
          extended={false}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  noteCard: {
    marginBottom: 16,
  },
  fab: {
    right: 16,
    position: 'absolute',
  },
  container: {
    padding: 16,
  },
  center: {
    alignContent: 'center',
    textAlign: 'center',
  },
  blank: {
    justifyContent: 'space-between',
    height: 252,
    marginTop: 75,
    padding: 16,
  },
  tab: {
    width: 160,
  },
  textWrapper: {
    justifyContent: 'center',
    height: '100%',
    textAlign: 'center',
  },
  tabText: {
    textAlign: 'center',
  },
  tabsNavigator: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
  },
  feed: {
    paddingBottom: 95,
    paddingLeft: 16,
    paddingRight: 16,
  },
})

export default HomeFeed
