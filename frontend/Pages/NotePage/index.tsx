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
  TouchableRipple,
  useTheme,
} from 'react-native-paper'
import moment from 'moment'
import { formatPubKey, usernamePubKey } from '../../Functions/RelayFunctions/Users'
import NostrosAvatar from '../../Components/NostrosAvatar'
import TextContent from '../../Components/TextContent'
import { getReactions } from '../../Functions/DatabaseFunctions/Reactions'
import { UserContext } from '../../Contexts/UserContext'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import RBSheet from 'react-native-raw-bottom-sheet'
import ProfileCard from '../../Components/ProfileCard'
import { navigate, push } from '../../lib/Navigation'
import { useFocusEffect } from '@react-navigation/native'
import { getNpub } from '../../lib/nostr/Nip19'
import { useTranslation } from 'react-i18next'

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
  const { t } = useTranslation('common')
  const bottomSheetProfileRef = React.useRef<RBSheet>(null)

  useFocusEffect(
    React.useCallback(() => {
      relayPool?.unsubscribeAll()
      subscribeNotes()
      loadNote()

      return () =>
        relayPool?.unsubscribe([
          `meta-notepage${route.params.noteId}`,
          `notepage${route.params.noteId}`,
        ])
    }, []),
  )

  useEffect(() => {
    loadNote()
  }, [lastEventId])

  const loadNote: () => void = async () => {
    if (database && publicKey) {
      const events = await getNotes(database, { filters: { id: route.params.noteId } })
      if (events.length > 0) {
        const event = events[0]
        setNote(event)
        setNPub(getNpub(event.pubkey))
        setTimestamp(moment.unix(event.created_at).format('L HH:mm'))

        const notes = await getNotes(database, { filters: { reply_event_id: route.params.noteId } })
        const rootReplies = getDirectReplies(event, notes)
        if (rootReplies.length > 0) {
          setReplies(rootReplies as Note[])
          relayPool?.subscribe(`meta-notepage${route.params.noteId}`, [
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
            if (reaction.positive) {
              positive = positive + 1
              setUserUpvoted(true)
            } else if (reaction.pubkey === publicKey) {
              setUserDownvoted(true)
            }
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
      relayPool?.subscribe(`notepage${route.params.noteId}`, [
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
              <View style={styles.titleUserData}>
                <Text style={styles.titleUsername}>{usernamePubKey(note.name, nPub)}</Text>
                <Text>{timestamp}</Text>
              </View>
            </View>
            <View>
              <IconButton icon='dots-vertical' size={25} onPress={openProfileDrawer} />
            </View>
          </View>
          {note.reply_event_id && (
            <TouchableRipple
              onPress={() =>
                note.kind !== EventKind.recommendServer &&
                push('Note', { noteId: note.reply_event_id })
              }
            >
              <View style={[styles.answerContent, { borderColor: theme.colors.onSecondary }]}>
                <View style={styles.answerData}>
                  <MaterialCommunityIcons name='arrow-left-top' size={16} />
                  <Text>
                    {t('noteCard.answering', { username: formatPubKey(note.reply_event_id) })}
                  </Text>
                </View>
                <View>
                  <Text style={styles.link}>{t('noteCard.seeParent')}</Text>
                </View>
              </View>
            </TouchableRipple>
          )}
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
      {privateKey && (
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
      )}
      <AnimatedFAB
        style={[styles.fabHome, { top: Dimensions.get('window').height - 220 }]}
        icon='home-outline'
        label='Label'
        onPress={() => {
          navigate('Feed', { screen: 'Landing' })
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
  titleUserData: {
    paddingLeft: 16,
    paddingTop: 5,
  },
  titleUsername: {
    fontWeight: 'bold',
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
    paddingLeft: 16,
    paddingRight: 16,
  },
  loading: {
    paddingTop: 30,
    paddingBottom: 30,
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
    paddingTop: 16,
  },
  answerData: {
    flexDirection: 'row',
  },
  answerContent: {
    flexDirection: 'row',
    borderTopWidth: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  link: {
    textDecorationLine: 'underline',
  },
})

export default NotePage
