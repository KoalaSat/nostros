import React, { useCallback, useContext, useState, useEffect } from 'react'
import { getUsers, User } from '../../Functions/DatabaseFunctions/Users'
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native'
import { AppContext } from '../../Contexts/AppContext'
import { getMainNotes, Note } from '../../Functions/DatabaseFunctions/Notes'
import { handleInfinityScroll } from '../../Functions/NativeFunctions'
import { UserContext } from '../../Contexts/UserContext'
import { RelayPoolContext } from '../../Contexts/RelayPoolContext'
import { EventKind } from '../../lib/nostr/Events'
import { RelayFilters } from '../../lib/nostr/RelayPool/intex'
import { ActivityIndicator, AnimatedFAB } from 'react-native-paper'
import NoteCard from '../../Components/NoteCard'
import RBSheet from 'react-native-raw-bottom-sheet'
import ProfileCard from '../../Components/ProfileCard'
import { useTheme } from '@react-navigation/native'
import { navigate } from '../../lib/Navigation'

export const HomeFeed: React.FC = () => {
  const theme = useTheme()
  const { database } = useContext(AppContext)
  const { publicKey } = useContext(UserContext)
  const { lastEventId, relayPool } = useContext(RelayPoolContext)
  const initialPageSize = 10
  const [notes, setNotes] = useState<Note[]>([])
  const [authors, setAuthors] = useState<User[]>([])
  const [pageSize, setPageSize] = useState<number>(initialPageSize)
  const [refreshing, setRefreshing] = useState(true)
  const [firstLoad, setFirstLoad] = useState(true)
  const [profileCardPubkey, setProfileCardPubKey] = useState<string>()
  const bottomSheetProfileRef = React.useRef<RBSheet>(null)

  useEffect(() => {
    relayPool?.unsubscribeAll()
    if (relayPool && publicKey) {
      setFirstLoad(false)
      calculateInitialNotes().then(() => loadNotes())
    }
  }, [publicKey, relayPool])

  useEffect(() => {
    if (!firstLoad) {
      loadNotes()
    }
  }, [lastEventId])

  useEffect(() => {
    if (pageSize > initialPageSize) {
      relayPool?.unsubscribeAll()
      subscribeNotes(authors, true)
      loadNotes()
    }
  }, [pageSize])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    relayPool?.unsubscribeAll()
    if (relayPool && publicKey) {
      calculateInitialNotes().then(() => loadNotes())
    }
  }, [])

  const subscribeNotes: (users: User[], past?: boolean) => void = async (users, past) => {
    if (!database || !publicKey) return

    const lastNotes: Note[] = await getMainNotes(database, publicKey, initialPageSize)
    const lastNote: Note = lastNotes[lastNotes.length - 1]

    const message: RelayFilters = {
      kinds: [EventKind.textNote, EventKind.recommendServer],
      authors: [...users.map((user) => user.id), publicKey],
    }

    if (lastNote && lastNotes.length >= pageSize && !past) {
      message.since = lastNote.created_at
    } else {
      message.limit = pageSize + initialPageSize
    }

    relayPool?.subscribe('homepage-main', [message])
  }

  const calculateInitialNotes: () => Promise<void> = async () => {
    if (database && publicKey) {
      relayPool?.subscribe('homepage-contacts', [
        {
          kinds: [EventKind.petNames],
          authors: [publicKey],
        },
      ])
      const users = await getUsers(database, { contacts: true, includeIds: [publicKey] })
      subscribeNotes(users)
      setAuthors(users)
    }
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
        setRefreshing(false)
        relayPool?.subscribe('homepage-contacts-meta', [
          {
            kinds: [EventKind.meta],
            authors: notes.map((note) => note.pubkey),
          },
          {
            kinds: [EventKind.reaction],
            '#e': notes.map((note) => note.id ?? ''),
          },
        ])
      })
    }
  }

  const renderItem: (note: Note) => JSX.Element = (note) => {
    return (
      <View style={styles.noteCard} key={note.id}>
        <NoteCard
          note={note}
          onPressOptions={() => {
            setProfileCardPubKey(note.pubkey)
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
      draggableIcon: {
        backgroundColor: '#000',
      },
    }
  }, [])

  return (
    <>
      {notes && notes.length > 0 && (
        <ScrollView
          onScroll={onScroll}
          horizontal={false}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          style={styles.list}
        >
          {notes.map((note) => renderItem(note))}
          {notes.length >= 10 && <ActivityIndicator animating={true} />}
        </ScrollView>
      )}
      <AnimatedFAB
        style={[styles.fab, { top: Dimensions.get('window').height - 220 }]}
        icon='pencil-outline'
        label='Label'
        onPress={() => navigate('Send')}
        animateFrom='right'
        iconMode='static'
        extended={false}
      />
      <RBSheet
        ref={bottomSheetProfileRef}
        closeOnDragDown={true}
        height={280}
        customStyles={bottomSheetStyles}
      >
        <ProfileCard userPubKey={profileCardPubkey ?? ''} bottomSheetRef={bottomSheetProfileRef} />
      </RBSheet>
    </>
  )
}

const styles = StyleSheet.create({
  list: {
    padding: 16,
  },
  noteCard: {
    marginBottom: 16,
  },
  fab: {
    right: 16,
    position: 'absolute',
  },
})

export default HomeFeed
