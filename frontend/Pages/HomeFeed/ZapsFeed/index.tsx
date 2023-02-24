import React, { useCallback, useContext, useState, useEffect } from 'react'
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native'
import { AppContext } from '../../../Contexts/AppContext'
import { getNotes, Note } from '../../../Functions/DatabaseFunctions/Notes'
import { handleInfinityScroll } from '../../../Functions/NativeFunctions'
import { UserContext } from '../../../Contexts/UserContext'
import { RelayPoolContext } from '../../../Contexts/RelayPoolContext'
import { Kind } from 'nostr-tools'
import { RelayFilters } from '../../../lib/nostr/RelayPool/intex'
import { ActivityIndicator, Button, Text } from 'react-native-paper'
import NoteCard from '../../../Components/NoteCard'
import { useTheme } from '@react-navigation/native'
import { FlashList, ListRenderItem } from '@shopify/flash-list'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import { useTranslation } from 'react-i18next'
import { getMostZapedNotesContacts } from '../../../Functions/DatabaseFunctions/Zaps'
import { getUnixTime } from 'date-fns'

interface ZapsFeedProps {
  navigation: any
  updateLastLoad: () => void
  pageSize: number
  setPageSize: (pageSize: number) => void
}

export const ZapsFeed: React.FC<ZapsFeedProps> = ({
  navigation,
  updateLastLoad,
  pageSize,
  setPageSize,
}) => {
  const theme = useTheme()
  const { t } = useTranslation('common')
  const { database, pushedTab } = useContext(AppContext)
  const { publicKey } = useContext(UserContext)
  const { lastEventId, relayPool, lastConfirmationtId } = useContext(RelayPoolContext)
  const initialPageSize = 10
  const [notes, setNotes] = useState<Note[]>()
  const [refreshing, setRefreshing] = useState(false)
  const flashListRef = React.useRef<FlashList<Note>>(null)

  useEffect(() => {
    if (pushedTab) {
      flashListRef.current?.scrollToIndex({ animated: true, index: 0 })
    }
  }, [pushedTab])

  useEffect(() => {
    if (relayPool && publicKey) {
      loadNotes()
    }
  }, [lastEventId, lastConfirmationtId, relayPool, publicKey])

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
      getMostZapedNotesContacts(database, getUnixTime(new Date()) - 86400).then((zaps) => {
        const zappedEventIds = zaps
          .map((zap) => zap.zapped_event_id)
          .filter((id) => id !== '')
          .slice(0, pageSize)
        if (zaps.length > 0) {
          relayPool?.subscribe('homepage-zapped-notes', [
            {
              kinds: [Kind.Text, Kind.RecommendRelay],
              ids: zappedEventIds,
            },
          ])
          getNotes(database, { filters: { id: zappedEventIds } }).then((notes) => {
            setNotes(
              zappedEventIds
                .map((zappedEventId) => {
                  return notes.find((note) => note && note.id === zappedEventId) as Note
                })
                .filter((note) => note !== undefined),
            )
            setRefreshing(false)
            if (notes.length > 0) {
              const noteIds = notes.map((note) => note.id ?? '')
              const authors = notes.map((note) => note.pubkey ?? '')
              const repostIds = notes
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
          })
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
        showsVerticalScrollIndicator={false}
        data={notes}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onScroll={onScroll}
        refreshing={refreshing}
        ListEmptyComponent={notes ? ListEmptyComponent : <></>}
        horizontal={false}
        ListFooterComponent={
          notes && notes.length > 0 ? <ActivityIndicator style={styles.loading} animating={true} /> : <></>
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

export default ZapsFeed
