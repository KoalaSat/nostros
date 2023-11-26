import React, { useContext, useEffect, useState } from 'react'
import {
  getNoteRelays,
  getNotes,
  getRepliesCount,
  getRepostCount,
  isUserReposted,
  type Note,
  type NoteRelay,
} from '../../Functions/DatabaseFunctions/Notes'
import { StyleSheet, View } from 'react-native'
import { RelayPoolContext } from '../../Contexts/RelayPoolContext'
import { AppContext } from '../../Contexts/AppContext'
import { t } from 'i18next'
import { getBitcoinTag, isContentWarning } from '../../Functions/RelayFunctions/Events'
import { type Event } from '../../lib/nostr/Events'
import { getUnixTime } from 'date-fns'
import { type Relay, searchRelays } from '../../Functions/DatabaseFunctions/Relays'
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
  TouchableRipple,
  Chip,
  Surface,
  IconButton,
} from 'react-native-paper'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import { REGEX_SOCKET_LINK } from '../../Constants/Relay'
import { navigate, push } from '../../lib/Navigation'
import { Kind, nip19 } from 'nostr-tools'
import ProfileData from '../ProfileData'
import { formatBigNumber, relayToColor } from '../../Functions/NativeFunctions'
import { SvgXml } from 'react-native-svg'
import { reactionIcon } from '../../Constants/Theme'
import { getZapsAmount } from '../../Functions/DatabaseFunctions/Zaps'
import { lightningInvoice } from '../../Functions/ServicesFunctions/ZapInvoice'
import LnPreview from '../LnPreview'
import { getNpub } from '../../lib/nostr/Nip19'

interface NoteCardProps {
  note?: Note
  showAvatarImage?: boolean
  showAnswerData?: boolean
  showRelayColors?: boolean
  showAction?: boolean
  showActionCount?: boolean
  showPreview?: boolean
  showRepostPreview?: boolean
  numberOfLines?: number
  mode?: 'elevated' | 'outlined' | 'contained'
  hightlightText?: string
}

