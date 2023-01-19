import React, { useCallback, useContext, useEffect, useState } from 'react'
import { AppContext } from '../../Contexts/AppContext'
import { getNotes, Note } from '../../Functions/DatabaseFunctions/Notes'
import { RelayPoolContext } from '../../Contexts/RelayPoolContext'
import NoteCard from '../../Components/NoteCard'
import { EventKind } from '../../lib/nostr/Events'
import { Dimensions, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Event } from '../../../lib/nostr/Events'
import { getDirectReplies } from '../../Functions/RelayFunctions/Events'
import {
  ActivityIndicator,
  AnimatedFAB,
  Button,
  IconButton,
  Surface,
  useTheme,
} from 'react-native-paper'
import { npubEncode } from 'nostr-tools/nip19'
import moment from 'moment'
import { usernamePubKey } from '../../Functions/RelayFunctions/Users'
import NostrosAvatar from '../../Components/NostrosAvatar'
import TextContent from '../../Components/TextContent'
import { getReactions } from '../../Functions/DatabaseFunctions/Reactions'
import { UserContext } from '../../Contexts/UserContext'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import RBSheet from 'react-native-raw-bottom-sheet'
import ProfileCard from '../../Components/ProfileCard'
import { navigate } from '../../lib/Navigation'
import { useFocusEffect } from '@react-navigation/native'

interface NotePageProps {
  route: { params: { noteId: string } }
}

