import React, { useCallback, useContext, useState, useEffect } from 'react'
import {
  ListRenderItem,
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native'
import { AppContext } from '../../Contexts/AppContext'
import { getMainNotes, getMainNotesCount, Note } from '../../Functions/DatabaseFunctions/Notes'
import { handleInfinityScroll } from '../../Functions/NativeFunctions'
import { UserContext } from '../../Contexts/UserContext'
import { RelayPoolContext } from '../../Contexts/RelayPoolContext'
import { Kind } from 'nostr-tools'
import { RelayFilters } from '../../lib/nostr/RelayPool/intex'
import { ActivityIndicator, Banner, Button, Text } from 'react-native-paper'
import NoteCard from '../../Components/NoteCard'
import { useTheme } from '@react-navigation/native'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import { t } from 'i18next'
import { FlatList } from 'react-native-gesture-handler'
import { getUnixTime } from 'date-fns'

interface GlobalFeedProps {
  navigation: any
  setProfileCardPubKey: (profileCardPubKey: string) => void
}

export const GlobalFeed: React.FC<GlobalFeedProps> = ({ navigation, setProfileCardPubKey }) => {
  const theme = useTheme()
  const { database, showPublicImages } = useContext(AppContext)
  const { publicKey } = useContext(UserContext)
  const { lastEventId, relayPool, lastConfirmationtId } = useContext(RelayPoolContext)
  const initialPageSize = 10
  const [notes, setNotes] = useState<Note[]>([])
  const [lastLoadAt, setLastLoadAt] = useState<number>(0)
  const [newNotesCount, setNewNotesCount] = useState<number>(0)
  const [pageSize, setPageSize] = useState<number>(initialPageSize)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    subscribeNotes()
  }, [])

  useEffect(() => {
    if (relayPool && publicKey) {
      loadNotes()
    }
  }, [lastEventId, lastConfirmationtId, lastLoadAt])

  useEffect(() => {
    if (pageSize > initialPageSize) {
      subscribeNotes(true)
    }
  }, [pageSize])

  const updateLastLoad: () => void = () => {
    setLastLoadAt(getUnixTime(new Date()))
  }

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    updateLastLoad()
    setNewNotesCount(0)
  }, [])

  const subscribeNotes: (past?: boolean) => void = async (past) => {
    if (!database || !publicKey) return

    const message: RelayFilters = {
      kinds: [Kind.Text, Kind.RecommendRelay],
      limit: pageSize,
    }

    if (past) message.until = notes[0].created_at

    relayPool?.subscribe('homepage-global-main', [message])
    setRefreshing(false)
    updateLastLoad()
  }

  const onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void = (event) => {
    if (handleInfinityScroll(event)) {
      setPageSize(pageSize + initialPageSize)
    }
  }

  const loadNotes: () => void = () => {
    if (database && publicKey) {
      if (lastLoadAt > 0) {
        getMainNotesCount(database, lastLoadAt).then(setNewNotesCount)
      }
      getMainNotes(database, publicKey, pageSize, false, { until: lastLoadAt }).then((results) => {
        setRefreshing(false)
        if (results.length > 0) {
          setNotes(results)
          relayPool?.subscribe('homepage-contacts-meta', [
            {
              kinds: [Kind.Metadata],
              authors: notes.map((note) => note.pubkey ?? ''),
            },
          ])
        }
      })
    }
  }

  const renderItem: ListRenderItem<Note> = ({ item, index }) => {
    return (
      <View style={styles.noteCard} key={item.id}>
        <NoteCard
          note={item}
          showActionCount={false}
          showAvatarImage={showPublicImages}
          onPressUser={(user) => {
            setProfileCardPubKey(user.id)
          }}
          showPreview={showPublicImages}
        />
      </View>
    )
  }

  return (
    <View>
      {notes && notes.length > 0 ? (
        <ScrollView
          onScroll={onScroll}
          horizontal={false}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <Banner
            visible={newNotesCount > 0}
            actions={[]}
            icon={() => <MaterialCommunityIcons name='arrow-down-bold' size={20} />}
          >
            {t(newNotesCount < 2 ? 'homeFeed.newMessage' : 'homeFeed.newMessages', {
              newNotesCount,
            })}
          </Banner>
          <FlatList showsVerticalScrollIndicator={false} data={notes} renderItem={renderItem} />
          {notes.length >= 10 && (
            <ActivityIndicator animating={true} style={styles.activityIndicator} />
          )}
        </ScrollView>
      ) : (
        <View style={styles.blank}>
          <MaterialCommunityIcons
            name='account-group-outline'
            size={64}
            style={styles.center}
            color={theme.colors.onPrimaryContainer}
          />
          <Text variant='headlineSmall' style={styles.center}>
            {t('homeFeed.emptyTitle')}
          </Text>
          <Text variant='bodyMedium' style={styles.center}>
            {t('homeFeed.emptyDescription')}
          </Text>
          <Button mode='contained' compact onPress={() => navigation.jumpTo('contacts')}>
            {t('homeFeed.emptyButton')}
          </Button>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  noteCard: {
    marginTop: 16,
  },
  center: {
    alignContent: 'center',
    textAlign: 'center',
  },
  blank: {
    justifyContent: 'space-between',
    height: 220,
    marginTop: 91,
  },
  activityIndicator: {
    padding: 16,
  },
})

export default GlobalFeed
