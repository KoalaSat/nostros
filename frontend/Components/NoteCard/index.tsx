import React, { useContext, useEffect, useMemo, useState } from 'react'
import { getRepliesCount, Note } from '../../Functions/DatabaseFunctions/Notes'
import { StyleSheet, View } from 'react-native'
import { RelayPoolContext } from '../../Contexts/RelayPoolContext'
import { AppContext } from '../../Contexts/AppContext'
import { t } from 'i18next'
import { isContentWarning } from '../../Functions/RelayFunctions/Events'
import { Event } from '../../../lib/nostr/Events'
import moment from 'moment'
import { populateRelay } from '../../Functions/RelayFunctions'
import { NostrosAvatar } from '../NostrosAvatar'
import { searchRelays } from '../../Functions/DatabaseFunctions/Relays'
import TextContent from '../../Components/TextContent'
import { formatPubKey, usernamePubKey } from '../../Functions/RelayFunctions/Users'
import { getReactions } from '../../Functions/DatabaseFunctions/Reactions'
import { UserContext } from '../../Contexts/UserContext'
import {
  Button,
  Card,
  Text,
  useTheme,
  Avatar,
  IconButton,
  TouchableRipple,
} from 'react-native-paper'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import { REGEX_SOCKET_LINK } from '../../Constants/Relay'
import { push } from '../../lib/Navigation'
import { getNpub } from '../../lib/nostr/Nip19'
import { User } from '../../Functions/DatabaseFunctions/Users'
import { Kind } from 'nostr-tools'

interface NoteCardProps {
  note: Note
  onPressUser?: (user: User) => void
  showAnswerData?: boolean
}

