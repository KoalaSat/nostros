import React, { useCallback, useContext, useEffect, useState } from 'react'
import { AppContext } from '../../Contexts/AppContext'
import { getNotes, Note } from '../../Functions/DatabaseFunctions/Notes'
import { RelayPoolContext } from '../../Contexts/RelayPoolContext'
import NoteCard from '../../Components/NoteCard'
import { Kind } from 'nostr-tools'
import { Dimensions, RefreshControl, ScrollView, StyleSheet, View } from 'react-native'
import { getDirectReplies } from '../../Functions/RelayFunctions/Events'
import { ActivityIndicator, AnimatedFAB, useTheme } from 'react-native-paper'
import { UserContext } from '../../Contexts/UserContext'
import RBSheet from 'react-native-raw-bottom-sheet'
import ProfileCard from '../../Components/ProfileCard'
import { navigate } from '../../lib/Navigation'
import { useFocusEffect } from '@react-navigation/native'
import { getNpub } from '../../lib/nostr/Nip19'

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
  const [profileCardPubkey, setProfileCardPubKey] = useState<string>()
  const theme = useTheme()
  const bottomSheetProfileRef = React.useRef<RBSheet>(null)

  useFocusEffect(
    React.useCallback(() => {
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

        const notes = await getNotes(database, { filters: { reply_event_id: route.params.noteId } })
        const rootReplies = getDirectReplies(event, notes)
        if (rootReplies.length > 0) {
          setReplies(rootReplies as Note[])
          relayPool?.subscribe(`meta-notepage${route.params.noteId}`, [
            {
              kinds: [Kind.Metadata],
              authors: [...rootReplies.map((note) => note.pubkey), event.pubkey],
            },
          ])
        } else {
          setReplies([])
        }
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
          kinds: [Kind.Text],
          ids: [route.params.noteId],
        },
        {
          kinds: [Kind.Reaction, Kind.Text, Kind.RecommendRelay],
          '#e': [route.params.noteId],
        },
      ])
    }
  }

  const renderItem: (note: Note, index: number) => JSX.Element = (note, index) => (
    <View style={styles.note} key={note.id}>
      <View style={styles.noteLine}>
        <View style={[styles.noteLineTop, { borderColor: theme.colors.onSecondary }]}></View>
        {index < (replies?.length ?? 0) - 1 && (
          <View style={[styles.noteLineBottom, { borderColor: theme.colors.onSecondary }]}></View>
        )}
      </View>
      <View style={styles.noteCard}>
        <NoteCard
          note={note}
          onPressUser={(user) => {
            setProfileCardPubKey(user.id)
            bottomSheetProfileRef.current?.open()
          }}
          showAnswerData={false}
          showRepostPreview={false}
        />
      </View>
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
        <NoteCard note={note} onPressUser={openProfileDrawer} />
        {replies && replies.length > 0 && (
          <View style={[styles.list, { borderColor: theme.colors.onSecondary }]}>
            {replies.map((note, index) => renderItem(note, index))}
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
            navigate('Reply', { note, type: 'reply' })
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
  container: {
    paddingBottom: 32,
  },
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
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  list: {
    marginLeft: 16,
    paddingRight: 16,
    marginBottom: 180,
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
  note: {
    flexDirection: 'row',
    flex: 1,
  },
  noteCard: {
    flex: 1,
    paddingTop: 16,
  },
  noteLine: {
    width: 16,
  },
  noteLineTop: {
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    height: 60,
  },
  noteLineBottom: {
    borderLeftWidth: 1,
    flex: 1,
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
  verifyIcon: {
    paddingTop: 3,
    paddingLeft: 5,
  },
})

export default NotePage