export const NoteCard: React.FC<NoteCardProps> = ({
  note,
  showRelayColors = true,
  showAvatarImage = true,
  showAnswerData = true,
  showAction = true,
  showActionCount = true,
  showPreview = true,
  showRepostPreview = true,
  numberOfLines,
  mode = 'elevated',
  hightlightText,
}) => {
  const theme = useTheme()
  const { publicKey, privateKey, mutedUsers } = React.useContext(UserContext)
  const { sendEvent, lastEventId, addRelayItem } = useContext(RelayPoolContext)
  const {
    database,
    showSensitive,
    relayColouring,
    longPressZap,
  } = useContext(AppContext)
  const [relayAdded, setRelayAdded] = useState<boolean>(false)
  const [positiveReactions, setPositiveReactions] = useState<number>(0)
  const [negativeReactions, setNegativeReactions] = useState<number>(0)
  const [userUpvoted, setUserUpvoted] = useState<boolean>(false)
  const [userDownvoted, setUserDownvoted] = useState<boolean>(false)
  const [repliesCount, setRepliesCount] = React.useState<number>(0)
  const [repostCount, serRepostCount] = React.useState<number>(0)
  const [zapsAmount, setZapsAmount] = React.useState<number>()
  const [relays, setRelays] = React.useState<NoteRelay[]>([])
  const [hide, setHide] = useState<boolean>(isContentWarning(note))
  const [userReposted, setUserReposted] = useState<boolean>()
  const [repost, setRepost] = useState<Note>()
  const [showReactions, setShowReactions] = React.useState<boolean>(false)
  const [loadingZap, setLoadingZap] = React.useState<boolean>(false)
  const [mutedUser, setMutedUser] = React.useState<boolean>(false)
  const [zapInvoice, setZapInvoice] = React.useState<string>()
  const [bitcoinTag, setBitcoinTag] = React.useState<string[]>()

  useEffect(() => {
    if (database && publicKey && note?.id) {
      if (showAction && showActionCount) {
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
        if (note.zap_pubkey?.length > 0) {
          getZapsAmount(database, note.id).then(setZapsAmount)
        }
      }
      getNoteRelays(database, note.id).then(setRelays)
      setMutedUser(mutedUsers.find((e) => e === note.pubkey) !== undefined)
      const bTags = getBitcoinTag(note)
      setBitcoinTag(bTags[bTags.length - 1] ?? undefined)
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
        getNotes(database, { filters: { id: [note.repost_id] } }).then((events) => {
          if (events.length > 0) {
            setRepost(events[0])
          }
        })
      }
    }
  }, [database])

  const publishReaction: (positive: boolean) => void = (positive) => {
    if (note?.id && publicKey) {
      const event: Event = {
        content: positive ? '+' : '-',
        created_at: getUnixTime(new Date()),
        kind: Kind.Reaction,
        pubkey: publicKey,
        tags: [...note.tags, ['e', note.id], ['p', note.pubkey]],
      }
      sendEvent(event)
    }
  }

  const textNote: () => JSX.Element = () => {
    return (
      <>
        {note?.reply_event_id && !note.repost_id && showAnswerData && (
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
                <Text>{t('noteCard.answering', { pubkey: formatPubKey(note.pubkey) })}</Text>
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
              onPressUser={(user) => push('ProfileActions', { userId: user.id, title: user.name})}
              showPreview={showPreview}
              numberOfLines={numberOfLines}
              hightlightText={hightlightText}
            />
          )}
          {note?.repost_id && (
            <TouchableRipple onPress={() => {
              console.log({ noteId: note.repost_id })
              navigate('Note', { noteId: note.repost_id })
            }}>
              {repost && showRepostPreview ? (
                <NoteCard
                  note={repost}
                  showPreview={showPreview}
                  showRepostPreview={false}
                  showAction={false}
                  showRelayColors={false}
                />
              ) : (
                <Chip
                  icon={() => (
                    <MaterialCommunityIcons
                      name='cached'
                      size={16}
                      color={theme.colors.onTertiaryContainer}
                    />
                  )}
                  style={{
                    backgroundColor: theme.colors.secondaryContainer,
                    color: theme.colors.onTertiaryContainer,
                  }}
                >
                  <Text style={{ color: theme.colors.onTertiaryContainer }}>
                    {t('noteCard.reposted')}
                  </Text>
                </Chip>
              )}
            </TouchableRipple>
          )}
        </Card.Content>
      </>
    )
  }

  const recommendServer: () => JSX.Element = () => {
    const relay: Relay = {
      url: note?.content ?? '',
    }

    return (
      <Card.Content style={[styles.content, { borderColor: theme.colors.onSecondary }]}>
        <Card>
          <Card.Title
            title={t('noteCard.recommendation')}
            subtitle={relay.url}
            left={(props) => (
              <Avatar.Icon
                {...props}
                icon='chart-timeline-variant'
                style={{
                  backgroundColor: theme.colors.tertiaryContainer,
                }}
              />
            )}
          />
          {!relayAdded && note && REGEX_SOCKET_LINK.test(note.content) && (
            <Card.Content style={[styles.bottomActions, { borderColor: theme.colors.onSecondary }]}>
              <Button mode='contained' onPress={async () => await addRelayItem(relay)}>
                {t('noteCard.addRelay')}
              </Button>
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
            style={{
              backgroundColor: theme.colors.tertiaryContainer,
              color: theme.colors.onTertiaryContainer,
            }}
          >
            <Text style={{ color: theme.colors.onTertiaryContainer }}>
              {t('noteCard.userMuted')}
            </Text>
          </Chip>
        </View>
      </Card.Content>
    )
  }

  const getNoteContent: () => JSX.Element | undefined = () => {
    if (mutedUser) {
      return blockedContent()
    } else if (note?.kind === Kind.Text) {
      return textNote()
    } else if (note?.kind === Kind.RecommendRelay) return recommendServer()
  }

  const reactions: () => JSX.Element = () => (
    <Card style={styles.reactionsPopup} elevation={3}>
      <View style={styles.reactionsPopupContent}>
        <Button
          onPress={() => {
            if (!userDownvoted && privateKey) {
              setUserDownvoted(true)
              setNegativeReactions((prev) => prev + 1)
              publishReaction(false)
            }
            setShowReactions(false)
          }}
          icon={() => (
            <MaterialCommunityIcons
              name={userDownvoted ? 'thumb-down' : 'thumb-down-outline'}
              size={24}
              color={theme.colors.onPrimaryContainer}
            />
          )}
        >
          {showActionCount && (negativeReactions === undefined ? 0 : negativeReactions)}
        </Button>
        <Button
          onPress={() => {
            if (!userUpvoted && privateKey) {
              setUserUpvoted(true)
              setPositiveReactions((prev) => prev + 1)
              publishReaction(true)
            }
            setShowReactions(false)
          }}
          icon={() => (
            <MaterialCommunityIcons
              name={userUpvoted ? 'thumb-up' : 'thumb-up-outline'}
              size={24}
              color={theme.colors.onPrimaryContainer}
            />
          )}
        >
          {showActionCount && (positiveReactions === undefined ? 0 : positiveReactions)}
        </Button>
      </View>
    </Card>
  )

  const generateZapInvoice: () => void = () => {
    const lud = note?.ln_address && note?.ln_address !== '' ? note?.ln_address : note?.lnurl

    if (lud && lud !== '' && longPressZap && database && privateKey && publicKey && note?.pubkey) {
      setLoadingZap(true)
      lightningInvoice(
        database,
        lud,
        longPressZap,
        privateKey,
        publicKey,
        note?.pubkey,
        true,
        note?.zap_pubkey,
        `Nostr: ${formatPubKey(getNpub(note?.id))}`,
        note?.id,
      )
        .then((invoice) => {
          if (invoice) setZapInvoice(invoice)
          setLoadingZap(false)
        })
        .catch(() => {
          setLoadingZap(false)
        })
    }
  }

  const reactionsCount: () => number = () => {
    if (userDownvoted) return negativeReactions
    if (userUpvoted) return positiveReactions

    return negativeReactions + positiveReactions
  }

  const reactionsIcon: () => JSX.Element = () => {
    if (userUpvoted)
      return (
        <MaterialCommunityIcons
          name={'thumb-up'}
          size={24}
          color={theme.colors.onPrimaryContainer}
        />
      )
    if (userDownvoted)
      return (
        <MaterialCommunityIcons
          name={'thumb-down'}
          size={24}
          color={theme.colors.onPrimaryContainer}
        />
      )

    return <SvgXml height={22} xml={reactionIcon} color={theme.colors.onPrimaryContainer} />
  }

  return note ? (
    <Card mode={mode}>
      <Card.Content style={styles.title}>
        <View>
          <TouchableRipple onPress={() => push('ProfileActions', { userId: note.pubkey, title: note?.name})}>
            <ProfileData
              username={note?.name}
              publicKey={note.pubkey}
              validNip05={note?.valid_nip05}
              nip05={note?.nip05}
              lnurl={note?.lnurl}
              lnAddress={note?.ln_address}
              picture={showAvatarImage ? note?.picture : undefined}
              timestamp={note?.created_at}
              bitcoinTag={bitcoinTag}
            />
          </TouchableRipple>
        </View>
        <View style={styles.noteOptionsIcon}>
          <IconButton
            icon='dots-vertical'
            size={28}
            onPress={() => push('NoteActions', { note})}
          />
        </View>
      </Card.Content>
      {getNoteContent()}
      {!mutedUser && showAction && (
        <Card.Content style={[styles.bottomActions, { borderColor: theme.colors.onSecondary }]}>
          <Button
            style={styles.action}
            icon={() => (
              <MaterialCommunityIcons
                name='message-outline'
                size={24}
                color={theme.colors.onPrimaryContainer}
              />
            )}
            onPress={() => note.kind !== Kind.RecommendRelay && push('Note', { noteId: note.id })}
          >
            {showActionCount && repliesCount}
          </Button>
          <Button
            style={styles.action}
            icon={() => (
              <MaterialCommunityIcons
                name='cached'
                size={24}
                color={userReposted ? '#7ADC70' : theme.colors.onPrimaryContainer}
              />
            )}
            onPress={() =>
              note.kind !== Kind.RecommendRelay && push('Repost', { note, type: 'repost' })
            }
          >
            {showActionCount && repostCount}
          </Button>
          {showReactions && reactions()}
          <Surface style={styles.action} elevation={showReactions ? 3 : 0}>
            <Button icon={reactionsIcon} onPress={() => setShowReactions((prev) => !prev)}>
              {showActionCount && reactionsCount()}
            </Button>
          </Surface>
          <Button
            style={styles.action}
            disabled={!note?.lnurl && !note?.ln_address}
            icon={() => (
              <MaterialCommunityIcons
                name='lightning-bolt'
                size={24}
                color={!note?.lnurl && !note?.ln_address ? undefined : '#F5D112'}
              />
            )}
            onPress={() => navigate('Zap', { note })}
            onLongPress={longPressZap ? generateZapInvoice : undefined}
            loading={loadingZap}
          >
            {note.zap_pubkey?.length > 0 ? formatBigNumber(zapsAmount) : ''}
          </Button>
          {zapInvoice && <LnPreview invoice={zapInvoice} setInvoice={setZapInvoice} />}
        </Card.Content>
      )}
      <Card.Content style={styles.relayList}>
        {relayColouring &&
          showRelayColors &&
          relays.map((relay, index) => (
            <View
              key={relay.relay_url}
              style={[
                styles.relay,
                { borderBottomColor: relayToColor(relay.relay_url) },
                index === 0 ? { borderBottomLeftRadius: 50 } : {},
                index === relays.length - 1 ? { borderBottomRightRadius: 50 } : {},
              ]}
            />
          ))}
      </Card.Content>
    </Card>
  ) : (
    <></>
  )
}

const styles = StyleSheet.create({
  relayList: {
    flexDirection: 'row',
    bottom: 2,
    marginBottom: -16,
    marginLeft: -16,
    marginRight: -16,
  },
  relay: {
    flex: 1,
    height: 10,
    borderBottomWidth: 2,
  },
  titleUsername: {
    fontWeight: 'bold',
  },
  titleUserInfo: {
    paddingTop: 10,
    paddingLeft: 16,
  },
  reactionsPopupContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  reactionsPopup: {
    position: 'absolute',
    bottom: 50,
    left: '48%',
  },
  title: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 16,
  },
  userBlockedWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
    paddingTop: 8,
    flexWrap: 'wrap',
    flexDirection: 'row',
    borderTopWidth: 1,
    justifyContent: 'flex-start',
  },
  action: {
    flexBasis: '25%',
    borderRadius: 12,
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
    padding: 12,
  },
  link: {
    textDecorationLine: 'underline',
  },
  verifyIcon: {
    paddingTop: 4,
    paddingLeft: 5,
  },
  snackbar: {
    marginBottom: 50,
    marginLeft: 0,
    flex: 1,
  },
  noteOptionsIcon: {
    marginBottom: -16,
    marginRight: -16,
    marginTop: -8,
  },
})

export default NoteCard
