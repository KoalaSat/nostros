import React, { useCallback, useContext, useEffect, useState } from 'react'
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native'
import { AppContext, type Config } from '../../../Contexts/AppContext'
import SInfo from 'react-native-sensitive-info'
import { getMentionNotes, getNotes, type Note } from '../../../Functions/DatabaseFunctions/Notes'
import { RelayPoolContext } from '../../../Contexts/RelayPoolContext'
import { Kind } from 'nostr-tools'
import { UserContext } from '../../../Contexts/UserContext'
import { ActivityIndicator, Button, Divider, Text, useTheme } from 'react-native-paper'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import { navigate } from '../../../lib/Navigation'
import { useFocusEffect } from '@react-navigation/native'
import { format, fromUnixTime, getUnixTime } from 'date-fns'
import { FlashList, type ListRenderItem } from '@shopify/flash-list'
import { getETags } from '../../../Functions/RelayFunctions/Events'
import { getReactions, type Reaction } from '../../../Functions/DatabaseFunctions/Reactions'
import { getUsers, type User } from '../../../Functions/DatabaseFunctions/Users'
import { username } from '../../../Functions/RelayFunctions/Users'
import { TouchableWithoutFeedback } from 'react-native-gesture-handler'
import { getUserZaps, type Zap } from '../../../Functions/DatabaseFunctions/Zaps'
import { formatDate, handleInfinityScroll } from '../../../Functions/NativeFunctions'
import { useTranslation } from 'react-i18next'

