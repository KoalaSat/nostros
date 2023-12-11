import React, { useContext, useEffect, useMemo, useRef, useState } from 'react'
import {
  FlatList,
  Animated,
  type ListRenderItem,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollView,
  StyleSheet,
  View,
} from 'react-native'
import { AppContext } from '../../Contexts/AppContext'
import { RelayPoolContext } from '../../Contexts/RelayPoolContext'
import { type Event } from '../../lib/nostr/Events'
import {
  type DirectMessage,
  getDirectMessages,
} from '../../Functions/DatabaseFunctions/DirectMessages'
import { getUser, type User } from '../../Functions/DatabaseFunctions/Users'
import { useTranslation } from 'react-i18next'
import { username, usernamePubKey, usersToTags } from '../../Functions/RelayFunctions/Users'
import { getUnixTime } from 'date-fns'
import TextContent from '../../Components/TextContent'
import { encrypt, decrypt } from '../../lib/nostr/Nip04'
import {
  Card,
  useTheme,
  TextInput,
  Snackbar,
  TouchableRipple,
  Text,
  IconButton,
} from 'react-native-paper'
import { UserContext } from '../../Contexts/UserContext'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import { useFocusEffect } from '@react-navigation/native'
import { Kind } from 'nostr-tools'
import { formatHour, handleInfinityScroll } from '../../Functions/NativeFunctions'
import NostrosAvatar from '../../Components/NostrosAvatar'
import UploadImage from '../../Components/UploadImage'
import { Swipeable } from 'react-native-gesture-handler'
import { getETags } from '../../Functions/RelayFunctions/Events'
import DatabaseModule from '../../lib/Native/DatabaseModule'
import { push } from '../../lib/Navigation'

interface ConversationPageProps {
  route: { params: { pubKey: string; conversationId: string } }
}

