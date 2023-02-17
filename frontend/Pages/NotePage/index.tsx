import React, { useCallback, useContext, useEffect, useState } from 'react'
import { AppContext } from '../../Contexts/AppContext'
import { getNotes, Note } from '../../Functions/DatabaseFunctions/Notes'
import { RelayPoolContext } from '../../Contexts/RelayPoolContext'
import NoteCard from '../../Components/NoteCard'
import { Kind } from 'nostr-tools'
import { Dimensions, RefreshControl, StyleSheet, View } from 'react-native'
import { FlashList, ListRenderItem } from '@shopify/flash-list'
import { getDirectReplies } from '../../Functions/RelayFunctions/Events'
import { AnimatedFAB, useTheme } from 'react-native-paper'
import { UserContext } from '../../Contexts/UserContext'
import { navigate } from '../../lib/Navigation'
import { useFocusEffect } from '@react-navigation/native'
import { SkeletonNote } from '../../Components/SkeletonNote/SkeletonNote'
import { ScrollView } from 'react-native-gesture-handler'
import { RelayFilters } from '../../lib/nostr/RelayPool/intex'

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
  const theme = useTheme()

  useFocusEffect(
    React.useCallback(() => {
      subscribeNotes()
      loadNote()

      return () =>
        relayPool?.unsubscribe([
          `meta-notepage${route.params.noteId}`,
          `notepage${route.params.noteId}`,
          `notepage-replies-${route.params.noteId}`,
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

        const notes = await getNotes(database, { filters: { reply_event_id: route.params.noteId } })
        const rootReplies = getDirectReplies(event, notes)
        const filters: RelayFilters[] = [
          {
            kinds: [Kind.Metadata],
            authors: [...rootReplies.map((note) => note.pubkey), event.pubkey],
          },
        ]
        if (event.repost_id) {
          filters.push({
            kinds: [Kind.Text],
            ids: [event.repost_id],
          })
        }
        relayPool?.subscribe(`meta-notepage${route.params.noteId.substring(0, 8)}`, filters)
        setReplies(rootReplies as Note[])
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
      relayPool?.subscribe(`notepage${route.params.noteId.substring(0, 8)}`, [
        {
          kinds: [Kind.Text],
          ids: [route.params.noteId],
        },
      ])
      relayPool?.subscribe(`notepage-replies-${route.params.noteId.substring(0, 8)}`, [
        {
          kinds: [Kind.Reaction, Kind.Text, Kind.RecommendRelay, 9735],
          '#e': [route.params.noteId],
        },
      ])
    }
  }

  const renderItem: ListRenderItem<Note> = ({ item, index }) => (
    <View style={styles.note} key={item.id}>
      <View style={styles.noteLine}>
        <View style={[styles.noteLineTop, { borderColor: theme.colors.onSecondary }]}></View>
        {index < (replies?.length ?? 0) - 1 && (
          <View style={[styles.noteLineBottom, { borderColor: theme.colors.onSecondary }]}></View>
        )}
      </View>
      <View style={styles.noteCard}>
        <NoteCard note={item} showAnswerData={false} showRepostPreview={false} />
      </View>
    </View>
  )

  return note ? (
    <View>
      <ScrollView>
        <NoteCard note={note} />
        <View style={[styles.list, { borderColor: theme.colors.onSecondary }]}>
          <FlashList
            estimatedItemSize={200}
            showsVerticalScrollIndicator={false}
            data={replies}
            renderItem={renderItem}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            refreshing={refreshing}
            horizontal={false}
          />
        </View>
      </ScrollView>
      {privateKey && (
        <AnimatedFAB
          style={[styles.fabSend, { top: Dimensions.get('window').height - 160 }]}
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
        style={[styles.fabHome, { top: Dimensions.get('window').height - 230 }]}
        icon='home-outline'
        label='Label'
        onPress={() => {
          navigate('Feed', { screen: 'Landing' })
        }}
        animateFrom='right'
        iconMode='static'
        extended={false}
      />
    </View>
  ) : (
    <View>
      <SkeletonNote />
      <AnimatedFAB
        style={[styles.fabHome, { top: Dimensions.get('window').height - 230 }]}
        icon='home-outline'
        label='Label'
        onPress={() => {
          navigate('Feed', { screen: 'Landing' })
        }}
        animateFrom='right'
        iconMode='static'
        extended={false}
      />
    </View>
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
    height: '100%',
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
