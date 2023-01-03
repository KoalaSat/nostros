import React, { useContext, useEffect, useState } from 'react'
import { Button, Divider, Layout, Text, useTheme } from '@ui-kitten/components'
import { getNotes, Note } from '../../Functions/DatabaseFunctions/Notes'
import { StyleSheet, TouchableOpacity } from 'react-native'
import { EventKind } from '../../lib/nostr/Events'
import Icon from 'react-native-vector-icons/FontAwesome5'
import { RelayPoolContext } from '../../Contexts/RelayPoolContext'
import { AppContext } from '../../Contexts/AppContext'
import { showMessage } from 'react-native-flash-message'
import { t } from 'i18next'
import {
  getDirectReplies,
  getReplyEventId,
  isContentWarning,
} from '../../Functions/RelayFunctions/Events'
import { Event } from '../../../lib/nostr/Events'
import moment from 'moment'
import { populateRelay } from '../../Functions/RelayFunctions'
import Avatar from '../Avatar'
import { searchRelays } from '../../Functions/DatabaseFunctions/Relays'
import { RelayFilters } from '../../lib/nostr/RelayPool/intex'
import TextContent from '../../Components/TextContent'
import { formatPubKey } from '../../Functions/RelayFunctions/Users'
import { getReactionsCount, getUserReaction } from '../../Functions/DatabaseFunctions/Reactions'

interface NoteCardProps {
  note: Note
  showReplies?: boolean
  onlyContactsReplies?: boolean
}

