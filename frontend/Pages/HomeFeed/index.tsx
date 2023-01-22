import React, { useCallback, useContext, useState, useEffect } from 'react'
import { getUsers, User } from '../../Functions/DatabaseFunctions/Users'
import {
  Dimensions,
  ListRenderItem,
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native'
import { AppContext } from '../../Contexts/AppContext'
import { getLastReply, getMainNotes, Note } from '../../Functions/DatabaseFunctions/Notes'
import { handleInfinityScroll } from '../../Functions/NativeFunctions'
import { UserContext } from '../../Contexts/UserContext'
import { RelayPoolContext } from '../../Contexts/RelayPoolContext'
import { EventKind } from '../../lib/nostr/Events'
import { RelayFilters } from '../../lib/nostr/RelayPool/intex'
import { ActivityIndicator, AnimatedFAB, Button, Text } from 'react-native-paper'
import NoteCard from '../../Components/NoteCard'
import RBSheet from 'react-native-raw-bottom-sheet'
import ProfileCard from '../../Components/ProfileCard'
import { useFocusEffect, useTheme } from '@react-navigation/native'
import { navigate } from '../../lib/Navigation'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import { t } from 'i18next'
import { FlatList } from 'react-native-gesture-handler'
import { getLastReaction } from '../../Functions/DatabaseFunctions/Reactions'

interface HomeFeedProps {
  navigation: any
}

export const HomeFeed: React.FC<HomeFeedProps> = ({ navigation }) => {
  const theme = useTheme()
  const { database } = useContext(AppContext)
  const { publicKey, privateKey } = useContext(UserContext)
  const { lastEventId, relayPool, lastConfirmationtId } = useContext(RelayPoolContext)
  const initialPageSize = 10
  const [notes, setNotes] = useState<Note[]>([])
  const [pageSize, setPageSize] = useState<number>(initialPageSize)
  const [refreshing, setRefreshing] = useState(false)
  const [profileCardPubkey, setProfileCardPubKey] = useState<string>()
  const bottomSheetProfileRef = React.useRef<RBSheet>(null)

  useFocusEffect(
    React.useCallback(() => {
      subscribeNotes()
      loadNotes()

      return () =>
        relayPool?.unsubscribe([
          'homepage-main',
          'homepage-reactions',
          'homepage-contacts-meta',
          'homepage-replies',
        ])
    }, []),
  )

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

    const lastNotes: Note[] = await getMainNotes(database, publicKey, initialPageSize)
    const lastNote: Note = lastNotes[lastNotes.length - 1]

    const message: RelayFilters = {
      kinds: [EventKind.textNote, EventKind.recommendServer],
      authors,
    }
    if (lastNote && lastNotes.length >= pageSize && !past) {
      message.since = lastNote?.created_at
    } else {
      message.limit = pageSize + initialPageSize
    }
    relayPool?.subscribe('homepage-main', [message])
    relayPool?.subscribe('homepage-contacts-meta', [
      {
        kinds: [EventKind.meta],
        authors: users.map((user) => user.id),
      },
    ])
    setRefreshing(false)
  }

  const onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void = (event) => {
    if (handleInfinityScroll(event)) {
      setPageSize(pageSize + initialPageSize)
    }
  }

  const loadNotes: () => void = () => {
    if (database && publicKey) {
      getMainNotes(database, publicKey, pageSize).then((notes) => {
        setNotes(notes)
        if (notes.length > 0) {
          const notedIds = notes.map((note) => note.id ?? '')
          getLastReaction(database, { eventIds: notes.map((note) => note.id ?? '') }).then(
            (lastReaction) => {
              relayPool?.subscribe('homepage-reactions', [
                {
                  kinds: [EventKind.reaction],
                  '#e': notedIds,
                  since: lastReaction?.created_at ?? 0,
                },
              ])
            },
          )
          getLastReply(database, { eventIds: notes.map((note) => note.id ?? '') }).then(
            (lastReply) => {
              relayPool?.subscribe('homepage-replies', [
                {
                  kinds: [EventKind.textNote],
                  '#e': notedIds,
                  since: lastReply?.created_at ?? 0,
                },
              ])
            },
          )
        }
      })
    }
  }

  const renderItem: ListRenderItem<Note> = ({ item, index }) => {
    return (
      <View style={styles.noteCard} key={item.id}>
        <NoteCard
          note={item}
          onPressUser={(user) => {
            setProfileCardPubKey(user.id)
            bottomSheetProfileRef.current?.open()
          }}
        />
      </View>
    )
  }

  const bottomSheetStyles = React.useMemo(() => {
    return {
      container: {
        backgroundColor: theme.colors.background,
        padding: 16,
        borderTopRightRadius: 28,
        borderTopLeftRadius: 28,
      },
    }
  }, [])

  return (
    <View style={styles.container}>
      {notes && notes.length > 0 ? (
        <ScrollView
          onScroll={onScroll}
          horizontal={false}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <FlatList showsVerticalScrollIndicator={false} data={notes} renderItem={renderItem} />
          {notes.length >= 10 && <ActivityIndicator animating={true} />}
        </ScrollView>
      ) : (
        <View style={styles.blank}>
          <MaterialCommunityIcons name='account-group-outline' size={64} style={styles.center} />
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
      )}
      {privateKey && (
        <AnimatedFAB
          style={[styles.fab, { top: Dimensions.get('window').height - 200 }]}
          icon='pencil-outline'
          label='Label'
          onPress={() => navigate('Send')}
          animateFrom='right'
          iconMode='static'
          extended={false}
        />
      )}
      <RBSheet
        ref={bottomSheetProfileRef}
        closeOnDragDown={true}
        height={280}
        customStyles={bottomSheetStyles}
      >
        <ProfileCard userPubKey={profileCardPubkey ?? ''} bottomSheetRef={bottomSheetProfileRef} />
      </RBSheet>
    </View>
  )
}

const styles = StyleSheet.create({
  noteCard: {
    marginBottom: 16,
  },
  fab: {
    right: 16,
    position: 'absolute',
  },
  container: {
    paddingLeft: 16,
    paddingRight: 16,
    flex: 1,
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
})

export default HomeFeed
