import { Card, Layout, Spinner, useTheme } from '@ui-kitten/components'
import React, { useCallback, useContext, useEffect, useState } from 'react'
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native'
import { AppContext } from '../../Contexts/AppContext'
import { getNotes, Note } from '../../Functions/DatabaseFunctions/Notes'
import NoteCard from '../NoteCard'
import Icon from 'react-native-vector-icons/FontAwesome5'
import { RelayPoolContext } from '../../Contexts/RelayPoolContext'
import { EventKind } from '../../lib/nostr/Events'
import { RelayFilters } from '../../lib/nostr/Relay'
import { getReplyEventId } from '../../Functions/RelayFunctions/Events'
import { getUsers, User } from '../../Functions/DatabaseFunctions/Users'
import { handleInfinityScroll } from '../../Functions/NativeFunctions'

export const HomePage: React.FC = () => {
  const { database, goToPage } = useContext(AppContext)
  const initialPageSize = 15
  const { lastEventId, relayPool, publicKey, privateKey } = useContext(RelayPoolContext)
  const theme = useTheme()
  const [pageSize, setPageSize] = useState<number>(initialPageSize)
  const [notes, setNotes] = useState<Note[]>([])
  const [authors, setAuthors] = useState<User[]>([])
  const [refreshing, setRefreshing] = useState(true)

  const calculateInitialNotes: () => Promise<void> = async () => {
    if (database && publicKey) {
      const users = await getUsers(database, { contacts: true, includeIds: [publicKey] })
      setAuthors(users)
      subscribeNotes(users)
    }
  }

  const subscribeNotes: (users: User[], past?: boolean) => void = (users, past) => {
    if (!database || !publicKey) return
    const limit = past ? pageSize : 1
    getNotes(database, { contacts: true, includeIds: [publicKey], limit }).then((results) => {
      const message: RelayFilters = {
        kinds: [EventKind.textNote, EventKind.recommendServer],
        authors: users.map((user) => user.id),
        limit: initialPageSize,
      }
      if (past) {
        message.until = results[results.length - 1]?.created_at
      } else {
        message.since = results[0]?.created_at
      }

      relayPool?.subscribe('main-channel', message)
    })
  }

  const loadNotes: () => void = () => {
    if (database && publicKey) {
      getNotes(database, { contacts: true, includeIds: [publicKey], limit: pageSize }).then(
        (notes) => {
          setNotes(notes)
          if (notes.length > 0 || authors.length === 0) {
            setRefreshing(false)
          }
        },
      )
    }
  }

  useEffect(() => {
    relayPool?.unsubscribeAll()
    calculateInitialNotes().then(() => loadNotes())
  }, [publicKey])

  useEffect(() => {
    loadNotes()
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
    calculateInitialNotes().then(() => loadNotes())
  }, [])

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
        <NoteCard note={note} />
      </Card>
    )
  }

  const onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void = (event) => {
    if (handleInfinityScroll(event)) {
      setPageSize(pageSize + initialPageSize)
    }
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    icon: {
      width: 32,
      height: 32,
    },
    loadingBottom: {
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      flexWrap: 'wrap',
      padding: 12,
    },
  })

  return (
    <>
      <Layout style={styles.container} level='3'>
        <ScrollView
          onScroll={onScroll}
          horizontal={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {notes.map((note) => itemCard(note))}
          {notes.length >= initialPageSize && (
            <View style={styles.loadingBottom}>
              <Spinner size='tiny' />
            </View>
          )}
        </ScrollView>
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
