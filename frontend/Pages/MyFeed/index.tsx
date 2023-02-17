import React, { useCallback, useContext, useState, useEffect } from 'react'
import { getUsers, User } from '../../Functions/DatabaseFunctions/Users'
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native'
import { AppContext } from '../../Contexts/AppContext'
import { getMainNotes, Note } from '../../Functions/DatabaseFunctions/Notes'
import { handleInfinityScroll } from '../../Functions/NativeFunctions'
import { UserContext } from '../../Contexts/UserContext'
import { RelayPoolContext } from '../../Contexts/RelayPoolContext'
import { Kind } from 'nostr-tools'
import { RelayFilters } from '../../lib/nostr/RelayPool/intex'
import { ActivityIndicator, Button, Text } from 'react-native-paper'
import NoteCard from '../../Components/NoteCard'
import { useTheme } from '@react-navigation/native'
import { FlashList, ListRenderItem } from '@shopify/flash-list'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import { useTranslation } from 'react-i18next'

interface MyFeedProps {
  navigation: any
}

export const MyFeed: React.FC<MyFeedProps> = ({ navigation }) => {
  const theme = useTheme()
  const { t } = useTranslation('common')
  const { database, pushedTab } = useContext(AppContext)
  const { publicKey } = useContext(UserContext)
  const { lastEventId, relayPool, lastConfirmationtId } = useContext(RelayPoolContext)
  const initialPageSize = 10
  const [notes, setNotes] = useState<Note[]>([])
  const [pageSize, setPageSize] = useState<number>(initialPageSize)
  const [refreshing, setRefreshing] = useState(false)
  const flashListRef = React.useRef<FlashList<Note>>(null)

  const unsubscribe: () => void = () => {
    relayPool?.unsubscribe([
      'homepage-contacts-main',
      'homepage-contacts-replies',
      'homepage-contacts-reactions',
      'homepage-contacts-repost',
    ])
  }

  useEffect(() => {
    if (pushedTab) {
      flashListRef.current?.scrollToIndex({ animated: true, index: 0 })
    }
  }, [pushedTab])

  useEffect(() => {
    unsubscribe()
    subscribeNotes()
    loadNotes()
  }, [])

  useEffect(() => {
    if (relayPool && publicKey) {
      loadNotes()
    }
  }, [lastEventId, lastConfirmationtId])

  useEffect(() => {
    if (pageSize > initialPageSize) {
      subscribeNotes(true)
    }
  }, [pageSize])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    unsubscribe()
    subscribeNotes()
  }, [])

  const onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void = (event) => {
    if (handleInfinityScroll(event)) {
      setPageSize(pageSize + initialPageSize)
    }
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
    relayPool?.subscribe('homepage-contacts-main', [message])
    setRefreshing(false)
  }

  const loadNotes: () => void = async () => {
    if (database && publicKey) {
      getMainNotes(database, publicKey, pageSize, true).then(async (notes) => {
        setNotes(notes)
        if (notes.length > 0) {
          const noteIds = notes.map((note) => note.id ?? '')
          const authors = notes.map((note) => note.pubkey ?? '')

          relayPool?.subscribe('homepage-contacts-reactions', [
            {
              kinds: [Kind.Metadata],
              authors,
            },
            {
              kinds: [Kind.Reaction, Kind.Text, 9735],
              '#e': noteIds,
            },
          ])
          const repostIds = notes
            .filter((note) => note.repost_id)
            .map((note) => note.repost_id ?? '')
          if (repostIds.length > 0) {
            relayPool?.subscribe('homepage-contacts-repost', [
              {
                kinds: [Kind.Text],
                ids: repostIds,
              },
            ])
          }
        }
      })
    }
  }

  const renderItem: ListRenderItem<Note> = ({ item }) => {
    return (
      <View style={styles.noteCard} key={item.id}>
        <NoteCard note={item} />
      </View>
    )
  }

  const ListEmptyComponent = React.useMemo(
    () => (
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
    ),
    [],
  )

  return (
    <View style={styles.list}>
      <FlashList
        estimatedItemSize={200}
        showsVerticalScrollIndicator={false}
        data={notes}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onScroll={onScroll}
        refreshing={refreshing}
        ListEmptyComponent={ListEmptyComponent}
        horizontal={false}
        ListFooterComponent={
          notes.length > 0 ? <ActivityIndicator style={styles.loading} animating={true} /> : <></>
        }
        ref={flashListRef}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  loading: {
    paddingTop: 16,
  },
  list: {
    height: '100%',
  },
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

export default MyFeed
