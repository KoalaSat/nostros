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
import { getMainNotes, Note } from '../../Functions/DatabaseFunctions/Notes'
import { handleInfinityScroll } from '../../Functions/NativeFunctions'
import { UserContext } from '../../Contexts/UserContext'
import { RelayPoolContext } from '../../Contexts/RelayPoolContext'
import { EventKind } from '../../lib/nostr/Events'
import { RelayFilters } from '../../lib/nostr/RelayPool/intex'
import { ActivityIndicator, AnimatedFAB, Button, Text } from 'react-native-paper'
import NoteCard from '../../Components/NoteCard'
import RBSheet from 'react-native-raw-bottom-sheet'
import ProfileCard from '../../Components/ProfileCard'
import { useTheme } from '@react-navigation/native'
import { navigate } from '../../lib/Navigation'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import { t } from 'i18next'
import { FlatList } from 'react-native-gesture-handler'

interface HomeFeedProps {
  jumpTo: (tabName: string) => void
}

export const HomeFeed: React.FC<HomeFeedProps> = ({ jumpTo }) => {
  const theme = useTheme()
  const { database } = useContext(AppContext)
  const { publicKey } = useContext(UserContext)
  const { lastEventId, relayPool, lastConfirmationtId } = useContext(RelayPoolContext)
  const initialPageSize = 10
  const [notes, setNotes] = useState<Note[]>([])
  const [authors, setAuthors] = useState<string[]>([])
  const [pageSize, setPageSize] = useState<number>(initialPageSize)
  const [refreshing, setRefreshing] = useState(true)
  const [profileCardPubkey, setProfileCardPubKey] = useState<string>()
  const bottomSheetProfileRef = React.useRef<RBSheet>(null)

  useEffect(() => {
    if (relayPool && publicKey) {
      loadNotes()
    }
  }, [publicKey, relayPool, lastEventId, lastConfirmationtId])

  useEffect(() => {
    if (pageSize > initialPageSize) {
      subscribeNotes(true)
    }
  }, [pageSize])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    if (relayPool && publicKey) {
      subscribeNotes()
    }
  }, [])

  const subscribeNotes: (past?: boolean) => void = async (past) => {
    if (!database || !publicKey) return

    let newAuthors: string[] = authors

    if (newAuthors.length === 0) {
      const users: User[] = await getUsers(database, { contacts: true })
      newAuthors = [...users.map((user) => user.id), publicKey]
    }

    const lastNotes: Note[] = await getMainNotes(database, publicKey, initialPageSize)
    const lastNote: Note = lastNotes[lastNotes.length - 1]

    const message: RelayFilters = {
      kinds: [EventKind.textNote, EventKind.recommendServer],
      authors: newAuthors,
    }
    if (lastNote && lastNotes.length >= pageSize && !past) {
      message.since = lastNote.created_at
    } else {
      message.limit = pageSize + initialPageSize
    }
    relayPool?.subscribe('homepage-main', [message])
    relayPool?.subscribe('homepage-contacts', [
      {
        kinds: [EventKind.petNames],
        authors: newAuthors,
      },
    ])
    setAuthors(newAuthors)
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
          relayPool?.subscribe('homepage-reactions', [
            {
              kinds: [EventKind.reaction, EventKind.textNote, EventKind.recommendServer],
              '#e': notes.map((note) => note.id ?? ''),
            },
          ])
        }
      })
    }
  }

  const renderItem: ListRenderItem<Note> = ({ item, index }) => {
    return (
      <View style={styles.noteCard} key={item.id}>
        <NoteCard
          note={item}
          onPressOptions={() => {
            setProfileCardPubKey(item.pubkey)
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
          <Button mode='contained' compact onPress={() => jumpTo('contacts')}>
            {t('homeFeed.emptyButton')}
          </Button>
        </View>
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
    padding: 16,
    flex: 1,
  },
  center: {
    alignContent: 'center',
    textAlign: 'center',
  },
  blank: {
    justifyContent: 'space-between',
    height: 200,
    marginTop: 60,
  },
})

export default HomeFeed
