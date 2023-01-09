import { Button, Card, Layout, Spinner, Text, useTheme } from '@ui-kitten/components'
import React, { useCallback, useContext, useEffect, useState } from 'react'
import { t } from 'i18next'
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native'
import { AppContext } from '../../Contexts/AppContext'
import { getMainNotes, Note } from '../../Functions/DatabaseFunctions/Notes'
import NoteCard from '../../Components/NoteCard'
import Icon from 'react-native-vector-icons/FontAwesome5'
import { RelayPoolContext } from '../../Contexts/RelayPoolContext'
import { EventKind } from '../../lib/nostr/Events'
import { getReplyEventId } from '../../Functions/RelayFunctions/Events'
import { getUsers, User } from '../../Functions/DatabaseFunctions/Users'
import { handleInfinityScroll } from '../../Functions/NativeFunctions'
import { RelayFilters } from '../../lib/nostr/RelayPool/intex'

export const HomePage: React.FC = () => {
  const { database, goToPage } = useContext(AppContext)
  const initialPageSize = 10
  const { lastEventId, relayPool, publicKey, privateKey } = useContext(RelayPoolContext)
  const theme = useTheme()
  const [pageSize, setPageSize] = useState<number>(initialPageSize)
  const [notes, setNotes] = useState<Note[]>([])
  const [authors, setAuthors] = useState<User[]>([])
  const [refreshing, setRefreshing] = useState(true)
  const [firstLoad, setFirstLoad] = useState(true)

  const calculateInitialNotes: () => Promise<void> = async () => {
    if (database && publicKey) {
      relayPool?.subscribe('homepage-contacts', {
        kinds: [EventKind.petNames],
        authors: [publicKey],
      })
      const users = await getUsers(database, { contacts: true, includeIds: [publicKey] })
      subscribeNotes(users)
      setAuthors(users)
    }
  }

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

    relayPool?.subscribe('homepage-main', message)
  }

  const loadNotes: () => void = () => {
    if (database && publicKey) {
      getMainNotes(database, publicKey, pageSize).then((notes) => {
        setNotes(notes)
        setRefreshing(false)
        relayPool?.subscribe('homepage-contacts-meta', {
          kinds: [EventKind.meta],
          authors: notes.map((note) => note.pubkey),
        })
        relayPool?.subscribe('homepage-contacts-reactions', {
          kinds: [EventKind.reaction],
          '#e': notes.map((note) => note.id ?? ''),
        })
      })
    }
  }

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

  const onPress: (note: Note) => void = (note) => {
    if (note.kind !== EventKind.recommendServer) {
      const replyEventId = getReplyEventId(note)
      if (replyEventId) {
        goToPage(`note#${replyEventId}`)
      } else if (note.id) {
        goToPage(`note#${note.id}`)
      }
    }
  }

  const itemCard: (note: Note) => JSX.Element = (note) => {
    return (
      <Card onPress={() => onPress(note)} key={note.id ?? ''}>
        <NoteCard note={note} onlyContactsReplies={true} showReplies={true} />
      </Card>
    )
  }

  const onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void = (event) => {
    if (handleInfinityScroll(event)) {
      setPageSize(pageSize + initialPageSize)
    }
  }

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    relayPool?.unsubscribeAll()
    if (relayPool && publicKey) {
      calculateInitialNotes().then(() => loadNotes())
    }
  }, [])

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    icon: {
      width: 32,
      height: 32,
    },
    empty: {
      height: 128,
      justifyContent: 'center',
      alignItems: 'center',
    },
    noContacts: {
      height: 64,
      justifyContent: 'center',
      alignItems: 'center',
    },
    spinner: {
      justifyContent: 'center',
      alignItems: 'center',
      height: 64,
    },
  })

  return (
    <>
      <Layout style={styles.container} level='3'>
        {notes.length > 0 ? (
          <ScrollView
            onScroll={onScroll}
            horizontal={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          >
            {notes.map((note) => itemCard(note))}
            {notes.length >= 10 && (
              <Layout style={styles.spinner}>
                <Spinner size='small' />
              </Layout>
            )}
          </ScrollView>
        ) : (
          <Layout style={styles.empty} level='3'>
            <Layout style={styles.noContacts} level='3'>
              <Text>{t('homePage.noContacts')}</Text>
            </Layout>
            <Button
              onPress={() => goToPage('contacts')}
              status='warning'
              accessoryLeft={
                <Icon name='address-book' size={16} color={theme['text-basic-color']} solid />
              }
            >
              {t('homePage.addContacts')}
            </Button>
          </Layout>
        )}
      </Layout>
      {privateKey && (
        <TouchableOpacity
          style={{
            borderWidth: 1,
            borderColor: 'rgba(0,0,0,0.2)',
            alignItems: 'center',
            justifyContent: 'center',
            width: 65,
            position: 'absolute',
            bottom: 20,
            right: 20,
            height: 65,
            backgroundColor: theme['color-warning-500'],
            borderRadius: 100,
          }}
          onPress={() => goToPage('send')}
        >
          <Icon name='paper-plane' size={30} color={theme['text-basic-color']} solid />
        </TouchableOpacity>
      )}
    </>
  )
}

export default HomePage