export const NoteCard: React.FC<NoteCardProps> = ({
  note,
  showReplies = false,
  onlyContactsReplies = false,
}) => {
  const theme = useTheme()
  const { relayPool, publicKey, lastEventId } = useContext(RelayPoolContext)
  const { database, goToPage } = useContext(AppContext)
  const [relayAdded, setRelayAdded] = useState<boolean>(false)
  const [replies, setReplies] = useState<Note[]>([])
  const [positiveReactions, setPositiveReactions] = useState<number>(0)
  const [negaiveReactions, setNegativeReactions] = useState<number>(0)
  const [userUpvoted, setUserUpvoted] = useState<boolean>(false)
  const [userDownvoted, setUserDownvoted] = useState<boolean>(false)
  const [hide, setHide] = useState<boolean>(isContentWarning(note))

  useEffect(() => {
    if (database && publicKey && note.id) {
      getReactionsCount(database, { positive: true, eventId: note.id }).then((result) => {
        setPositiveReactions(result ?? 0)
      })
      getReactionsCount(database, { positive: false, eventId: note.id }).then((result) => {
        setNegativeReactions(result ?? 0)
      })
      getUserReaction(database, publicKey, { eventId: note.id }).then((results) => {
        results.forEach((reaction) => {
          if (reaction.positive) {
            setUserUpvoted(true)
          } else {
            setUserDownvoted(true)
          }
        })
      })
    }
  }, [lastEventId])

  useEffect(() => {
    if (database && note) {
      searchRelays(note.content, database).then((result) => {
        setRelayAdded(result.length > 0)
      })
      if (showReplies) {
        getNotes(database, {
          filters: { reply_event_id: note?.id ?? '' },
          contacts: onlyContactsReplies,
        }).then((notes) => {
          const rootReplies = getDirectReplies(note, notes) as Note[]
          setReplies(rootReplies)
          if (rootReplies.length > 0) {
            const message: RelayFilters = {
              kinds: [EventKind.meta],
              authors: [...rootReplies.map((reply) => reply.pubkey), note.pubkey],
            }
            relayPool?.subscribe('main-channel', message)
          }
        })
      }
    }
  }, [database])

  const publishReaction: (positive: boolean) => void = (positive) => {
    const event: Event = {
      content: positive ? '+' : '-',
      created_at: moment().unix(),
      kind: EventKind.reaction,
      pubkey: publicKey,
      tags: [...note.tags, ['e', note.id], ['p', note.pubkey]],
    }
    relayPool?.sendEvent(event)
  }

  const textNote: (note: Note) => JSX.Element = (note) => {
    return (
      <>
        <Layout style={styles.profile} level='2'>
          <TouchableOpacity onPress={() => onPressUser(note.pubkey)}>
            <Avatar
              src={note.picture}
              name={note.name && note.name !== '' ? note.name : note.pubkey}
              pubKey={note.pubkey}
            />
          </TouchableOpacity>
        </Layout>
        <Layout style={styles.contentNoAction} level='2'>
          <Layout style={styles.titleText}>
            <TouchableOpacity onPress={() => onPressUser(note.pubkey)}>
              <Layout style={styles.pubkey}>
                <Text appearance='hint'>{note.name ?? formatPubKey(note.pubkey)}</Text>
              </Layout>
            </TouchableOpacity>
            <Layout style={styles.tags}>
              {getReplyEventId(note) && (
                <Icon name='comment-dots' size={16} color={theme['text-basic-color']} solid />
              )}
            </Layout>
          </Layout>
          <Layout style={styles.text}>
            {hide ? (
              <Button appearance='ghost' onPress={() => setHide(false)}>
                {t('note.contentWarning')}
              </Button>
            ) : (
              <TextContent event={note} />
            )}
          </Layout>
          <Layout style={styles.footer}>
            <Text appearance='hint'>{moment.unix(note.created_at).format('HH:mm DD-MM-YY')}</Text>
            <Layout style={styles.reactions}>
              <Button
                appearance='ghost'
                status={userUpvoted ? 'success' : 'primary'}
                onPress={() => {
                  if (!userUpvoted) {
                    setUserUpvoted(true)
                    setPositiveReactions((prev) => prev + 1)
                    publishReaction(true)
                  }
                }}
                accessoryLeft={
                  <Icon
                    name='arrow-up'
                    size={16}
                    color={userUpvoted ? theme['color-success-500'] : theme['color-primary-500']}
                    solid
                  />
                }
                size='small'
              >
                {positiveReactions === undefined || positiveReactions === 0
                  ? '-'
                  : positiveReactions}
              </Button>
              <Button
                appearance='ghost'
                status={userDownvoted ? 'danger' : 'primary'}
                onPress={() => {
                  if (!userDownvoted) {
                    setUserDownvoted(true)
                    setNegativeReactions((prev) => prev + 1)
                    publishReaction(false)
                  }
                }}
                accessoryLeft={
                  <Icon
                    name='arrow-down'
                    size={16}
                    color={userDownvoted ? theme['color-danger-500'] : theme['color-primary-500']}
                    solid
                  />
                }
                size='small'
              >
                {negaiveReactions === undefined || negaiveReactions === 0 ? '-' : negaiveReactions}
              </Button>
            </Layout>
          </Layout>
        </Layout>
      </>
    )
  }

  const relayNote: (note: Note) => JSX.Element = (note) => {
    const relayName = note.content.split('wss://')[1]?.split('/')[0]

    const addRelayItem: () => void = () => {
      if (relayPool && database && publicKey) {
        relayPool.add(note.content, () => {
          populateRelay(relayPool, database, publicKey)
          showMessage({
            message: t('alerts.relayAdded'),
            description: note.content,
            type: 'success',
          })
          setRelayAdded(true)
        })
      }
    }

    return (
      <>
        <Layout style={styles.profile} level='2'>
          <Icon name='server' size={30} color={theme['text-basic-color']} solid />
        </Layout>
        <Layout style={styles.content} level='2'>
          <Text appearance='hint'>{note.name}</Text>
          <Text>{relayName}</Text>
        </Layout>
        <Layout style={styles.actions} level='2'>
          {!relayAdded && (
            <Button
              status='success'
              onPress={addRelayItem}
              accessoryLeft={
                <Icon name='plus-circle' size={16} color={theme['text-basic-color']} solid />
              }
            />
          )}
        </Layout>
      </>
    )
  }

  const onPressUser: (pubKey: string) => void = (pubKey) => {
    goToPage(`profile#${pubKey}`)
  }

  const styles = StyleSheet.create({
    layout: {
      flexDirection: 'row',
      backgroundColor: 'transparent',
      paddingBottom: 16,
    },
    replies: {
      flexDirection: 'row',
      backgroundColor: 'transparent',
      paddingTop: 16,
      paddingLeft: 50,
    },
    divider: {
      paddingTop: 16,
    },
    profile: {
      flex: 1,
      width: 38,
      alignItems: 'center',
      backgroundColor: 'transparent',
    },
    content: {
      flex: 4,
      backgroundColor: 'transparent',
      paddingLeft: 16,
      paddingRight: 16,
    },
    contentNoAction: {
      flex: 5,
      backgroundColor: 'transparent',
      paddingLeft: 16,
      paddingRight: 16,
    },
    actions: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    pubkey: {
      backgroundColor: 'transparent',
    },
    footer: {
      backgroundColor: 'transparent',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 10,
    },
    reactions: {
      backgroundColor: 'transparent',
      flexDirection: 'row',
    },
    tags: {
      backgroundColor: 'transparent',
      marginLeft: 12,
    },
    titleText: {
      backgroundColor: 'transparent',
      flexDirection: 'row',
    },
    text: {
      backgroundColor: 'transparent',
      paddingRight: 10,
    },
  })

  return (
    note && (
      <>
        <Layout style={styles.layout} level='2'>
          {note.kind === EventKind.recommendServer ? relayNote(note) : textNote(note)}
        </Layout>
        {replies.length > 0 ? (
          <>
            <Divider />
            {replies.map((reply) => (
              <Layout style={styles.replies} level='3' key={reply.id}>
                {textNote(reply)}
              </Layout>
            ))}
          </>
        ) : (
          <></>
        )}
      </>
    )
  )
}

export default NoteCard
