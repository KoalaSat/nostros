import React, { useContext, useState, useEffect } from 'react'
import { NativeScrollEvent, NativeSyntheticEvent, StyleSheet, View } from 'react-native'
import { AppContext } from '../../../Contexts/AppContext'
import { getNotes, Note } from '../../../Functions/DatabaseFunctions/Notes'
import { RelayPoolContext } from '../../../Contexts/RelayPoolContext'
import { Kind } from 'nostr-tools'
import { ActivityIndicator, Text, useTheme } from 'react-native-paper'
import NoteCard from '../../../Components/NoteCard'
import { FlashList, ListRenderItem } from '@shopify/flash-list'
import { handleInfinityScroll } from '../../../Functions/NativeFunctions'
import { getETags } from '../../../Functions/RelayFunctions/Events'
import { getList } from '../../../Functions/DatabaseFunctions/Lists'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import { useTranslation } from 'react-i18next'
import { RelayFilters } from '../../../lib/nostr/RelayPool/intex'

interface BookmarksFeedProps {
  publicKey: string
  setRefreshing: (refreshing: boolean) => void
  refreshing: boolean
  activeTab: string
}

export const BookmarksFeed: React.FC<BookmarksFeedProps> = ({
  publicKey,
  refreshing,
  setRefreshing,
  activeTab,
}) => {
  const initialPageSize = 10
  const theme = useTheme()
  const { t } = useTranslation('common')
  const { database } = useContext(AppContext)
  const { lastEventId, relayPool } = useContext(RelayPoolContext)
  const [pageSize, setPageSize] = useState<number>(initialPageSize)
  const [notes, setNotes] = useState<Note[]>([])

  useEffect(() => {
    if (refreshing) {
      subscribe()
      loadNotes()
    }
  }, [refreshing])

  useEffect(() => {
    if (activeTab === 'bookmarks') {
      subscribe()
      loadNotes()
    }
  }, [pageSize, lastEventId, activeTab])

  const subscribe: () => Promise<void> = async () => {
    if (database) {
      const filters: RelayFilters[] = [
        {
          kinds: [10001],
          authors: [publicKey],
          limit: 1,
        },
      ]
      getList(database, 10001, publicKey).then((result) => {
        if (result) {
          const eTags = getETags(result)
          if (eTags.length > 0) {
            filters.push({
              kinds: [Kind.Text],
              authors: eTags.map((tag) => tag[1]),
            })
          }
        }
        relayPool?.subscribe(`profile-bookmarks${publicKey.substring(0, 8)}`, filters)
      })
    }
  }

  const loadNotes: () => void = async () => {
    if (database) {
      const bookmarks = await getList(database, 10001, publicKey)
      const eTags = getETags(bookmarks).map((tag) => tag[1])
      if (eTags.length > 0) {
        getNotes(database, { filters: { id: eTags } }).then((results) => {
          if (results.length > 0) {
            setNotes(results)
            setRefreshing(false)
            if (results.length > 0) {
              relayPool?.subscribe(`profile-bookmarks-answers${publicKey.substring(0, 8)}`, [
                {
                  kinds: [Kind.Reaction, Kind.Text, Kind.RecommendRelay, 9735],
                  '#e': results.map((note) => note.id ?? ''),
                },
                {
                  kinds: [Kind.Metadata],
                  ids: results.map((note) => note.pubkey ?? ''),
                },
              ])
            }
          }
        })
      }
    }
  }

  const onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void = (event) => {
    if (handleInfinityScroll(event)) {
      setPageSize(pageSize + initialPageSize)
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
          {t('profilePage.bookmarkFeed.emptyTitle')}
        </Text>
      </View>
    ),
    [],
  )

  return (
    <View style={styles.list}>
      <FlashList
        onScroll={onScroll}
        estimatedItemSize={210}
        showsVerticalScrollIndicator={false}
        data={notes}
        renderItem={renderItem}
        horizontal={false}
        ListFooterComponent={
          notes.length > 0 ? <ActivityIndicator style={styles.loading} animating={true} /> : <></>
        }
        ListEmptyComponent={ListEmptyComponent}
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
    height: 140,
    marginTop: 91,
  },
  activityIndicator: {
    padding: 16,
  },
})

export default BookmarksFeed
