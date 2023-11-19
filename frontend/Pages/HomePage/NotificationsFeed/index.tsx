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
import { type Note } from '../../../Functions/DatabaseFunctions/Notes'
import { RelayPoolContext } from '../../../Contexts/RelayPoolContext'
import { Kind } from 'nostr-tools'
import { UserContext } from '../../../Contexts/UserContext'
import { ActivityIndicator, Button, Divider, Text, useTheme } from 'react-native-paper'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import { navigate } from '../../../lib/Navigation'
import { useFocusEffect } from '@react-navigation/native'
import { format, fromUnixTime, getUnixTime } from 'date-fns'
import { FlashList, type ListRenderItem } from '@shopify/flash-list'
import { formatPubKey, username } from '../../../Functions/RelayFunctions/Users'
import { TouchableWithoutFeedback } from 'react-native-gesture-handler'
import { formatDate, handleInfinityScroll } from '../../../Functions/NativeFunctions'
import { useTranslation } from 'react-i18next'
import {
  getNotifications,
  type Notification,
} from '../../../Functions/DatabaseFunctions/Notifications'
import { getTaggedEventIds } from '../../../Functions/RelayFunctions/Events'
import ParsedText from 'react-native-parsed-text'
import { getUser } from '../../../Functions/DatabaseFunctions/Users'
import { getNpub } from '../../../lib/nostr/Nip19'