export const NotePage: React.FC<NotePageProps> = ({ route }) => {
  const { database } = useContext(AppContext)
  const { publicKey, privateKey } = useContext(UserContext)
  const { relayPool, lastEventId } = useContext(RelayPoolContext)
  const [note, setNote] = useState<Note>()
  const [replies, setReplies] = useState<Note[]>()
  const [refreshing, setRefreshing] = useState(false)
  const [nPub, setNPub] = useState<string>()
  const [positiveReactions, setPositiveReactions] = useState<number>(0)
  const [negaiveReactions, setNegativeReactions] = useState<number>(0)
  const [userUpvoted, setUserUpvoted] = useState<boolean>(false)
  const [userDownvoted, setUserDownvoted] = useState<boolean>(false)
  const [timestamp, setTimestamp] = useState<string>()
  const [profileCardPubkey, setProfileCardPubKey] = useState<string>()
  const theme = useTheme()
  const bottomSheetProfileRef = React.useRef<RBSheet>(null)

  useFocusEffect(
    React.useCallback(() => {
      relayPool?.unsubscribeAll()
      subscribeNotes()
      loadNote()

      return () => relayPool?.unsubscribeAll()
    }, []),
  )

  useEffect(() => {
    console.log('loadNote', route.params.noteId)
    loadNote()
  }, [lastEventId])

  const loadNote: () => void = async () => {
    if (database && publicKey) {
      const events = await getNotes(database, { filters: { id: route.params.noteId } })
      if (events.length > 0) {
        const event = events[0]
        setNote(event)
        setNPub(npubEncode(event.pubkey))
        setTimestamp(moment.unix(event.created_at).format('HH:mm L'))

        const notes = await getNotes(database, { filters: { reply_event_id: route.params.noteId } })
        const rootReplies = getDirectReplies(event, notes)
        if (rootReplies.length > 0) {
          setReplies(rootReplies as Note[])
          relayPool?.subscribe('meta-notepage', [
            {
              kinds: [EventKind.meta],
              authors: [...rootReplies.map((note) => note.pubkey), event.pubkey],
            },
          ])
        } else {
          setReplies([])
        }
        getReactions(database, { eventId: route.params.noteId }).then((result) => {
          const total = result.length
          let positive = 0
          result.forEach((reaction) => {
            if (reaction) positive = positive + 1
            if (reaction.pubkey === publicKey) setUserUpvoted(reaction.positive)
          })
          setPositiveReactions(positive)
          setNegativeReactions(total - positive)
        })
      }
      setRefreshing(false)
    }
  }

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    subscribeNotes()
    loadNote()
  }, [])

  const subscribeNotes: (past?: boolean) => Promise<void> = async (past) => {
    if (database && route.params.noteId) {
      relayPool?.subscribe('notepage', [
        {
          kinds: [EventKind.textNote],
          ids: [route.params.noteId],
        },
        {
          kinds: [EventKind.reaction, EventKind.textNote, EventKind.recommendServer],
          '#e': [route.params.noteId],
        },
      ])
    }
  }

  const publishReaction: (positive: boolean) => void = (positive) => {
    if (note) {
      const event: Event = {
        content: positive ? '+' : '-',
        created_at: moment().unix(),
        kind: EventKind.reaction,
        pubkey: publicKey,
        tags: [...note.tags, ['e', note.id], ['p', note.pubkey]],
      }
      relayPool?.sendEvent(event)
    }
  }

  const renderItem: (note: Note) => JSX.Element = (note) => (
    <View style={[styles.noteCard, { borderColor: theme.colors.onSecondary }]} key={note.id}>
      <NoteCard
        note={note}
        onPressOptions={() => {
          setProfileCardPubKey(note.pubkey)
          bottomSheetProfileRef.current?.open()
        }}
        showAnswerData={false}
      />
    </View>
  )

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

  const openProfileDrawer: () => void = () => {
    setProfileCardPubKey(note?.pubkey)
    bottomSheetProfileRef.current?.open()
  }

  return note && nPub ? (
    <View>
      <ScrollView
        horizontal={false}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Surface elevation={1}>
          <View style={styles.title}>
            <View style={styles.titleUser}>
              <View>
                <NostrosAvatar
                  name={note.name}
                  pubKey={nPub}
                  src={note.picture}
                  lud06={note.lnurl}
                  size={54}
                />
              </View>
              <View>
                <Text>{usernamePubKey(note.name, nPub)}</Text>
                <Text>{timestamp}</Text>
              </View>
            </View>
            <View>
              <IconButton icon='dots-vertical' size={25} onPress={openProfileDrawer} />
            </View>
          </View>
          <View style={[styles.titleComment, { borderColor: theme.colors.onSecondary }]}>
            <TextContent event={note} />
          </View>
          {privateKey && (
            <View style={[styles.titleRecommend, { borderColor: theme.colors.onSecondary }]}>
              <Button icon={() => <MaterialCommunityIcons name='message-outline' size={25} />}>
                {replies?.length ?? 0}
              </Button>
              <Button
                onPress={() => {
                  if (!userDownvoted && privateKey) {
                    setUserDownvoted(true)
                    setNegativeReactions((prev) => prev + 1)
                    publishReaction(false)
                  }
                }}
                icon={() => (
                  <MaterialCommunityIcons
                    name={userDownvoted ? 'thumb-down' : 'thumb-down-outline'}
                    size={25}
                  />
                )}
                disabled={userDownvoted}
              >
                {negaiveReactions === undefined || negaiveReactions === 0 ? '-' : negaiveReactions}
              </Button>
              <Button
                onPress={() => {
                  if (!userUpvoted && privateKey) {
                    setUserUpvoted(true)
                    setPositiveReactions((prev) => prev + 1)
                    publishReaction(true)
                  }
                }}
                icon={() => (
                  <MaterialCommunityIcons
                    name={userUpvoted ? 'thumb-up' : 'thumb-up-outline'}
                    size={25}
                  />
                )}
                disabled={userUpvoted}
              >
                {positiveReactions === undefined || positiveReactions === 0
                  ? '-'
                  : positiveReactions}
              </Button>
            </View>
          )}
        </Surface>
        {replies && replies.length > 0 && (
          <View style={styles.list}>
            {replies.map((note) => renderItem(note))}
            {replies.length >= 10 && <ActivityIndicator style={styles.loading} animating={true} />}
          </View>
        )}
      </ScrollView>
      <AnimatedFAB
        style={[styles.fabSend, { top: Dimensions.get('window').height - 140 }]}
        icon='message-plus-outline'
        label='Label'
        onPress={() => {
          navigate('Reply', { note })
        }}
        animateFrom='right'
        iconMode='static'
        extended={false}
      />
      <AnimatedFAB
        style={[styles.fabHome, { top: Dimensions.get('window').height - 220 }]}
        icon='home-outline'
        label='Label'
        onPress={() => {
          navigate('Feed')
        }}
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
  ) : (
    <></>
  )
}

const styles = StyleSheet.create({
  title: {
    paddingRight: 16,
    paddingLeft: 16,
    paddingTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignContent: 'center',
  },
  titleUser: {
    flexDirection: 'row',
    alignContent: 'center',
  },
  titleRecommend: {
    borderTopWidth: 1,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  titleComment: {
    borderTopWidth: 1,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  list: {
    padding: 16,
  },
  loading: {
    paddingBottom: 60,
  },
  fabSend: {
    right: 16,
    position: 'absolute',
  },
  fabHome: {
    right: 16,
    position: 'absolute',
  },
  noteCard: {
    borderLeftWidth: 1,
    paddingLeft: 32,
    paddingBottom: 16,
  },
})

export default NotePage
