import { Card, Layout, useTheme } from '@ui-kitten/components'
import React, { useCallback, useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RefreshControl, ScrollView, StyleSheet } from 'react-native'
import { AppContext } from '../../Contexts/AppContext'
import { getNotes, Note } from '../../Functions/DatabaseFunctions/Notes'
import NoteCard from '../NoteCard'
import ActionButton from 'react-native-action-button'
import Icon from 'react-native-vector-icons/FontAwesome5'
import { RelayPoolContext } from '../../Contexts/RelayPoolContext'
import { EventKind } from '../../lib/nostr/Events'
import { RelayFilters } from '../../lib/nostr/Relay'
import { getReplyEventId } from '../../Functions/RelayFunctions/Events'
import { getUsers } from '../../Functions/DatabaseFunctions/Users'
import Loading from '../Loading'

export const HomePage: React.FC = () => {
  const { database, goToPage, page } = useContext(AppContext)
  const { lastEventId, relayPool, publicKey } = useContext(RelayPoolContext)
  const theme = useTheme()
  const [notes, setNotes] = useState<Note[]>([])
  const [totalContacts, setTotalContacts] = useState<number>(-1)
  const [refreshing, setRefreshing] = useState(false)
  const { t } = useTranslation('common')

  const loadNotes: () => void = () => {
    if (database && publicKey) {
      getNotes(database, { contacts: true, includeIds: [publicKey], limit: 15 }).then((notes) => {
        setNotes(notes)
      })
    }
  }

  const subscribeNotes: () => Promise<void> = async () => {
    return await new Promise<void>((resolve, reject) => {
      if (database && publicKey && relayPool) {
        getNotes(database, { limit: 1 }).then((notes) => {
          getUsers(database, { contacts: true, includeIds: [publicKey] }).then((users) => {
            setTotalContacts(users.length)
            let message: RelayFilters = {
              kinds: [EventKind.textNote, EventKind.recommendServer],
              authors: users.map((user) => user.id),
              limit: 15
            }

            if (notes.length !== 0) {
              message = {
                ...message,
                since: notes[0].created_at
              }
            }
            relayPool?.subscribe('main-channel', message)
            resolve()
          })
        })
      } else {
        reject(new Error('Not Ready'))
      }
    })
  }

  useEffect(() => {
    relayPool?.unsubscribeAll()
  }, [])

  useEffect(() => {
    loadNotes()
  }, [lastEventId])

  useEffect(() => {
    loadNotes()
    subscribeNotes()
  }, [database, publicKey, relayPool])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    relayPool?.unsubscribeAll()
    subscribeNotes().finally(() => setRefreshing(false))
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

  const styles = StyleSheet.create({
    container: {
      flex: 1
    },
    icon: {
      width: 32,
      height: 32
    }
  })

  return (
    <>
      <Layout style={styles.container} level='4'>
        {notes.length === 0 && totalContacts !== 0 ? (
          <Loading />
        ) : (
          <ScrollView
            horizontal={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          >
            {notes.map((note) => itemCard(note))}
          </ScrollView>
        )}
      </Layout>
      {/* <ActionButton
        buttonColor={theme['color-primary-400']}
        useNativeFeedback={true}
        fixNativeFeedbackRadius={true}
      >
        <ActionButton.Item
          buttonColor={theme['color-warning-500']}
          title={t('homePage.send')}
          onPress={() => goToPage(`${page}%send`)}
        >
          <Icon name='paper-plane' size={30} color={theme['text-basic-color']} solid />
        </ActionButton.Item>
      </ActionButton> */}
    </>
  )
}

export default HomePage