export const NoteCard: React.FC<NoteCardProps> = ({
  note,
  showAnswerData = true,
  onPressUser = () => {},
}) => {
  const theme = useTheme()
  const { publicKey, privateKey } = React.useContext(UserContext)
  const { relayPool, lastEventId } = useContext(RelayPoolContext)
  const { database } = useContext(AppContext)
  const [relayAdded, setRelayAdded] = useState<boolean>(false)
  const [positiveReactions, setPositiveReactions] = useState<number>(0)
  const [negaiveReactions, setNegativeReactions] = useState<number>(0)
  const [userUpvoted, setUserUpvoted] = useState<boolean>(false)
  const [userDownvoted, setUserDownvoted] = useState<boolean>(false)
  const [repliesCount, setRepliesCount] = React.useState<number>(0)
  const [hide, setHide] = useState<boolean>(isContentWarning(note))
  const timestamp = useMemo(() => moment.unix(note.created_at).format('L HH:mm'), [note])
  const nPub = useMemo(() => getNpub(note.pubkey), [note])

  useEffect(() => {
    if (database && publicKey && note.id) {
      getReactions(database, { eventId: note.id }).then((result) => {
        const total = result.length
        let positive = 0
        result.forEach((reaction) => {
          if (reaction.positive) {
            positive = positive + 1
            if (reaction.pubkey === publicKey) setUserUpvoted(true)
          } else if (reaction.pubkey === publicKey) {
            setUserDownvoted(true)
          }
        })
        setPositiveReactions(positive)
        setNegativeReactions(total - positive)
      })
      getRepliesCount(database, note.id).then(setRepliesCount)
    }
  }, [lastEventId])

  useEffect(() => {
    if (database && note) {
      searchRelays(note.content, database).then((result) => {
        setRelayAdded(result.length > 0)
      })
    }
  }, [database])

  const publishReaction: (positive: boolean) => void = (positive) => {
    const event: Event = {
      content: positive ? '+' : '-',
      created_at: moment().unix(),
      kind: Kind.Reaction,
      pubkey: publicKey,
      tags: [...note.tags, ['e', note.id], ['p', note.pubkey]],
    }
    relayPool?.sendEvent(event)
  }

  const textNote: () => JSX.Element = () => {
    return (
      <>
        {note.reply_event_id && showAnswerData && (
          <TouchableRipple
            onPress={() =>
              note.kind !== Kind.RecommendRelay && push('Note', { noteId: note.reply_event_id })
            }
          >
            <Card.Content style={[styles.answerContent, { borderColor: theme.colors.onSecondary }]}>
              <View style={styles.answerData}>
                <MaterialCommunityIcons
                  name='arrow-left-top'
                  size={16}
                  color={theme.colors.onPrimaryContainer}
                />
                <Text>
                  {t('noteCard.answering', { username: formatPubKey(note.reply_event_id) })}
                </Text>
              </View>
              <View>
                <Text style={styles.link}>{t('noteCard.seeParent')}</Text>
              </View>
            </Card.Content>
          </TouchableRipple>
        )}
        <Card.Content style={[styles.content, { borderColor: theme.colors.onSecondary }]}>
          {hide ? (
            <Button mode='outlined' onPress={() => setHide(false)}>
              {t('noteCard.contentWarning')}
            </Button>
          ) : (
            <TextContent event={note} onPressUser={onPressUser} />
          )}
        </Card.Content>
      </>
    )
  }

  const recommendServer: () => JSX.Element = () => {
    const relayName = note.content.split('wss://')[1]?.split('/')[0]

    const addRelayItem: () => void = () => {
      if (relayPool && database && publicKey) {
        relayPool.add(note.content, () => {
          populateRelay(relayPool, database, publicKey)
          setRelayAdded(true)
        })
      }
    }

    return (
      <TouchableRipple
        onPress={() => note.kind !== Kind.RecommendRelay && push('Note', { noteId: note.id })}
      >
        <Card.Content style={[styles.content, { borderColor: theme.colors.onSecondary }]}>
          <Card>
            <Card.Content style={styles.title}>
              <View>
                <Avatar.Icon
                  size={54}
                  icon='chart-timeline-variant'
                  style={{
                    backgroundColor: theme.colors.tertiaryContainer,
                  }}
                />
              </View>
              <View>
                <Text>{t('noteCard.recommendation')}</Text>
                <Text>{relayName}</Text>
              </View>
            </Card.Content>
            {!relayAdded && REGEX_SOCKET_LINK.test(note.content) && (
              <Card.Content style={[styles.actions, { borderColor: theme.colors.onSecondary }]}>
                <Button onPress={addRelayItem}>{t('noteCard.addRelay')}</Button>
              </Card.Content>
            )}
          </Card>
        </Card.Content>
      </TouchableRipple>
    )
  }

  const getNoteContent: () => JSX.Element | undefined = () => {
    if (note.kind === Kind.Text) {
      return textNote()
    } else if (note.kind === Kind.RecommendRelay) return recommendServer()
  }

  return (
    note && (
      <Card style={styles.container}>
        <Card.Content style={styles.title}>
          <TouchableRipple onPress={() => onPressUser({ id: note.pubkey, name: note.name })}>
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
              <View style={styles.titleUserInfo}>
                <View style={styles.titleUser}>
                  <Text style={styles.titleUsername}>{usernamePubKey(note.name, nPub)}</Text>
                  {note?.valid_nip05 ? (
                    <MaterialCommunityIcons
                      name='check-decagram-outline'
                      size={14}
                      color={theme.colors.onPrimaryContainer}
                      style={styles.verifyIcon}
                    />
                  ) : (
                    <></>
                  )}
                </View>
                <Text>{timestamp}</Text>
              </View>
            </View>
          </TouchableRipple>
          <View>
            <IconButton
              icon='dots-vertical'
              size={25}
              onPress={() => onPressUser({ id: note.pubkey, name: note.name })}
            />
          </View>
        </Card.Content>
        {getNoteContent()}
        <Card.Content style={[styles.actions, { borderColor: theme.colors.onSecondary }]}>
          <Button
            icon={() => (
              <MaterialCommunityIcons
                name='message-outline'
                size={25}
                color={theme.colors.onPrimaryContainer}
              />
            )}
            onPress={() => note.kind !== Kind.RecommendRelay && push('Note', { noteId: note.id })}
          >
            {repliesCount}
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
                color={theme.colors.onPrimaryContainer}
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
                color={theme.colors.onPrimaryContainer}
              />
            )}
          >
            {positiveReactions === undefined || positiveReactions === 0 ? '-' : positiveReactions}
          </Button>
        </Card.Content>
      </Card>
    )
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  titleUsername: {
    fontWeight: 'bold',
  },
  titleUserInfo: {
    paddingTop: 10,
    paddingLeft: 16,
  },
  title: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignContent: 'center',
    paddingBottom: 16,
  },
  titleUser: {
    flexDirection: 'row',
    alignContent: 'center',
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
  actions: {
    paddingTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
  },
  relayActions: {
    paddingTop: 16,
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  content: {
    borderTopWidth: 1,
    padding: 16,
  },
  link: {
    textDecorationLine: 'underline',
  },
  verifyIcon: {
    paddingTop: 3,
    paddingLeft: 5,
  },
})

export default NoteCard