export const NotificationsFeed: React.FC = () => {
  const initialLimitDate = React.useMemo(() => getUnixTime(new Date()) - 86400, [])
  const theme = useTheme()
  const { t } = useTranslation('common')
  const { database, setNotificationSeenAt, pushedTab, getSatoshiSymbol } = useContext(AppContext)
  const { publicKey, reloadLists, mutedEvents, mutedUsers } = useContext(UserContext)
  const { lastEventId, relayPool } = useContext(RelayPoolContext)
  const [pubKeys, setPubKeys] = React.useState<string[]>([])
  const [users, setUsers] = React.useState<User[]>([])
  const [userNotes, setUserNotes] = useState<Note[]>([])
  const [mentionNotes, setMentionNotes] = useState<Note[]>([])
  const [reactions, setReaction] = useState<Reaction[]>([])
  const [zaps, setZaps] = useState<Zap[]>([])
  const [refreshing, setRefreshing] = useState(true)
  const flashListRef = React.useRef<FlashList<Note>>(null)
  const [limitDate, setLimitDate] = useState<number>(initialLimitDate)

  useFocusEffect(
    React.useCallback(() => {
      subscribeNotes()
      loadNotes()
      updateLastSeen()
      return () => {
        relayPool?.unsubscribe([
          'notification-feed',
          'notification-reactions',
          'notification-users',
        ])
        updateLastSeen()
      }
    }, []),
  )

  useEffect(() => {
    loadNotes()
    reloadLists()
    setRefreshing(false)
  }, [lastEventId])

  useEffect(() => {
    if (mutedEvents.length > 0) loadNotes()
  }, [mutedEvents])

  useEffect(() => {
    if (pushedTab) {
      flashListRef.current?.scrollToIndex({ animated: true, index: 0 })
    }
  }, [pushedTab])

  useEffect(() => {
    if (database && pubKeys.length > 0) {
      getUsers(database, { includeIds: pubKeys }).then(setUsers)
      relayPool?.subscribe('notification-users', [
        {
          kinds: [Kind.Metadata],
          authors: pubKeys.filter((key, index, array) => array.indexOf(key) === index),
        },
      ])
    }
  }, [pubKeys])

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
    if (!publicKey || !database) return

    getNotes(database, { filters: { pubkey: [publicKey] }, limitDate }).then((results) => {
      if (results) {
        setUserNotes(results)
        const eventIds = results.map((e) => e.id ?? '')
        if (eventIds.length > 0) {
          relayPool?.subscribe('notification-reactions', [
            {
              kinds: [Kind.Reaction, 9735],
              '#e': eventIds,
            },
          ])
        }
      }
    })
    relayPool?.subscribe('notification-feed', [
      {
        kinds: [Kind.Text],
        '#p': [publicKey],
      },
      {
        kinds: [Kind.Text],
        '#e': [publicKey],
      },
      {
        kinds: [30001],
        authors: [publicKey],
      },
    ])
  }

  const loadNotes: () => void = async () => {
    if (database && publicKey) {
      getReactions(database, { reactedUser: publicKey, limitDate }).then((results) => {
        setPubKeys((prev) => [...prev, ...results.map((res) => res.pubkey)])
        setReaction(results)
      })
      getUserZaps(database, publicKey, limitDate).then((results) => {
        setZaps(results)
        setPubKeys((prev) => [...prev, ...results.map((res) => res.zapper_user_id)])
      })
      getMentionNotes(database, publicKey, limitDate).then(async (notes) => {
        const unmutedThreads = notes.filter((note) => {
          if (!note?.id) return false
          const eTags = getETags(note)
          return (
            !eTags.some((tag) => mutedEvents.includes(tag[1])) && !mutedUsers.includes(note.pubkey)
          )
        })
        setMentionNotes(unmutedThreads)
        setRefreshing(false)
        if (notes.length > 0) {
          setPubKeys((prev) => [...prev, ...notes.map((note) => note.pubkey ?? '')])
          if (notes.length < 5) {
            setLimitDate(limitDate - 86400)
          }
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

  useEffect(() => {
    if (limitDate < initialLimitDate) {
      loadNotes()
    }
  }, [limitDate])

  const generateItemVariables: (item: Note | Reaction | Zap) => {
    user: User | undefined
    eventId: string | undefined
    content: string | undefined
    icon: string
    iconColor: string
    description: string
  } = (item) => {
    let note: Note | undefined
    let user: User | undefined
    let content: string | undefined
    let eventId: string | undefined
    let icon: string
    let iconColor: string
    let description: string

    if (item.kind === 9735) {
      note = userNotes.find((note) => note.id === item.zapped_event_id)
      user = users.find((user) => user.id === item.zapper_user_id)
      const zapDescription = item.tags?.find((tag) => tag[0] === 'description')
      content = zapDescription ? JSON.parse(zapDescription[1])?.content : ''
      eventId = note?.id
      icon = 'lightning-bolt'
      iconColor = '#F5D112'
      description = 'notificationsFeed.zap'
    } else if (item.kind === Kind.Reaction) {
      note = userNotes.find((note) => note.id === item.reacted_event_id)
      user = users.find((user) => user.id === item.pubkey)
      content = note?.content
      eventId = note?.id
      if (item.content === '-') {
        icon = 'thumb-down'
        iconColor = theme.colors.error
        description = 'notificationsFeed.dislike'
      } else {
        icon = 'thumb-up'
        iconColor = theme.colors.onPrimaryContainer
        description = 'notificationsFeed.like'
      }
    } else if (item.repost_id) {
      note = userNotes.find((note) => note.id === item.repost_id)
      user = users.find((user) => user.id === item.pubkey)
      content = note?.content
      eventId = note?.id
      icon = 'cached'
      iconColor = '#7ADC70'
      description = 'notificationsFeed.reposted'
    } else {
      note = userNotes.find((note) => note.id === item.reacted_event_id)
      user = users.find((user) => user.id === item.pubkey)
      content = item?.content
      eventId = item?.id
      icon = 'message-outline'
      iconColor = theme.colors.onPrimaryContainer
      description = 'notificationsFeed.replied'
    }

    return {
      eventId,
      content,
      user,
      icon,
      iconColor,
      description,
    }
  }

  const renderItem: ListRenderItem<Note | Reaction | Zap> = ({ item }) => {
    const date = fromUnixTime(item.created_at)
    const { user, icon, iconColor, description, content, eventId } = generateItemVariables(item)

    return (
      <TouchableWithoutFeedback onPress={() => navigate('Note', { noteId: eventId })}>
        <View style={styles.itemCard} key={item.id}>
          <View style={styles.itemCardIcon}>
            <MaterialCommunityIcons name={icon} size={25} color={iconColor} />
          </View>
          <View style={styles.itemCardInfo}>
            <Text style={[styles.itemCardText, { color: theme.colors.onSurfaceVariant }]}>
              {username(user)}
            </Text>
            <Text style={styles.itemCardText}>
              {t(description, { amount: item.amount ?? '' })}
              {item.kind === 9735 && getSatoshiSymbol(16)}
            </Text>
            <Text
              style={[styles.itemCardText, { color: theme.colors.onSurfaceVariant }]}
              numberOfLines={
                item.kind === 9735 || (item.kind === Kind.Text && !item.repost_id) ? undefined : 1
              }
            >
              {content?.replace(/#\[\d\]/, '')}
            </Text>
          </View>
          <View style={styles.itemCardDates}>
            <Text style={styles.itemCardDatesText}>{formatDate(item.created_at, false)}</Text>
            <Text style={styles.itemCardDatesText}>{format(date, 'HH:mm')}</Text>
          </View>
        </View>
      </TouchableWithoutFeedback>
    )
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

  const onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void = (event) => {
    if (handleInfinityScroll(event)) {
      setLimitDate(limitDate - 86400)
    }
  }

  return (
    <View style={styles.container}>
      <FlashList
        showsVerticalScrollIndicator={false}
        data={[...mentionNotes, ...reactions, ...zaps].sort((a, b) => b.created_at - a.created_at)}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        refreshing={refreshing}
        ListEmptyComponent={ListEmptyComponent}
        horizontal={false}
        ListFooterComponent={
          mentionNotes.length > 0 ? (
            <ActivityIndicator style={styles.loading} animating={true} />
          ) : (
            <></>
          )
        }
        ref={flashListRef}
        ItemSeparatorComponent={Divider}
        onScroll={onScroll}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  loading: {
    paddingTop: 16,
  },
  container: {
    flex: 1,
    padding: 0,
  },
  noteCard: {
    marginBottom: 16,
    marginTop: 16,
    paddingLeft: 16,
    paddingRight: 16,
  },
  itemCard: {
    marginBottom: 16,
    marginTop: 16,
    paddingLeft: 16,
    paddingRight: 16,
    flexDirection: 'row',
  },
  itemCardDates: {
    alignContent: 'flex-end',
    width: '20%',
  },
  itemCardText: {
    justifyContent: 'flex-start',
    alignContent: 'flex-start',
  },
  itemCardDatesText: {
    justifyContent: 'flex-end',
    alignContent: 'flex-end',
    textAlign: 'right',
  },
  itemCardInfo: {
    justifyContent: 'flex-start',
    alignContent: 'flex-start',
    width: '70%',
  },
  itemCardIcon: {
    width: '10%',
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
