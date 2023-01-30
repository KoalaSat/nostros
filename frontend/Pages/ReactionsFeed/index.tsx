import React, { useCallback, useContext, useState, useEffect } from 'react'
import {
  ListRenderItem,
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native'
import { AppContext } from '../../Contexts/AppContext'
import { getLastReply, getReactedNotes, Note } from '../../Functions/DatabaseFunctions/Notes'
import { handleInfinityScroll } from '../../Functions/NativeFunctions'
import { UserContext } from '../../Contexts/UserContext'
import { RelayPoolContext } from '../../Contexts/RelayPoolContext'
import { Kind } from 'nostr-tools'
import { RelayFilters } from '../../lib/nostr/RelayPool/intex'
import { ActivityIndicator, Text } from 'react-native-paper'
import NoteCard from '../../Components/NoteCard'
import { useTheme } from '@react-navigation/native'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import { t } from 'i18next'
import { FlatList } from 'react-native-gesture-handler'
import { getLastReaction } from '../../Functions/DatabaseFunctions/Reactions'

interface ReactionsFeedProps {
  navigation: any
  setProfileCardPubKey: (profileCardPubKey: string) => void
}

export const ReactionsFeed: React.FC<ReactionsFeedProps> = ({
  navigation,
  setProfileCardPubKey,
}) => {
  const theme = useTheme()
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

    const message: RelayFilters = {
      kinds: [Kind.Reaction],
      authors: [publicKey],
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
      getReactedNotes(database, publicKey, pageSize).then((notes) => {
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

  return (
    <View>
      {notes && notes.length > 0 ? (
        <ScrollView
          onScroll={onScroll}
          horizontal={false}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <FlatList showsVerticalScrollIndicator={false} data={notes} renderItem={renderItem} />
          {notes.length >= initialPageSize && (
            <ActivityIndicator animating={true} style={styles.activityIndicator} />
          )}
        </ScrollView>
      ) : (
        <View style={styles.blank}>
          <View style={styles.blankIcon}>
            <MaterialCommunityIcons
              name='thumb-up-outline'
              size={64}
              style={styles.center}
              color={theme.colors.onPrimaryContainer}
            />
            <MaterialCommunityIcons
              name='thumb-down-outline'
              size={64}
              style={styles.center}
              color={theme.colors.onPrimaryContainer}
            />
          </View>
          <Text variant='headlineSmall' style={styles.center}>
            {t('reactionsFeed.emptyTitle')}
          </Text>
          <Text variant='bodyMedium' style={styles.center}>
            {t('reactionsFeed.emptyDescription')}
          </Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  noteCard: {
    marginTop: 16,
  },
  blankIcon: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  center: {
    alignContent: 'center',
    textAlign: 'center',
  },
  blank: {
    justifyContent: 'space-between',
    height: 158,
    marginTop: 91,
  },
  activityIndicator: {
    padding: 16,
  },
})

export default ReactionsFeed
