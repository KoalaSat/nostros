import React, { useCallback, useContext, useState, useEffect } from 'react'
import {
  ActivityIndicator,
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native'
import { AppContext } from '../../../Contexts/AppContext'
import { getMainNotes, getMainNotesCount, Note } from '../../../Functions/DatabaseFunctions/Notes'
import { handleInfinityScroll } from '../../../Functions/NativeFunctions'
import { UserContext } from '../../../Contexts/UserContext'
import { RelayPoolContext } from '../../../Contexts/RelayPoolContext'
import { Kind } from 'nostr-tools'
import { RelayFilters } from '../../../lib/nostr/RelayPool/intex'
import { Chip, Button, Text } from 'react-native-paper'
import NoteCard from '../../../Components/NoteCard'
import { useTheme } from '@react-navigation/native'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import { t } from 'i18next'
import { FlashList, ListRenderItem } from '@shopify/flash-list'

interface GlobalFeedProps {
  navigation: any
  updateLastLoad: () => void
  lastLoadAt: number
  pageSize: number
  setPageSize: (pageSize: number) => void
  activeTab: string
}

export const GlobalFeed: React.FC<GlobalFeedProps> = ({
  navigation,
  updateLastLoad,
  lastLoadAt,
  pageSize,
  setPageSize,
  activeTab,
}) => {
  const initialPageSize = 10
  const theme = useTheme()
  const { database, showPublicImages, pushedTab } = useContext(AppContext)
  const { publicKey } = useContext(UserContext)
  const { lastEventId, relayPool, lastConfirmationtId } = useContext(RelayPoolContext)
  const [notes, setNotes] = useState<Note[]>([])
  const [newNotesCount, setNewNotesCount] = useState<number>(0)
  const [refreshing, setRefreshing] = useState(false)
  const flashListRef = React.useRef<FlashList<Note>>(null)

  useEffect(() => {
    if (pushedTab) {
      flashListRef.current?.scrollToIndex({ animated: true, index: 0 })
    }
  }, [pushedTab])

  useEffect(() => {
    if (relayPool && publicKey && activeTab === 'globalFeed') {
      subscribeGlobal()
      loadNotes()
    }
  }, [lastEventId, lastConfirmationtId, lastLoadAt, relayPool, publicKey, activeTab])

  useEffect(() => {
    if (pageSize > initialPageSize) {
      subscribeGlobal(true)
      loadNotes()
    }
  }, [pageSize])

  const subscribeGlobal: (past?: boolean) => void = (past) => {
    const message: RelayFilters = {
      kinds: [Kind.Text, Kind.RecommendRelay],
      limit: pageSize,
    }

    if (past) message.until = lastLoadAt

    relayPool?.subscribe('homepage-global-main', [message])
  }

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    setNewNotesCount(0)
    updateLastLoad()
    flashListRef.current?.scrollToIndex({ animated: true, index: 0 })
  }, [])

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
      getMainNotes(database, pageSize, {
        until: lastLoadAt,
      }).then((results) => {
        setRefreshing(false)
        if (results.length > 0) {
          setNotes(results)
          const repostIds = notes
            .filter((note) => note.repost_id)
            .map((note) => note.repost_id ?? '')
          if (repostIds.length > 0) {
            const message: RelayFilters[] = [
              {
                kinds: [Kind.Text],
                ids: repostIds,
              },
            ]
            relayPool?.subscribe('homepage-global-reposts', message)
          }
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
          showPreview={showPublicImages}
        />
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
    <View>
      <View style={styles.list}>
        <FlashList
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
      {newNotesCount > 0 && (
        <View style={styles.refreshChipWrapper}>
          <Chip
            icon={() => (
              <MaterialCommunityIcons name='cached' color={theme.colors.onSurface} size={20} />
            )}
            onPress={onRefresh}
            compact
            elevated
            style={styles.refreshChip}
          >
            {t(newNotesCount < 2 ? 'homeFeed.newMessage' : 'homeFeed.newMessages', {
              newNotesCount,
            })}
          </Chip>
        </View>
      )}
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
  refreshChipWrapper: {
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'absolute',
    width: '100%',
  },
  refreshChip: {
    marginTop: 16,
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

export default GlobalFeed
