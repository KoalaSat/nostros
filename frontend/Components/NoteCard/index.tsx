import React, { useContext, useEffect, useState } from 'react'
import {
  getNotes,
  getRepliesCount,
  getRepostCount,
  isUserReposted,
  Note,
} from '../../Functions/DatabaseFunctions/Notes'
import { StyleSheet, View } from 'react-native'
import { RelayPoolContext } from '../../Contexts/RelayPoolContext'
import { AppContext } from '../../Contexts/AppContext'
import { t } from 'i18next'
import { isContentWarning } from '../../Functions/RelayFunctions/Events'
import { Event } from '../../../lib/nostr/Events'
import { getUnixTime } from 'date-fns'
import { populateRelay } from '../../Functions/RelayFunctions'
import { searchRelays } from '../../Functions/DatabaseFunctions/Relays'
import TextContent from '../../Components/TextContent'
import { formatPubKey } from '../../Functions/RelayFunctions/Users'
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
  Chip,
} from 'react-native-paper'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import { REGEX_SOCKET_LINK } from '../../Constants/Relay'
import { push } from '../../lib/Navigation'
import { User } from '../../Functions/DatabaseFunctions/Users'
import { Kind } from 'nostr-tools'
import ProfileData from '../ProfileData'

interface NoteCardProps {
  note?: Note
  onPressUser?: (user: User) => void
  showAvatarImage?: boolean
  showAnswerData?: boolean
  showAction?: boolean
  showActionCount?: boolean
  showPreview?: boolean
  showRepostPreview?: boolean
  numberOfLines?: number
  mode?: 'elevated' | 'outlined' | 'contained'
}

