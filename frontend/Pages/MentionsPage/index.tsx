import { Card, Layout, Spinner, Text } from '@ui-kitten/components'
import React, { useContext, useEffect, useState } from 'react'
import { t } from 'i18next'
import { NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleSheet } from 'react-native'
import { AppContext } from '../../Contexts/AppContext'
import { getMentionNotes, Note } from '../../Functions/DatabaseFunctions/Notes'
import NoteCard from '../../Components/NoteCard'
import { RelayPoolContext } from '../../Contexts/RelayPoolContext'
import { EventKind } from '../../lib/nostr/Events'
import { getReplyEventId } from '../../Functions/RelayFunctions/Events'
import { handleInfinityScroll } from '../../Functions/NativeFunctions'

export const MentionsPage: React.FC = () => {
  const { database, goToPage } = useContext(AppContext)
  const initialPageSize = 10
  const { lastEventId, relayPool, publicKey } = useContext(RelayPoolContext)
  const [pageSize, setPageSize] = useState<number>(initialPageSize)
  const [notes, setNotes] = useState<Note[]>([])

  const calculateInitialNotes: () => Promise<void> = async () => {
    if (database && publicKey) {
      subscribeNotes()
    }
  }

  const subscribeNotes: () => void = async () => {
    if (!database || !publicKey) return

    relayPool?.subscribe('mentions-user-user', {
      kinds: [EventKind.textNote],
      '#p': [publicKey],
      limit: pageSize,
    })
    relayPool?.subscribe('mentions-user-answers', {
      kinds: [EventKind.textNote],
      '#e': [publicKey],
      limit: pageSize,
    })
  }

  const loadNotes: () => void = () => {
    if (database && publicKey) {
      getMentionNotes(database, publicKey, pageSize).then((notes) => {
        setNotes(notes)
        relayPool?.subscribe('mentions-notes-answers', {
          kinds: [EventKind.reaction],
          '#e': notes.map((note) => note.id ?? ''),
        })
        const missingDataNotes = notes
          .filter((note) => !note.picture || note.picture === '')
          .map((note) => note.pubkey)
        if (missingDataNotes.length > 0) {
          relayPool?.subscribe('mentions-meta', {
            kinds: [EventKind.meta],
            authors: missingDataNotes,
          })
        }
      })
    }
  }

  useEffect(() => {
    relayPool?.unsubscribeAll()
    if (relayPool && publicKey) {
      calculateInitialNotes().then(() => loadNotes())
    }
  }, [publicKey, relayPool])

  useEffect(() => {
    loadNotes()
  }, [lastEventId])

  useEffect(() => {
    if (pageSize > initialPageSize) {
      relayPool?.unsubscribeAll()
      subscribeNotes()
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

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    icon: {
      width: 32,
      height: 32,
    },
    empty: {
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
    <Layout style={styles.container} level='3'>
      {notes && notes.length > 0 ? (
        <ScrollView onScroll={onScroll} horizontal={false}>
          {notes.map((note) => itemCard(note))}
          {notes.length >= 10 && (
            <Layout style={styles.spinner}>
              <Spinner size='small' />
            </Layout>
          )}
        </ScrollView>
      ) : (
        <Layout style={styles.empty} level='3'>
          <Text>{t('mentionsPage.noMentions')}</Text>
        </Layout>
      )}
    </Layout>
  )
}

export default MentionsPage