export const ConversationPage: React.FC<ConversationPageProps> = ({ route }) => {
  const initialPageSize = 10
  const theme = useTheme()
  const scrollViewRef = useRef<ScrollView>()
  const { database, setRefreshBottomBarAt, online } = useContext(AppContext)
  const { relayPool, lastEventId, sendEvent } = useContext(RelayPoolContext)
  const { publicKey, privateKey, name, picture, validNip05 } = useContext(UserContext)
  const otherPubKey = useMemo(() => route.params.pubKey, [])
  const [pageSize, setPageSize] = useState<number>(initialPageSize)
  const [decryptedMessages, setDecryptedMessages] = useState<Record<string, string>>({})
  const [directMessages, setDirectMessages] = useState<DirectMessage[]>([])
  const [sendingMessages, setSendingMessages] = useState<DirectMessage[]>([])
  const [reply, setReply] = useState<DirectMessage>()
  const [otherUser, setOtherUser] = useState<User>({ id: otherPubKey })
  const [input, setInput] = useState<string>('')
  const [showNotification, setShowNotification] = useState<string>()
  const [startUpload, setStartUpload] = useState<boolean>(false)
  const [uploadingFile, setUploadingFile] = useState<boolean>(false)
  const [unableDecrypt, setUnableDecrypt] = useState<boolean>(false)

  const { t } = useTranslation('common')

  useFocusEffect(
    React.useCallback(() => {
      loadDirectMessages(true)
      subscribeDirectMessages()

      return () =>
        relayPool?.unsubscribe([
          `conversation${route.params.pubKey.substring(0, 8)}`,
          `conversation-replies${route.params.pubKey.substring(0, 8)}`,
        ])
    }, []),
  )

  useEffect(() => {
    loadDirectMessages(false)
  }, [lastEventId, online])

  const loadDirectMessages: (subscribe: boolean) => void = (subscribe) => {
    if (database && publicKey && privateKey) {
      const conversationId = route.params?.conversationId
      DatabaseModule.updateConversationRead(conversationId)
      setRefreshBottomBarAt(getUnixTime(new Date()))
      getUser(otherPubKey, database).then((user) => {
        if (user) setOtherUser(user)
      })
      getDirectMessages(database, conversationId, {
        order: 'DESC',
        limit: pageSize,
      }).then((results) => {
        if (results.length > 0) {
          setSendingMessages([])
          setDirectMessages(
            results.map((message) => {
              if (message?.id) {
                if (decryptedMessages[message.id]) {
                  message.content = decryptedMessages[message.id]
                } else {
                  try {
                    message.content = decrypt(privateKey, otherPubKey, message.content ?? '')
                    setDecryptedMessages((prev) => {
                      if (message?.id) prev[message.id] = message.content
                      return prev
                    })
                  } catch (e) {
                    setUnableDecrypt(true)
                  }
                }
              }
              return message
            }),
          )
          const lastCreateAt = pageSize <= results.length ? results[0].created_at : 0
          if (subscribe) subscribeDirectMessages(lastCreateAt)

          const repliesIds = results
            .filter((item) => getETags(item).length > 1)
            .map((message) => message.id ?? '')
          if (repliesIds && repliesIds.length > 0) {
            relayPool?.subscribe(`conversation-replies${route.params.pubKey.substring(0, 8)}`, [
              {
                kinds: [Kind.ChannelMessage],
                ids: repliesIds,
              },
            ])
          }
        } else if (subscribe) {
          subscribeDirectMessages()
        }
      })
    }
  }

  const subscribeDirectMessages: (lastCreateAt?: number) => void = async (lastCreateAt) => {
    if (publicKey && otherPubKey) {
      relayPool?.subscribe(`conversation${route.params.pubKey.substring(0, 8)}`, [
        {
          kinds: [Kind.EncryptedDirectMessage],
          authors: [publicKey],
          '#p': [otherPubKey],
        },
        {
          kinds: [Kind.EncryptedDirectMessage],
          authors: [otherPubKey],
          '#p': [publicKey],
        },
      ])
    }
  }

  const send: () => void = () => {
    if (input !== '' && otherPubKey && publicKey && privateKey) {
      const tags: string[][] = usersToTags([otherUser])

      if (reply?.id) {
        const eTags = getETags(reply)
        tags.push(['e', reply.id, '', eTags.length > 0 ? 'reply' : 'root'])
      }

      const event: Event = {
        content: input,
        created_at: getUnixTime(new Date()),
        kind: Kind.EncryptedDirectMessage,
        pubkey: publicKey,
        tags,
      }
      encrypt(privateKey, otherPubKey, input)
        .then((encryptedcontent) => {
          sendEvent({
            ...event,
            content: encryptedcontent,
          }).catch(() => {
            setShowNotification('privateMessageSendError')
          })
        })
        .catch(() => {
          setShowNotification('privateMessageSendError')
        })

      const directMessage = event as DirectMessage
      directMessage.pending = true
      directMessage.valid_nip05 = validNip05 ?? false
      setSendingMessages((prev) => [...prev, directMessage])
      setInput('')
      setReply(undefined)
    }
  }

  const swipeActions: (
    progressAnimatedValue: Animated.AnimatedInterpolation<number>,
    dragAnimatedValue: Animated.AnimatedInterpolation<number>,
  ) => JSX.Element = (_progress, dragX) => {
    const scale = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [2.3, 0],
    })
    return (
      <View style={{ width: 100, scaleY: -1 }}>
        <Animated.View
          style={{
            marginLeft: 60,
            marginTop: 40,
            transform: [{ scale }],
          }}
        >
          <MaterialCommunityIcons name='reply' color={theme.colors.onPrimaryContainer} />
        </Animated.View>
      </View>
    )
  }

  const messageContent: (message?: DirectMessage | undefined, messageId?: string) => JSX.Element = (
    message,
    messageId,
  ) => {
    return (
      <>
        <View style={styles.cardContentInfo}>
          <View style={styles.cardContentName}>
            <Text>{displayName(message, messageId)}</Text>
            {message?.valid_nip05 ? (
              <MaterialCommunityIcons
                name='check-decagram-outline'
                color={theme.colors.onPrimaryContainer}
                style={styles.verifyIcon}
              />
            ) : (
              <></>
            )}
          </View>
          <View style={styles.cardContentDate}>
            {message?.pending && (
              <View style={styles.cardContentPending}>
                <MaterialCommunityIcons
                  name='clock-outline'
                  size={14}
                  color={theme.colors.onPrimaryContainer}
                />
              </View>
            )}
            <Text>{formatHour(message?.created_at)}</Text>
          </View>
        </View>
        {message ? (
          <TextContent
            content={message?.content}
            event={message}
            onPressUser={(user) => push('ProfileActions', { userId: user.id, title: user?.name })}
            copyText
          />
        ) : (
          <Text>{t('groupPage.replyText')}</Text>
        )}
      </>
    )
  }

  const row: Swipeable[] = []

  const renderDirectMessageItem: ListRenderItem<DirectMessage> = ({ index, item }) => {
    if (!publicKey || !privateKey || !otherUser) return <></>

    const eTags = getETags(item)
    const showAvatar = index < 1 || directMessages[index - 1]?.pubkey !== item.pubkey
    const isReply = eTags.length > 0
    const repliedMessageId = eTags.length > 0 ? eTags[eTags.length - 1][1] : undefined
    const repliedMessage = directMessages.find((message) => message.id === repliedMessageId)

    return (
      <Swipeable
        ref={(ref) => {
          if (ref) row[index] = ref
        }}
        renderRightActions={swipeActions}
        friction={2}
        overshootRight={false}
        onSwipeableOpen={() => {
          setReply(item)
          row[index].close()
        }}
      >
        <View style={styles.messageRow}>
          {publicKey !== item.pubkey && (
            <View style={styles.pictureSpaceLeft}>
              {showAvatar && (
                <TouchableRipple onPress={() => push('ProfileActions', { userId: otherUser.id, title: otherUser.name })}>
                  <NostrosAvatar
                    name={otherUser.name}
                    pubKey={otherPubKey}
                    src={otherUser.picture}
                    size={40}
                  />
                </TouchableRipple>
              )}
            </View>
          )}
          <Card
            style={[
              styles.card,
              // FIXME: can't find this color
              {
                backgroundColor:
                  publicKey === item.pubkey ? theme.colors.tertiaryContainer : '#001C37',
              },
            ]}
          >
            <Card.Content>
              {isReply && (
                <View style={styles.cardContentReply}>
                  <Card
                    style={[
                      styles.card,
                      {
                        backgroundColor: theme.colors.elevation.level2,
                      },
                    ]}
                  >
                    <Card.Content>{messageContent(repliedMessage, repliedMessageId)}</Card.Content>
                  </Card>
                </View>
              )}
              {messageContent(item)}
            </Card.Content>
          </Card>
          {publicKey === item.pubkey && (
            <View style={styles.pictureSpaceRight}>
              {showAvatar && (
                <TouchableRipple onPress={() => push('ProfileActions', { userId: publicKey, title: name })}>
                  <NostrosAvatar name={name} pubKey={publicKey} src={picture} size={40} />
                </TouchableRipple>
              )}
            </View>
          )}
        </View>
      </Swipeable>
    )
  }

  const displayName: (message?: DirectMessage, messageId?: string) => string = (
    message,
    messageId,
  ) => {
    return message?.pubkey === publicKey ? usernamePubKey(name, publicKey) : username(otherUser)
  }

  const onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void = (event) => {
    if (handleInfinityScroll(event)) {
      setPageSize(pageSize + initialPageSize)
    }
  }

  const unableDecryptView = React.useMemo(
    () => (
      <View style={styles.blank}>
        <MaterialCommunityIcons
          name='email-outline'
          size={64}
          style={styles.center}
          color={theme.colors.onPrimaryContainer}
        />
        <Text variant='headlineSmall' style={styles.center}>
          {t('conversationPage.unableDecypt', { username: username(otherUser) })}
        </Text>
      </View>
    ),
    [otherUser],
  )

  return unableDecrypt ? (
    unableDecryptView
  ) : (
    <View style={styles.container}>
      <FlatList
        style={styles.list}
        data={[...sendingMessages, ...directMessages]}
        renderItem={renderDirectMessageItem}
        horizontal={false}
        ref={scrollViewRef}
        onScroll={onScroll}
      />
      {reply ? (
        <View style={[styles.reply, { backgroundColor: theme.colors.backdrop }]}>
          <MaterialCommunityIcons
            name='reply'
            size={25}
            color={theme.colors.onPrimaryContainer}
            style={styles.replyIcon}
          />
          <View style={styles.replyText}>
            <Text style={styles.replyName}>{displayName(reply)}</Text>
            <TextContent
              content={reply.content}
              event={reply}
              onPressUser={(user) => push('ProfileActions', { userId: user.id, title: user?.name })}
              showPreview={false}
              numberOfLines={3}
            />
          </View>
          <IconButton
            style={styles.replyCloseIcon}
            icon='close-circle-outline'
            size={25}
            onPress={() => setReply(undefined)}
          />
        </View>
      ) : (
        <></>
      )}
      <View
        style={[
          styles.input,
          {
            backgroundColor: '#001C37',
          },
        ]}
      >
        <TextInput
          mode='outlined'
          multiline
          label={t('conversationPage.typeMessage') ?? ''}
          value={input}
          onChangeText={setInput}
          onFocus={() => {
            if (directMessages.length > 0) scrollViewRef.current?.scrollToEnd({ animated: true })}
          }
          left={
            <TextInput.Icon
              icon={() => (
                <MaterialCommunityIcons
                  name='image-outline'
                  size={25}
                  color={theme.colors.onPrimaryContainer}
                />
              )}
              onPress={() => setStartUpload(true)}
            />
          }
          right={
            <TextInput.Icon
              icon={() => (
                <MaterialCommunityIcons
                  name='send-outline'
                  size={25}
                  color={theme.colors.onPrimaryContainer}
                />
              )}
              onPress={send}
            />
          }
        />
      </View>
      {showNotification && (
        <Snackbar
          style={styles.snackbar}
          visible={showNotification !== undefined}
          duration={Snackbar.DURATION_SHORT}
          onIconPress={() => setShowNotification(undefined)}
          onDismiss={() => setShowNotification(undefined)}
        >
          {t(`conversationPage.notifications.${showNotification}`)}
        </Snackbar>
      )}
      <UploadImage
        startUpload={startUpload}
        setImageUri={(imageUri) => {
          setInput((prev) => `${prev} ${imageUri}`)
          setStartUpload(false)
        }}
        onError={() => setStartUpload(false)}
        uploadingFile={uploadingFile}
        setUploadingFile={setUploadingFile}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  list: {
    scaleY: -1,
  },
  blank: {
    justifyContent: 'space-between',
    height: 170,
    marginTop: 91,
  },
  replyText: {
    width: '80%',
    paddingLeft: 16,
  },
  replyName: {
    fontWeight: 'bold',
  },
  reply: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  replyIcon: {
    marginTop: 8,
    marginBottom: -16,
  },
  replyCloseIcon: {
    marginTop: 0,
    marginBottom: -16,
  },
  scrollView: {
    paddingBottom: 16,
  },
  messageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    scaleY: -1,
    paddingLeft: 16,
    paddingRight: 16,
  },
  cardContentDate: {
    flexDirection: 'row',
  },
  container: {
    paddingBottom: 16,
    justifyContent: 'space-between',
    flex: 1,
  },
  card: {
    marginTop: 16,
    flex: 6,
  },
  cardContentInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardContentPending: {
    flexDirection: 'row',
    alignContent: 'center',
    justifyContent: 'center',
    paddingRight: 5,
    paddingTop: 3,
  },
  pictureSpaceLeft: {
    justifyContent: 'flex-end',
    width: 50,
    flex: 1,
  },
  pictureSpaceRight: {
    alignContent: 'flex-end',
    justifyContent: 'flex-end',
    width: 50,
    flex: 1,
    paddingLeft: 16,
  },
  input: {
    flexDirection: 'column-reverse',
    marginTop: 16,
    paddingLeft: 16,
    paddingRight: 16,
  },
  snackbar: {
    margin: 16,
    bottom: 70,
    flex: 1,
  },
  verifyIcon: {
    paddingTop: 4,
    paddingLeft: 5,
  },
  cardContentName: {
    flexDirection: 'row',
  },
  cardContentReply: {
    marginTop: -16,
    marginBottom: 16,
  },
  center: {
    alignContent: 'center',
    textAlign: 'center',
  },
})

export default ConversationPage
