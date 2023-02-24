import React, { useContext, useEffect, useState } from 'react'
import { Dimensions, StyleSheet, View } from 'react-native'
import { UserContext } from '../../Contexts/UserContext'
import { RelayPoolContext } from '../../Contexts/RelayPoolContext'
import { AnimatedFAB } from 'react-native-paper'
import { useFocusEffect } from '@react-navigation/native'
import { navigate } from '../../lib/Navigation'
import GlobalFeed from './GlobalFeed'
import MyFeed from './MyFeed'
import { getUnixTime } from 'date-fns'
import { RelayFilters } from '../../lib/nostr/RelayPool/intex'
import { Kind } from 'nostr-tools'
import { AppContext } from '../../Contexts/AppContext'
import { getUsers, User } from '../../Functions/DatabaseFunctions/Users'
import Tabs from '../../Components/Tabs'
import ZapsFeed from './ZapsFeed'

interface HomeFeedProps {
  navigation: any
}

export const HomeFeed: React.FC<HomeFeedProps> = ({ navigation }) => {
  const initialPageSize = 10
  const { database } = useContext(AppContext)
  const { publicKey, privateKey } = useContext(UserContext)
  const { relayPool } = useContext(RelayPoolContext)
  const [activeTab, setActiveTab] = React.useState('myFeed')
  const [lastLoadAt, setLastLoadAt] = useState<number>(0)
  const [pageSize, setPageSize] = useState<number>(initialPageSize)

  useFocusEffect(
    React.useCallback(() => {
      subscribeNotes()
      subscribeGlobal()
      updateLastLoad()

      return () =>
        relayPool?.unsubscribe([
          'homepage-global-main',
          'homepage-global-reposts',
          'homepage-myfeed-main',
          'homepage-myfeed-reactions',
          'homepage-myfeed-reposts',
          'homepage-zapped-notes',
        ])
    }, []),
  )

  useEffect(() => {
    if (pageSize > initialPageSize) {
      subscribeGlobal(true)
      subscribeNotes(true)
      updateLastLoad()
    }
  }, [pageSize, lastLoadAt])

  const updateLastLoad: () => void = () => {
    setLastLoadAt(getUnixTime(new Date()) - 5)
  }

  const subscribeGlobal: (past?: boolean) => void = (past) => {
    const message: RelayFilters = {
      kinds: [Kind.Text, Kind.RecommendRelay],
      limit: pageSize,
    }

    if (past) message.until = lastLoadAt

    relayPool?.subscribe('homepage-global-main', [message])
  }

  const subscribeNotes: (past?: boolean) => void = async (past) => {
    if (!database || !publicKey) return
    const users: User[] = await getUsers(database, { contacts: true, order: 'created_at DESC' })
    const authors: string[] = [...users.map((user) => user.id), publicKey]

    const message: RelayFilters = {
      kinds: [Kind.Text, Kind.RecommendRelay],
      authors,
      limit: pageSize,
    }
    if (past) message.until = lastLoadAt
    relayPool?.subscribe('homepage-myfeed-main', [message])
  }

  const renderScene: Record<string, JSX.Element> = {
    globalFeed: (
      <GlobalFeed
        navigation={navigation}
        updateLastLoad={updateLastLoad}
        lastLoadAt={lastLoadAt}
        pageSize={pageSize}
        setPageSize={setPageSize}
      />
    ),
    myFeed: (
      <MyFeed
        navigation={navigation}
        updateLastLoad={updateLastLoad}
        pageSize={pageSize}
        setPageSize={setPageSize}
      />
    ),
    zaps: (
      <ZapsFeed
        navigation={navigation}
        updateLastLoad={updateLastLoad}
        pageSize={pageSize}
        setPageSize={setPageSize}
      />
    ),
  }

  return (
    <View>
      <Tabs tabs={['globalFeed', 'myFeed', 'zaps']} activeTab={activeTab} setActiveTab={setActiveTab} />
      <View style={styles.feed}>{renderScene[activeTab]}</View>
      {privateKey && (
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
