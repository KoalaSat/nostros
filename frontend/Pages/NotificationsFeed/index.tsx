import React, { useCallback, useContext, useEffect, useState } from 'react'
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native'
import { AppContext } from '../../Contexts/AppContext'
import SInfo from 'react-native-sensitive-info'
import { getLastReply, getMentionNotes, Note } from '../../Functions/DatabaseFunctions/Notes'
import NoteCard from '../../Components/NoteCard'
import { RelayPoolContext } from '../../Contexts/RelayPoolContext'
import { Kind } from 'nostr-tools'
import { handleInfinityScroll } from '../../Functions/NativeFunctions'
import { UserContext } from '../../Contexts/UserContext'
import { ActivityIndicator, Button, Text, useTheme } from 'react-native-paper'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import { useTranslation } from 'react-i18next'
import { navigate } from '../../lib/Navigation'
import { useFocusEffect } from '@react-navigation/native'
import { getLastReaction } from '../../Functions/DatabaseFunctions/Reactions'
import { getUnixTime } from 'date-fns'
import { Config } from '../../Functions/DatabaseFunctions/Config'
import { FlashList, ListRenderItem } from '@shopify/flash-list'

export const NotificationsFeed: React.FC = () => {
  const theme = useTheme()
  const { t } = useTranslation('common')
  const { database, setNotificationSeenAt, pushedTab } = useContext(AppContext)
  const { publicKey } = useContext(UserContext)
  const initialPageSize = 10
  const { lastEventId, relayPool } = useContext(RelayPoolContext)
  const [pageSize, setPageSize] = useState<number>(initialPageSize)
  const [notes, setNotes] = useState<Note[]>([])
  const [refreshing, setRefreshing] = useState(true)
  const flashListRef = React.useRef<FlashList<Note>>(null)

  useFocusEffect(
    React.useCallback(() => {
      subscribeNotes()
      loadNotes()
      updateLastSeen()
      return () => {
        relayPool?.unsubscribe([
          'notification-feed',
          'notification-replies',
          'notification-reactions',
          'notification-meta',
        ])
        updateLastSeen()
      }
    }, []),
  )

  useEffect(() => {
    loadNotes()
    setRefreshing(false)
  }, [lastEventId])

  useEffect(() => {
    if (pageSize > initialPageSize) {
      subscribeNotes()
      loadNotes()
    }
  }, [pageSize])

  useEffect(() => {
    if (pushedTab) {
      flashListRef.current?.scrollToIndex({ animated: true, index: 0 })
    }
  }, [pushedTab])

  const updateLastSeen: () => void = () => {
    const unixtime = getUnixTime(new Date())
    setNotificationSeenAt(unixtime)
    SInfo.getItem('config', {}).then((result) => {
      const config: Config = JSON.parse(result)
      config.last_notification_seen_at = unixtime
      SInfo.setItem('config', JSON.stringify(config), {})
    })
  }

  const subscribeNotes: () => void = async () => {
    if (!publicKey) return

    relayPool?.subscribe('notification-feed', [
      {
        kinds: [Kind.Text],
        '#p': [publicKey],
        limit: pageSize,
      },
      {
        kinds: [Kind.Text],
        '#e': [publicKey],
        limit: pageSize,
      },
    ])
  }

  const loadNotes: () => void = () => {
    if (database && publicKey) {
      getMentionNotes(database, publicKey, pageSize).then(async (notes) => {
        setNotes(notes)
        setRefreshing(false)
        if (notes.length > 0) {
          const notedIds = notes.map((note) => note.id ?? '')
          const authors = notes.map((note) => note.pubkey ?? '')
          const lastReaction = await getLastReaction(database, { eventIds: notedIds })
          const lastReply = await getLastReply(database, { eventIds: notedIds })

          relayPool?.subscribe('notification-meta', [
            {
              kinds: [Kind.Metadata],
              authors,
            },
            {
              kinds: [Kind.Reaction],
              '#e': notedIds,
              since: lastReaction?.created_at ?? 0,
            },
            {
              kinds: [Kind.Text],
              '#e': notedIds,
              since: lastReply?.created_at ?? 0,
            },
          ])
        }
      })
    }
  }

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    if (relayPool && publicKey) {
      subscribeNotes()
    }
  }, [])

  const renderItem: ListRenderItem<Note> = ({ item }) => {
    return (
      <View style={styles.noteCard} key={item.id}>
        <NoteCard note={item} />
      </View>
    )
  }

  const onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void = (event) => {
    if (handleInfinityScroll(event)) {
      setPageSize(pageSize + initialPageSize)
    }
  }

  const ListEmptyComponent = React.useMemo(
    () => (
      <View style={styles.blank}>
        <MaterialCommunityIcons
          name='bell-outline'
          size={64}
          style={styles.center}
          color={theme.colors.onPrimaryContainer}
        />
        <Text variant='headlineSmall' style={styles.center}>
          {t('notificationsFeed.emptyTitle')}
        </Text>
        <Text variant='bodyMedium' style={styles.center}>
          {t('notificationsFeed.emptyDescription')}
        </Text>
        <Button mode='contained' compact onPress={() => navigate('Send')}>
          {t('notificationsFeed.emptyButton')}
        </Button>
      </View>
    ),
    [],
  )

  return (
    <View style={styles.container}>
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
        ListFooterComponent={<ActivityIndicator animating={true} />}
        ref={flashListRef}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingLeft: 16,
    paddingRight: 16,
  },
  noteCard: {
    marginBottom: 16,
  },
  center: {
    alignContent: 'center',
    textAlign: 'center',
  },
  blank: {
    justifyContent: 'space-between',
    height: 220,
    marginTop: 139,
    paddingLeft: 16,
    paddingRight: 16,
  },
})

export default NotificationsFeed