export const NoteCard: React.FC<NoteCardProps> = ({
  note,
  showAvatarImage = true,
  showAnswerData = true,
  showAction = true,
  showActionCount = true,
  showPreview = true,
  showRepostPreview = true,
  onPressUser = () => {},
  numberOfLines,
  mode = 'elevated',
}) => {
  const theme = useTheme()
  const { publicKey, privateKey } = React.useContext(UserContext)
  const { relayPool, lastEventId } = useContext(RelayPoolContext)
  const { database, showSensitive } = useContext(AppContext)
  const [relayAdded, setRelayAdded] = useState<boolean>(false)
  const [positiveReactions, setPositiveReactions] = useState<number>(0)
  const [negaiveReactions, setNegativeReactions] = useState<number>(0)
  const [userUpvoted, setUserUpvoted] = useState<boolean>(false)
  const [userDownvoted, setUserDownvoted] = useState<boolean>(false)
  const [repliesCount, setRepliesCount] = React.useState<number>(0)
  const [repostCount, serRepostCount] = React.useState<number>(0)
  const [hide, setHide] = useState<boolean>(isContentWarning(note))
  const [userReposted, setUserReposted] = useState<boolean>()
  const [repost, setRepost] = useState<Note>()

  useEffect(() => {
    if (database && publicKey && showAction && showActionCount && note?.id) {
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
      getRepostCount(database, note.id).then(serRepostCount)
      isUserReposted(database, note.id, publicKey).then(setUserReposted)
    }
  }, [lastEventId])

  useEffect(() => {
    if (database && note) {
      if (note.kind === Kind.RecommendRelay) {
        searchRelays(note.content, database).then((result) => {
          setRelayAdded(result.length > 0)
        })
      }
      if (showRepostPreview && note.repost_id) {
        getNotes(database, { filters: { id: note.repost_id } }).then((events) => {
          if (events.length > 0) {
            setRepost(events[0])
          }
        })
      }
    }
  }, [database])

  const publishReaction: (positive: boolean) => void = (positive) => {
    if (note) {
      const event: Event = {
        content: positive ? '+' : '-',
        created_at: getUnixTime(new Date()),
        kind: Kind.Reaction,
        pubkey: publicKey,
        tags: [...(note.tags ?? []), ['e', note.id], ['p', note.pubkey]],
      }
      relayPool?.sendEvent(event)
    }
  }

  const textNote: () => JSX.Element = () => {
    return (
      <>
        {note?.reply_event_id && showAnswerData && (
          <TouchableRipple
            onPress={() =>
              note.kind !== Kind.RecommendRelay && push('Note', { noteId: note.reply_event_id })
            }
          >
            <Card.Content style={[styles.answerContent, { borderColor: theme.colors.onSecondary }]}>
              <View style={styles.answerData}>
                <MaterialCommunityIcons
                  name={note.repost_id ? 'cached' : 'arrow-left-top'}
                  size={16}
                  color={theme.colors.onPrimaryContainer}
                />
                <Text>
                  {note.repost_id
                    ? t('noteCard.reposting', { pubkey: formatPubKey(note.pubkey) })
                    : t('noteCard.answering', { pubkey: formatPubKey(note.pubkey) })}
                </Text>
              </View>
              <View>
                <Text style={styles.link}>{t('noteCard.seeParent')}</Text>
              </View>
            </Card.Content>
          </TouchableRipple>
        )}
        <Card.Content style={[styles.content, { borderColor: theme.colors.onSecondary }]}>
          {hide && !showSensitive ? (
            <Button mode='outlined' onPress={() => setHide(false)}>
              {t('noteCard.contentWarning')}
            </Button>
          ) : (
            <TextContent
              event={note}
              onPressUser={onPressUser}
              showPreview={showPreview}
              numberOfLines={numberOfLines}
            />
          )}
          {showRepostPreview && repost && (
            <NoteCard
              note={repost}
              showAction={false}
              showPreview={showPreview}
              showRepostPreview={false}
            />
          )}
        </Card.Content>
      </>
    )
  }

  const recommendServer: () => JSX.Element = () => {
    const relayName = note?.content.split('wss://')[1]?.split('/')[0]

    const addRelayItem: () => void = () => {
      if (relayPool && database && publicKey && note) {
        relayPool.add(note.content, () => {
          populateRelay(relayPool, database, publicKey)
          setRelayAdded(true)
        })
      }
    }

    return (
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
          {!relayAdded && note && REGEX_SOCKET_LINK.test(note.content) && (
            <Card.Content style={[styles.bottomActions, { borderColor: theme.colors.onSecondary }]}>
              <Button onPress={addRelayItem}>{t('noteCard.addRelay')}</Button>
            </Card.Content>
          )}
        </Card>
      </Card.Content>
    )
  }

  const blockedContent: () => JSX.Element = () => {
    return (
      <Card.Content style={[styles.content, { borderColor: theme.colors.onSecondary }]}>
          <View style={styles.userBlockedWrapper}>
            <Chip
                icon={() => (
                    <MaterialCommunityIcons
                        name={'account-cancel'}
                        size={16}
                        color={theme.colors.onTertiaryContainer}
                    />
                )}
                style={{backgroundColor: theme.colors.tertiaryContainer, color: theme.colors.onTertiaryContainer}}
            >
              <Text style={{color: theme.colors.onTertiaryContainer}}>{t('noteCard.userBlocked')}</Text>
            </Chip>
          </View>
      </Card.Content>
    )
  }

  const getNoteContent: () => JSX.Element | undefined = () => {
    if (note?.blocked) {
      return blockedContent()
    } else if (note?.kind === Kind.Text) {
      return textNote()
    } else if (note?.kind === Kind.RecommendRelay) return recommendServer()
  }

  return note ? (
    <Card style={styles.container} mode={mode}>
      <Card.Content style={styles.title}>
        <TouchableRipple onPress={() => onPressUser({ id: note.pubkey, name: note.name })}>
          <ProfileData
            username={note?.name}
            publicKey={note.pubkey}
            validNip05={note?.valid_nip05}
            nip05={note?.nip05}
            lud06={note?.lnurl}
            picture={showAvatarImage ? note?.picture : undefined}
            timestamp={note?.created_at}
            avatarSize={56}
          />
        </TouchableRipple>
        {showAction && (
          <View style={styles.topAction}>
            <IconButton
              icon='dots-vertical'
              size={25}
              onPress={() => onPressUser({ id: note.pubkey, name: note.name })}
            />
          </View>
        )}
      </Card.Content>
      {getNoteContent()}
      {showAction && !note?.blocked && (
        <Card.Content style={[styles.bottomActions, { borderColor: theme.colors.onSecondary }]}>
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
            {showActionCount && repliesCount}
          </Button>
          <Button
            icon={() => (
              <MaterialCommunityIcons
                name='cached'
                size={25}
                color={userReposted ? '#7ADC70' : theme.colors.onPrimaryContainer}
              />
            )}
            onPress={() =>
              note.kind !== Kind.RecommendRelay && push('Repost', { note, type: 'repost' })
            }
          >
            {showActionCount && repostCount}
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
            {showActionCount &&
              (negaiveReactions === undefined || negaiveReactions === 0 ? '-' : negaiveReactions)}
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
            {showActionCount &&
              (positiveReactions === undefined || positiveReactions === 0
                ? '-'
                : positiveReactions)}
          </Button>
        </Card.Content>
      )}
    </Card>
  ) : (
    <></>
  )
}

const styles = StyleSheet.create({
  container: {},
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
  },
  userBlockedWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
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
  bottomActions: {
    paddingTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
  },
  topAction: {
    flexDirection: 'row',
    justifyContent: 'space-around',
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
    paddingTop: 4,
    paddingLeft: 5,
  },
})

export default NoteCard
