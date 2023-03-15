import React, { useCallback, useContext, useState, useEffect } from 'react'
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native'
import { AppContext } from '../../../../Contexts/AppContext'
import { getMainNotes, type Note } from '../../../../Functions/DatabaseFunctions/Notes'
import { handleInfinityScroll } from '../../../../Functions/NativeFunctions'
import { UserContext } from '../../../../Contexts/UserContext'
import { RelayPoolContext } from '../../../../Contexts/RelayPoolContext'
import { Kind } from 'nostr-tools'
import { type RelayFilters } from '../../../../lib/nostr/RelayPool/intex'
import { ActivityIndicator, Button, Text } from 'react-native-paper'
import NoteCard from '../../../../Components/NoteCard'
import { useTheme } from '@react-navigation/native'
import { FlashList, type ListRenderItem } from '@shopify/flash-list'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import { useTranslation } from 'react-i18next'
import {
  getContactsCount,
  getUsers,
  type User,
} from '../../../../Functions/DatabaseFunctions/Users'

interface MyFeedProps {
  navigation: any
  updateLastLoad: () => void
  pageSize: number
  setPageSize: (pageSize: number) => void
  activeTab: string
}

export const MyFeed: React.FC<MyFeedProps> = ({
  navigation,
  updateLastLoad,
  pageSize,
  setPageSize,
  activeTab,
}) => {
  const theme = useTheme()
  const { t } = useTranslation('common')
  const { database, pushedTab } = useContext(AppContext)
  const { publicKey } = useContext(UserContext)
  const { lastEventId, relayPool, lastConfirmationtId } = useContext(RelayPoolContext)
  const initialPageSize = 10
  const [notes, setNotes] = useState<Note[]>([])
  const [refreshing, setRefreshing] = useState<boolean>(false)
  const [contactsCount, setContactsCount] = useState<number>()
  const flashListRef = React.useRef<FlashList<Note>>(null)

  useEffect(() => {
    if (pushedTab) {
      flashListRef.current?.scrollToIndex({ animated: true, index: 0 })
    }
  }, [pushedTab])

  useEffect(() => {
    if (relayPool && publicKey && database && activeTab === 'myFeed') {
      if (!contactsCount) getContactsCount(database).then(setContactsCount)
      loadNotes()
    }
  }, [lastEventId, lastConfirmationtId, relayPool, publicKey, database, activeTab])

  useEffect(() => {
    if (pageSize > initialPageSize) {
      loadNotes()
    }
  }, [pageSize])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    updateLastLoad()
  }, [])

  const onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void = (event) => {
    if (handleInfinityScroll(event)) {
      setPageSize(pageSize + initialPageSize)
    }
  }

  const loadNotes: () => void = async () => {
    if (database && publicKey) {
      const users: User[] = await getUsers(database, { contacts: true, order: 'created_at DESC' })
      const contacts: string[] = [...users.map((user) => user.id), publicKey]
      getMainNotes(database, pageSize, { contants: true, pubKey: publicKey }).then(
        async (results) => {
          setNotes(results)
          setRefreshing(false)

          const message: RelayFilters = {
            kinds: [Kind.Text, Kind.RecommendRelay],
            authors: contacts,
            limit: pageSize,
          }
          if (results.length === pageSize) {
            message.since = results[pageSize - 1].created_at
          }
          relayPool?.subscribe('homepage-myfeed-main', [message])

          if (results.length > 0) {
            const noteIds = results.map((note) => note.id ?? '')
            const authors = results.map((note) => note.pubkey ?? '')
            const repostIds = results
              .filter((note) => note.repost_id)
              .map((note) => note.repost_id ?? '')

            const reactionFilters: RelayFilters[] = [
              {
                kinds: [Kind.Reaction, Kind.Text, 9735],
                '#e': noteIds,
              },
            ]
            if (authors.length > 0) {
              reactionFilters.push({
                kinds: [Kind.Metadata],
                authors,
              })
            }
            relayPool?.subscribe('homepage-contacts-reactions', reactionFilters)
            if (repostIds.length > 0) {
              relayPool?.subscribe('homepage-contacts-reposts', [
                {
                  kinds: [Kind.Text],
                  ids: repostIds,
                },
              ])
            }
          }
        },
      )
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

  return contactsCount === 0 ? (
    ListEmptyComponent
  ) : (
    <View style={styles.list}>
      <FlashList
        showsVerticalScrollIndicator={false}
        data={notes}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onScroll={onScroll}
        refreshing={refreshing}
        horizontal={false}
        ListFooterComponent={<ActivityIndicator style={styles.loading} animating={true} />}
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
