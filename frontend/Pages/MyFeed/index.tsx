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
import { getLastReply, getMainNotes, Note } from '../../Functions/DatabaseFunctions/Notes'
import { handleInfinityScroll } from '../../Functions/NativeFunctions'
import { UserContext } from '../../Contexts/UserContext'
import { RelayPoolContext } from '../../Contexts/RelayPoolContext'
import { Kind } from 'nostr-tools'
import { RelayFilters } from '../../lib/nostr/RelayPool/intex'
import { ActivityIndicator, Button, Text } from 'react-native-paper'
import NoteCard from '../../Components/NoteCard'
import { useTheme } from '@react-navigation/native'
import { FlashList, ListRenderItem } from '@shopify/flash-list'
import { getLastReaction } from '../../Functions/DatabaseFunctions/Reactions'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import { useTranslation } from 'react-i18next'

interface MyFeedProps {
  navigation: any
  setProfileCardPubKey: (profileCardPubKey: string) => void
}

export const MyFeed: React.FC<MyFeedProps> = ({ navigation, setProfileCardPubKey }) => {
  const theme = useTheme()
  const { t } = useTranslation('common')
  const { database } = useContext(AppContext)
  const { publicKey } = useContext(UserContext)
  const { lastEventId, relayPool, lastConfirmationtId } = useContext(RelayPoolContext)
  const initialPageSize = 10
  const [notes, setNotes] = useState<Note[]>([])
  const [pageSize, setPageSize] = useState<number>(initialPageSize)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
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
    subscribeNotes()
  }, [])

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

  const onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void = (event) => {
    if (handleInfinityScroll(event)) {
      setPageSize(pageSize + initialPageSize)
    }
  }

  const loadNotes: () => void = () => {
    if (database && publicKey) {
      getMainNotes(database, publicKey, pageSize, true).then((notes) => {
        setNotes(notes)
        if (notes.length > 0) {
          relayPool?.subscribe('homepage-contacts-meta', [
            {
              kinds: [Kind.Metadata],
              authors: notes.map((note) => note.pubkey ?? ''),
            },
          ])
          const noteIds = notes.map((note) => note.id ?? '')
          getLastReaction(database, { eventIds: notes.map((note) => note.id ?? '') }).then(
            (lastReaction) => {
              relayPool?.subscribe('homepage-reactions', [
                {
                  kinds: [Kind.Reaction],
                  '#e': noteIds,
                  since: lastReaction?.created_at ?? 0,
                },
              ])
            },
          )
          const repostIds = notes.filter((note) => note.repost_id).map((note) => note.id ?? '')
          getLastReply(database, { eventIds: notes.map((note) => note.id ?? '') }).then(
            (lastReply) => {
              relayPool?.subscribe('homepage-replies', [
                {
                  kinds: [Kind.Text],
                  '#e': noteIds,
                  since: lastReply?.created_at ?? 0,
                },
                {
                  kinds: [Kind.Text],
                  '#e': repostIds,
                },
              ])
            },
          )
        }
      })
    }
  }

  const renderItem: ListRenderItem<Note> = ({ item }) => {
    return (
      <View style={styles.noteCard} key={item.id}>
        <NoteCard
          note={item}
          onPressUser={(user) => {
            setProfileCardPubKey(user.id)
          }}
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
        ListFooterComponent={<ActivityIndicator animating={true} />}
      />
    </View>
  )
}

const styles = StyleSheet.create({
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
