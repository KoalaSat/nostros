import { Button, Card, Layout, TopNavigation, useTheme } from '@ui-kitten/components'
import React, { useContext, useEffect, useState } from 'react'
import { AppContext } from '../../Contexts/AppContext'
import { getNotes, Note } from '../../Functions/DatabaseFunctions/Notes'
import { RelayPoolContext } from '../../Contexts/RelayPoolContext'
import Icon from 'react-native-vector-icons/FontAwesome5'
import NoteCard from '../../Components/NoteCard'
import { EventKind } from '../../lib/nostr/Events'
import { Clipboard, ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native'
import Loading from '../../Components/Loading'
import { getDirectReplies, getReplyEventId } from '../../Functions/RelayFunctions/Events'
import { RelayFilters } from '../../lib/nostr/RelayPool/intex'
import LnPayment from '../../Components/LnPayment'
import { getUser, User } from '../../Functions/DatabaseFunctions/Users'

export const NotePage: React.FC = () => {
  const { page, goBack, goToPage, database, getActualPage } = useContext(AppContext)
  const { relayPool, privateKey, lastEventId } = useContext(RelayPoolContext)
  const [note, setNote] = useState<Note>()
  const [replies, setReplies] = useState<Note[]>()
  const [eventId, setEventId] = useState(getActualPage().split('#')[1])
  const [openPayment, setOpenPayment] = useState<boolean>(false)
  const [user, setUser] = useState<User>()
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
        relayPool?.subscribe('meta-notepage', message)
      } else {
        setReplies([])
      }
      getUser(event.pubkey, database).then((user) => {
        if (user) {
          setUser(user)
        }
      })
    }
  }

  const subscribeNotes: (past?: boolean) => Promise<void> = async (past) => {
    if (database && eventId) {
      relayPool?.subscribe('main-notepage', {
        kinds: [EventKind.textNote],
        ids: [eventId],
      })
      relayPool?.subscribe('answers-notepage', {
        kinds: [EventKind.reaction, EventKind.textNote],
        '#e': [eventId],
      })
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

  const renderNoteActions = (
    <>
      {user?.lnurl ? (
        <Button appearance='ghost' onPress={() => setOpenPayment(true)} status='warning'>
          <Icon name='bolt' size={16} color={theme['text-basic-color']} solid />
        </Button>
      ) : (
        <></>
      )}
      {note && getReplyEventId(note) ? (
        <Button
          accessoryRight={<Icon name='arrow-up' size={16} color={theme['text-basic-color']} />}
          onPress={onPressGoParent}
          appearance='ghost'
        />
      ) : (
        <></>
      )}
    </>
  )

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
    container: {
      marginBottom: 32,
    },
    main: {
      paddingBottom: 32,
      paddingTop: 26,
      paddingLeft: 26,
      paddingRight: 26,
    },
    loading: {
      maxHeight: 160,
    },
  })

  return (
    <>
      <TopNavigation
        alignment='center'
        title={
          <TouchableOpacity onPress={onPressTitle}>
            <Text>{`${eventId.slice(0, 8)}...${eventId.slice(-8)}`}</Text>
          </TouchableOpacity>
        }
        accessoryLeft={renderBackAction}
        accessoryRight={renderNoteActions}
      />
      <Layout level='4' style={styles.container}>
        {note ? (
          <ScrollView horizontal={false}>
            {[note, ...(replies ?? [])].map((note) => itemCard(note))}
          </ScrollView>
        ) : (
          <Loading style={styles.loading} />
        )}
        <LnPayment event={note} open={openPayment} setOpen={setOpenPayment} user={user} />
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
