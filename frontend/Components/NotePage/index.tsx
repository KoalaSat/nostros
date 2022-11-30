import { Button, Card, Layout, Spinner, TopNavigation, useTheme } from '@ui-kitten/components'
import React, { useContext, useEffect, useState } from 'react'
import { AppContext } from '../../Contexts/AppContext'
import { getNotes, Note } from '../../Functions/DatabaseFunctions/Notes'
import { RelayPoolContext } from '../../Contexts/RelayPoolContext'
import Icon from 'react-native-vector-icons/FontAwesome5'
import NoteCard from '../NoteCard'
import { EventKind } from '../../lib/nostr/Events'
import { Clipboard, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import Loading from '../Loading'
import { getDirectReplies, getReplyEventId } from '../../Functions/RelayFunctions/Events'
import { RelayFilters } from '../../lib/nostr/RelayPool/intex'

export const NotePage: React.FC = () => {
  const { page, goBack, goToPage, database, getActualPage } = useContext(AppContext)
  const { relayPool, privateKey, lastEventId } = useContext(RelayPoolContext)
  const [note, setNote] = useState<Note>()
  const [replies, setReplies] = useState<Note[]>()
  const [eventId, setEventId] = useState(getActualPage().split('#')[1])
  const theme = useTheme()

  useEffect(() => {
    relayPool?.unsubscribeAll()
    const newEventId = getActualPage().split('#')[1]
    setNote(undefined)
    setReplies(undefined)
    setEventId(newEventId)
    subscribeNotes()
    loadNote()
  }, [page])

  useEffect(() => {
    loadNote()
  }, [eventId])

  useEffect(() => {
    loadNote()
  }, [lastEventId])

  const onPressBack: () => void = () => {
    goBack()
  }

  const onPressGoParent: () => void = () => {
    if (note) {
      const replyId = getReplyEventId(note)
      if (replyId) {
        goToPage(`note#${replyId}`)
      }
    }
  }

  const loadNote: () => void = async () => {
    if (database) {
      const events = await getNotes(database, { filters: { id: eventId } })
      const event = events[0]
      setNote(event)
      const notes = await getNotes(database, { filters: { reply_event_id: eventId } })
      const rootReplies = getDirectReplies(event, notes)
      if (rootReplies.length > 0) {
        setReplies(rootReplies as Note[])
        const message: RelayFilters = {
          kinds: [EventKind.meta],
          authors: [...rootReplies.map((note) => note.pubkey), event.pubkey],
        }
        relayPool?.subscribe('main-channel', message)
      } else {
        setReplies([])
      }
    }
  }

  const subscribeNotes: (past?: boolean) => Promise<void> = async (past) => {
    if (database && eventId) {
      relayPool?.subscribe('main-channel', {
        kinds: [EventKind.textNote],
        ids: [eventId],
      })
      const notes = await getNotes(database, { filters: { reply_event_id: eventId } })
      const eventMessages: RelayFilters = {
        kinds: [EventKind.textNote],
        '#e': [eventId],
      }
      if (past) {
        eventMessages.until = notes[notes.length - 1]?.created_at
      } else {
        eventMessages.since = notes[0]?.created_at
      }
      relayPool?.subscribe('main-channel', eventMessages)
    }
  }

  const renderBackAction = (): JSX.Element => {
    return (
      <Button
        accessoryRight={<Icon name='arrow-left' size={16} color={theme['text-basic-color']} />}
        onPress={onPressBack}
        appearance='ghost'
      />
    )
  }

  const renderNoteActions = (): JSX.Element => {
    return note && getReplyEventId(note) ? (
      <Button
        accessoryRight={<Icon name='arrow-up' size={16} color={theme['text-basic-color']} />}
        onPress={onPressGoParent}
        appearance='ghost'
      />
    ) : (
      <></>
    )
  }

  const onPressNote: (note: Note) => void = (note) => {
    if (note.kind !== EventKind.recommendServer) {
      const replyEventId = getReplyEventId(note)
      if (replyEventId && replyEventId !== eventId) {
        goToPage(`note#${replyEventId}`)
      } else if (note.id) {
        goToPage(`note#${note.id}`)
      }
    }
  }

  const itemCard: (note?: Note) => JSX.Element = (note) => {
    if (note?.id === eventId) {
      return (
        <Layout style={styles.main} level='2' key={note.id ?? note.created_at}>
          <NoteCard note={note} />
        </Layout>
      )
    } else if (note) {
      return (
        <Card onPress={() => onPressNote(note)} key={note.id ?? note.created_at}>
          <NoteCard note={note} />
        </Card>
      )
    } else {
      return <></>
    }
  }

  const onPressTitle: () => void = () => {
    Clipboard.setString(note?.id ?? '')
  }

  const styles = StyleSheet.create({
    main: {
      paddingBottom: 32,
      paddingTop: 26,
      paddingLeft: 26,
      paddingRight: 26,
    },
    loading: {
      maxHeight: 160,
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
      <TopNavigation
        alignment='center'
        title={
          <TouchableOpacity onPress={onPressTitle}>
            <Text>{`${eventId.slice(0, 12)}...${eventId.slice(-12)}`}</Text>
          </TouchableOpacity>
        }
        accessoryLeft={renderBackAction}
        accessoryRight={renderNoteActions}
      />
      <Layout level='4'>
        {note ? (
          <ScrollView horizontal={false}>
            {[note, ...(replies ?? [])].map((note) => itemCard(note))}
            <View style={styles.loadingBottom}>
              <Spinner size='tiny' />
            </View>
          </ScrollView>
        ) : (
          <Loading style={styles.loading} />
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
          onPress={() => goToPage(`send#${eventId}`)}
        >
          <Icon name='reply' size={30} color={theme['text-basic-color']} solid />
        </TouchableOpacity>
      )}
    </>
  )
}

export default NotePage
