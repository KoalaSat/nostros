import React, { useCallback, useContext, useState, useEffect } from 'react'
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native'
import { AppContext } from '../../../../Contexts/AppContext'
import { getNotes, type Note } from '../../../../Functions/DatabaseFunctions/Notes'
import { handleInfinityScroll } from '../../../../Functions/NativeFunctions'
import { UserContext } from '../../../../Contexts/UserContext'
import { RelayPoolContext } from '../../../../Contexts/RelayPoolContext'
import { Kind } from 'nostr-tools'
import { type RelayFilters } from '../../../../lib/nostr/RelayPool/intex'
import { ActivityIndicator, Button, Text } from 'react-native-paper'
import NoteCard from '../../../../Components/NoteCard'
import { useFocusEffect, useTheme } from '@react-navigation/native'
import { FlashList, type ListRenderItem } from '@shopify/flash-list'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import { useTranslation } from 'react-i18next'
import { getContactsCount } from '../../../../Functions/DatabaseFunctions/Users'
import { ScrollView } from 'react-native-gesture-handler'

export const BookmarksFeed: React.FC = () => {
  const initialPageSize = 10
  const theme = useTheme()
  const { t } = useTranslation('common')
  const { database, pushedTab, online } = useContext(AppContext)
  const { publicKey, publicBookmarks, privateBookmarks, reloadBookmarks } = useContext(UserContext)
  const { lastEventId, relayPool, lastConfirmationtId } = useContext(RelayPoolContext)
  const [notes, setNotes] = useState<Note[]>([])
  const [refreshing, setRefreshing] = useState<boolean>(false)
  const [contactsCount, setContactsCount] = useState<number>()
  const [filter, setFilter] = useState<'private' | 'public'>('private')
  const [pageSize, setPageSize] = useState<number>(initialPageSize)
  const flashListRef = React.useRef<FlashList<Note>>(null)

  useFocusEffect(
    React.useCallback(() => {
      setPageSize(initialPageSize)

      return () => {}
    }, []),
  )

  useEffect(() => {
    if (pushedTab) {
      flashListRef.current?.scrollToIndex({ animated: true, index: 0 })
    }
  }, [pushedTab])

  useEffect(() => {
    if (relayPool && publicKey && database) {
      if (!contactsCount) getContactsCount(database).then(setContactsCount)
      loadNotes()
    }
  }, [
    filter,
    lastEventId,
    lastConfirmationtId,
    relayPool,
    publicKey,
    database,
    publicBookmarks,
    privateBookmarks,
    online
  ])

  useEffect(() => {
    if (pageSize > initialPageSize) {
      loadNotes()
      reloadBookmarks()
    }
  }, [pageSize])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    loadNotes()
    reloadBookmarks()
  }, [])

  const onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void = (event) => {
    if (handleInfinityScroll(event)) {
      setPageSize(pageSize + initialPageSize)
    }
  }

  const loadNotes: () => void = async () => {
    if (database && publicKey) {
      relayPool?.subscribe(`homepage-bookmarks-main${publicKey?.substring(0, 8)}`, [
        {
          kinds: [Kind.Text],
          authors: publicBookmarks,
        },
      ])
      getNotes(database, {
        filters: { id: filter === 'public' ? publicBookmarks : privateBookmarks },
        limit: pageSize,
      }).then(async (results) => {
        setNotes(results)
        setRefreshing(false)

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
          relayPool?.subscribe(`homepage-bookmarks-reactions${publicKey?.substring(0, 8)}`, reactionFilters)
          if (repostIds.length > 0) {
            relayPool?.subscribe(`homepage-bookmarks-reposts${publicKey?.substring(0, 8)}`, [
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
          name='bookmark-multiple-outline'
          size={64}
          style={styles.center}
          color={theme.colors.onPrimaryContainer}
        />
        <Text variant='headlineSmall' style={styles.center}>
          {filter === 'private'
            ? t('homeFeed.bookmarkFeed.emptyTitlePrivate')
            : t('homeFeed.bookmarkFeed.emptyTitlePublic')}
        </Text>
        <Text variant='bodyMedium' style={styles.center}>
          {filter === 'private'
            ? t('homeFeed.bookmarkFeed.emptyDescriptionPrivate')
            : t('homeFeed.bookmarkFeed.emptyDescriptionPublic')}
        </Text>
      </View>
    ),
    [filter],
  )

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.filters}>
        <Button
          mode={filter === 'private' ? 'contained-tonal' : 'outlined'}
          style={styles.filterButton}
          onPress={() => setFilter('private')}
        >
          {t('homeFeed.bookmarkFeed.private')}
        </Button>
        <Button
          mode={filter === 'public' ? 'contained-tonal' : 'outlined'}
          style={styles.filterButton}
          onPress={() => setFilter('public')}
        >
          {t('homeFeed.bookmarkFeed.public')}
        </Button>
      </View>
      {(filter === 'public' && publicBookmarks.length === 0) ||
      (filter === 'private' && privateBookmarks.length === 0) ? (
        ListEmptyComponent
      ) : (
        <FlashList
          showsVerticalScrollIndicator={false}
          data={notes}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          onScroll={onScroll}
          refreshing={refreshing}
          horizontal={false}
          ListFooterComponent={
            publicBookmarks.length > pageSize ? (
              <ActivityIndicator style={styles.loading} animating={true} />
            ) : (
              <></>
            )
          }
          ref={flashListRef}
        />
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  loading: {
    paddingTop: 16,
  },
  list: {
    height: '100%',
    marginBottom: 16,
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
    height: 160,
    marginTop: 91,
  },
  activityIndicator: {
    padding: 16,
  },
  filters: {
    flexDirection: 'row',
    paddingTop: 16,
  },
  filterButton: {
    marginRight: 16,
  },
})

export default BookmarksFeed