export const NotificationsFeed: React.FC = () => {
  const initialLimitPage = React.useMemo(() => 20, [])
  const theme = useTheme()
  const { t } = useTranslation('common')
  const { database, setNotificationSeenAt, pushedTab, getSatoshiSymbol } = useContext(AppContext)
  const { publicKey, reloadLists, mutedEvents, mutedUsers } = useContext(UserContext)
  const { lastEventId, relayPool, setNewNotifications } = useContext(RelayPoolContext)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [refreshing, setRefreshing] = useState(true)
  const flashListRef = React.useRef<FlashList<Note>>(null)
  const [limitPage, setLimitPage] = useState<number>(initialLimitPage)
  const [userNames, setUserNames] = useState<Record<string, string>>({})
  const [loadedUsers, setLoadedUsers] = useState<number>(0)

  useFocusEffect(
    React.useCallback(() => {
      subscribeNotes()
      loadNotes()
      updateLastSeen()
      return () => {
        relayPool?.unsubscribe([
          `notification-feed${publicKey?.substring(0, 8)}`,
          `notification-users${publicKey?.substring(0, 8)}`,
        ])
        updateLastSeen()
      }
    }, []),
  )

  useEffect(() => {
    loadNotes()
    reloadLists()
    setRefreshing(false)
    setNewNotifications(0)
  }, [lastEventId])

  useEffect(() => {
    loadNotes()
  }, [mutedEvents, loadedUsers])

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
    if (!publicKey || !database) return
    relayPool?.subscribe(`notification-feed${publicKey?.substring(0, 8)}`, [
      {
        kinds: [Kind.Text],
        limit: limitPage,
        '#p': [publicKey],
      },
      {
        kinds: [Kind.Reaction, 9735],
        limit: limitPage,
        '#p': [publicKey],
      },
      {
        kinds: [30001],
        authors: [publicKey],
      },
    ])
  }

  const loadNotes: () => void = async () => {
    if (database && publicKey) {
      getNotifications(database, { limit: limitPage }).then((results) => {
        const filtered = results.filter((event) => {
          const eTags = getTaggedEventIds(event)
          return !mutedUsers.includes(event.pubkey) && !mutedEvents.some((id) => eTags.includes(id))
        })
        if (filtered.length > 0) {
          setNotifications(filtered)
          const pubKeys = filtered
            .map((n) => n.zapper_user_id ?? n.pubkey)
            .filter((key, index, array) => array.indexOf(key) === index)
          relayPool?.subscribe(`notification-users${publicKey?.substring(0, 8)}`, [
            {
              kinds: [Kind.Metadata],
              authors: pubKeys,
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

  useEffect(() => {
    if (limitPage < initialLimitPage) {
      loadNotes()
    }
  }, [limitPage])

  const generateItemVariables: (item: Notification) => {
    noteId: string | undefined
    content: string
    icon: string
    iconColor: string
    description: string
    name: string
    pubkey: string
  } = (item) => {
    let noteId: string | undefined = item.event_id
    let content: string = item.content.replace(/nostr:\S*/, '').trim()
    let icon: string
    let iconColor: string
    let description: string
    let name: string = item.name
    let pubkey: string = item.pubkey

    if (item.kind === 9735) {
      icon = 'lightning-bolt'
      iconColor = '#F5D112'
      description = 'notificationsFeed.zap'
      name = item.zapper_name ?? formatPubKey(getNpub(item.zapper_user_id))
      pubkey = item.zapper_user_id
    } else if (item.kind === Kind.Reaction) {
      content = ''
      if (item.content === '-') {
        icon = 'thumb-down'
        iconColor = theme.colors.error
        description = 'notificationsFeed.dislike'
      } else {
        icon = 'thumb-up'
        iconColor = theme.colors.onPrimaryContainer
        description = 'notificationsFeed.like'
      }
    } else if (item.event_id) {
      noteId = item.id
      icon = 'cached'
      iconColor = '#7ADC70'
      description = 'notificationsFeed.reposted'
    } else {
      noteId = item.id
      icon = 'message-outline'
      iconColor = theme.colors.onPrimaryContainer
      description = 'notificationsFeed.replied'
    }

    return {
      noteId,
      content,
      icon,
      iconColor,
      description,
      name,
      pubkey
    }
  }

  const renderItem: ListRenderItem<Notification> = ({ item }) => {
    const date = fromUnixTime(item.created_at)
    const { noteId, content, icon, iconColor, description, name, pubkey } = generateItemVariables(item)

    const renderMentionText: (matchingString: string, matches: string[]) => string = (
      matchingString,
      matches,
    ) => {
      const mentionIndex: number = parseInt(matches[1])

      if (userNames[mentionIndex]) {
        return `@${userNames[mentionIndex]}`
      } else if (item) {
        const tag = item.tags[mentionIndex]

        if (tag) {
          const kind = tag[0]
          const pubKey = tag[1]

          if (kind === 'e') return ''

          if (database) {
            getUser(pubKey, database).then((user) => {
              setLoadedUsers(getUnixTime(new Date()))
              setUserNames((prev) => {
                if (user?.name) prev[mentionIndex] = user.name
                return prev
              })
            })
          }
          return `@${formatPubKey(getNpub(pubKey))}`
        } else {
          return matchingString
        }
      } else {
        return matchingString
      }
    }

    return (
      <TouchableWithoutFeedback onPress={() => noteId && navigate('Note', { noteId })}>
        <View style={styles.itemCard} key={item.id}>
          <View style={styles.itemCardIcon}>
            <MaterialCommunityIcons name={icon} size={25} color={iconColor} />
          </View>
          <View style={styles.itemCardInfo}>
            <Text style={[styles.itemCardText, { color: theme.colors.onSurfaceVariant }]}>
              {username({ name, id: pubkey })}
            </Text>
            <Text style={styles.itemCardText}>
              {t(description, { amount: item.amount ?? '' })}
              {item.kind === 9735 && getSatoshiSymbol(16)}
            </Text>
            {content !== '' && (

              <ParsedText
                style={[styles.itemCardText, { color: theme.colors.onSurfaceVariant }]}
                numberOfLines={
                  item.kind === 9735 || (item.kind === Kind.Text && !item.event_id) ? undefined : 1
                }
                parse={[
                  {
                    pattern: /#\[(\d+)\]/,
                    renderText: renderMentionText,
                  },
                  // { pattern: /\b(nostr:)?(nevent1|note1)\S+\b/, renderText: renderNote },
                  // { pattern: /\b(nostr:)?(npub1|nprofile1)\S+\b/, renderText: renderProfile },
                ]}
                childrenProps={{ allowFontScaling: false }}
              >
                {content}
              </ParsedText>
            )}
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
      setLimitPage(limitPage + initialLimitPage)
    }
  }

  return (
    <View style={styles.container}>
      <FlashList
        showsVerticalScrollIndicator={false}
        data={notifications.sort((a, b) => b.created_at - a.created_at)}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        refreshing={refreshing}
        ListEmptyComponent={ListEmptyComponent}
        horizontal={false}
        estimatedItemSize={100}
        ListFooterComponent={
          notifications.length > 0 ? (
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
