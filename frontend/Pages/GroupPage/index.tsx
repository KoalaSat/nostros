import React, { useContext, useEffect, useState } from 'react'
import {
  Animated,
  FlatList,
  type ListRenderItem,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  StyleSheet,
  View,
} from 'react-native'
import { AppContext } from '../../Contexts/AppContext'
import { RelayPoolContext } from '../../Contexts/RelayPoolContext'
import { type Event } from '../../lib/nostr/Events'
import { useTranslation } from 'react-i18next'
import { formatPubKey, username, usernamePubKey } from '../../Functions/RelayFunctions/Users'
import { getUnixTime } from 'date-fns'
import TextContent from '../../Components/TextContent'
import {
  Card,
  useTheme,
  TextInput,
  TouchableRipple,
  Text,
  ActivityIndicator,
  IconButton,
} from 'react-native-paper'
import { UserContext } from '../../Contexts/UserContext'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import { useFocusEffect } from '@react-navigation/native'
import { Kind } from 'nostr-tools'
import { formatHour, handleInfinityScroll } from '../../Functions/NativeFunctions'
import NostrosAvatar from '../../Components/NostrosAvatar'
import UploadImage from '../../Components/UploadImage'
import { getGroupMessages, type GroupMessage } from '../../Functions/DatabaseFunctions/Groups'
import { type RelayFilters } from '../../lib/nostr/RelayPool/intex'
import { getUsers, type User } from '../../Functions/DatabaseFunctions/Users'
import ProfileData from '../../Components/ProfileData'
import { ScrollView, Swipeable } from 'react-native-gesture-handler'
import { getETags } from '../../Functions/RelayFunctions/Events'
import DatabaseModule from '../../lib/Native/DatabaseModule'
import { getRelayMetadata } from '../../Functions/DatabaseFunctions/RelayMetadatas'
import { getNprofile } from '../../lib/nostr/Nip19'

interface GroupPageProps {
  route: { params: { groupId: string } }
}

export const GroupPage: React.FC<GroupPageProps> = ({ route }) => {
  const initialPageSize = 20
  const theme = useTheme()
  const { database, setDisplayUserDrawer } = useContext(AppContext)
  const { relayPool, lastEventId, sendEvent } = useContext(RelayPoolContext)
  const { publicKey, privateKey, name, picture, validNip05 } = useContext(UserContext)
  const [pageSize, setPageSize] = useState<number>(initialPageSize)
  const [groupMessages, setGroupMessages] = useState<GroupMessage[]>([])
  const [sendingMessages, setSendingMessages] = useState<GroupMessage[]>([])
  const [reply, setReply] = useState<GroupMessage>()
  const [input, setInput] = useState<string>('')
  const [startUpload, setStartUpload] = useState<boolean>(false)
  const [uploadingFile, setUploadingFile] = useState<boolean>(false)
  const [userSuggestions, setUserSuggestions] = useState<User[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [userMentions, setUserMentions] = useState<User[]>([])

  const { t } = useTranslation('common')

  useFocusEffect(
    React.useCallback(() => {
      loadGroupMessages(true)
      if (database) getUsers(database, {}).then(setUsers)

      return () =>
        relayPool?.unsubscribe([
          `group${route.params.groupId}`,
          `group-replies${route.params.groupId.substring(0, 8)}`,
        ])
    }, []),
  )

  useEffect(() => {
    loadGroupMessages(false)
  }, [lastEventId, pageSize])

  const loadGroupMessages: (subscribe: boolean) => void = (subscribe) => {
    if (database && publicKey && route.params.groupId) {
      DatabaseModule.updateGroupRead(route.params.groupId)
      getGroupMessages(database, route.params.groupId, {
        order: 'DESC',
        limit: pageSize,
      }).then((results) => {
        if (results.length > 0) {
          setSendingMessages([])
          setGroupMessages(results)

          const pubKeys = results
            .map((message) => message.pubkey)
            .filter((item, index, array) => array.indexOf(item) === index)
          const repliesIds = results
            .filter((item) => getETags(item).length > 1)
            .map((message) => message.id ?? '')
          if (subscribe) subscribeGroupMessages(pubKeys, repliesIds)
        } else if (subscribe) {
          subscribeGroupMessages()
        }
      })
    }
  }

  const subscribeGroupMessages: (pubKeys?: string[], repliesIds?: string[]) => void = async (
    pubKeys,
    repliesIds,
  ) => {
    if (publicKey && route.params.groupId) {
      const filters: RelayFilters[] = [
        {
          kinds: [Kind.ChannelCreation],
          ids: [route.params.groupId],
        },
        {
          kinds: [Kind.ChannelMetadata],
          '#e': [route.params.groupId],
        },
        {
          kinds: [Kind.ChannelMessage],
          '#e': [route.params.groupId],
          limit: pageSize,
        },
      ]
      if (pubKeys && pubKeys.length > 0) {
        filters.push({
          kinds: [Kind.Metadata],
          authors: pubKeys,
        })
      }

      relayPool?.subscribe(`group${route.params.groupId.substring(0, 8)}`, filters)

      if (repliesIds && repliesIds.length > 0) {
        relayPool?.subscribe(`group-replies${route.params.groupId.substring(0, 8)}`, [
          {
            kinds: [Kind.ChannelMessage],
            ids: repliesIds,
            '#e': [route.params.groupId],
          },
        ])
      }
    }
  }

  const mentionText: (user: User) => string = (user) => {
    return `@${user.name ?? formatPubKey(user.id)}`
  }

  const addUserMention: (user: User) => void = (user) => {
    setUserMentions((prev) => {
      prev.push(user)
      return prev
    })
    setInput((prev) => {
      const splitText = prev.split('@')
      splitText.pop()
      return `${splitText.join('@')}${mentionText(user)} `
    })
    setUserSuggestions([])
  }

  const renderContactItem: (item: User, index: number) => JSX.Element = (item, index) => (
    <TouchableRipple onPress={() => addUserMention(item)}>
      <View key={index} style={styles.contactRow}>
        <ProfileData
          username={item?.name}
          publicKey={item?.id}
          validNip05={item?.valid_nip05}
          nip05={item?.nip05}
          lnurl={item?.lnurl}
          lnAddress={item?.ln_address}
          picture={item?.picture}
        />
      </View>
    </TouchableRipple>
  )

  const send: () => void = async () => {
    if (input !== '' && publicKey && privateKey && route.params.groupId) {
      let rawContent = input
      const tags: string[][] = [['e', route.params.groupId, '']]

      if (userMentions.length > 0 && database) {
        for (const user of userMentions) {
          const userText = mentionText(user)
          if (rawContent.includes(userText)) {
            const resultMeta = await getRelayMetadata(database, user.id)
            const nProfile = getNprofile(
              user.id,
              resultMeta.tags.map((relayMeta) => relayMeta[1]),
            )
            rawContent = rawContent.replace(userText, `nostr:${nProfile}`)
            tags.push(['p', user.id, ''])
          }
        }
      }

      if (reply?.id) {
        const eTags = getETags(reply)
        tags.push(['e', reply.id, '', eTags.length > 1 ? 'reply' : 'root'])
        tags.push(['p', reply.pubkey, ''])
      }

      const event: Event = {
        content: rawContent,
        created_at: getUnixTime(new Date()),
        kind: Kind.ChannelMessage,
        pubkey: publicKey,
        tags,
      }
      sendEvent(event)
      const groupMessage: GroupMessage = {
        ...event,
        name: name ?? '',
        pending: true,
        valid_nip05: validNip05,
      }
      setSendingMessages((prev) => [...prev, groupMessage])
      setInput('')
      setReply(undefined)
    }
  }

  const onChangeText: (text: string) => void = (text) => {
    const match = text.match(/.*@(.*)$/)
    if (database && match && match?.length > 0) {
      const search = match[1].toLowerCase()
      setUserSuggestions(users.filter((item) => item.name?.toLocaleLowerCase()?.includes(search)))
    } else {
      setUserSuggestions([])
    }
    setInput(text)
  }

  const displayName: (message?: GroupMessage, messageId?: string) => string = (
    message,
    messageId,
  ) => {
    return message?.pubkey === publicKey
      ? usernamePubKey(name, publicKey)
      : username({ name: message?.name ?? '', id: messageId ?? '' })
  }

  const row: Swipeable[] = []

  const renderGroupMessageItem: ListRenderItem<GroupMessage> = ({ index, item }) => {
    if (!publicKey) return <></>

    const showAvatar = [...groupMessages, ...sendingMessages][index - 1]?.pubkey !== item.pubkey

    const eTags = getETags(item)
    const isReply = eTags.length > 1
    const repliedGroupMessageId = eTags.length > 1 ? eTags[eTags.length - 1][1] : undefined
    const repliedGroupMessage = groupMessages.find(
      (message) => message.id === repliedGroupMessageId,
    )

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

    const messageContent: (
      message?: GroupMessage | undefined,
      messageId?: string,
    ) => JSX.Element = (message, messageId) => {
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
              onPressUser={(user) => setDisplayUserDrawer(user.id)}
              copyText
            />
          ) : (
            <Text>{t('groupPage.replyText')}</Text>
          )}
        </>
      )
    }

    return (
      <Swipeable
        ref={(ref) => {
          if (ref) row[index] = ref
        }}
        renderRightActions={swipeActions}
        friction={2}
        overshootRight={false}
        onSwipeableOpen={() => {
          row[index].close()
          setReply(item)
        }}
      >
        <View style={styles.messageRow} key={index}>
          {publicKey !== item.pubkey && (
            <View style={styles.pictureSpaceLeft}>
              {showAvatar && (
                <TouchableRipple onPress={() => setDisplayUserDrawer(item.pubkey)}>
                  <NostrosAvatar
                    name={displayName(item)}
                    pubKey={item.pubkey}
                    src={item.picture}
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
                    <Card.Content>
                      {messageContent(repliedGroupMessage, repliedGroupMessageId)}
                    </Card.Content>
                  </Card>
                </View>
              )}
              {messageContent(item)}
            </Card.Content>
          </Card>
          {publicKey === item.pubkey && (
            <View style={styles.pictureSpaceRight}>
              {showAvatar && (
                <TouchableRipple onPress={() => setDisplayUserDrawer(publicKey)}>
                  <NostrosAvatar name={name} pubKey={publicKey} src={picture} size={40} />
                </TouchableRipple>
              )}
            </View>
          )}
        </View>
      </Swipeable>
    )
  }

  const onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void = (event) => {
    if (handleInfinityScroll(event)) {
      setPageSize(pageSize + initialPageSize)
    }
  }

  return (
    <View style={styles.container}>
      <FlatList
        style={styles.list}
        data={[...sendingMessages, ...groupMessages]}
        renderItem={renderGroupMessageItem}
        horizontal={false}
        onScroll={onScroll}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={
          groupMessages.length > 0 ? (
            <ActivityIndicator style={styles.loading} animating={true} />
          ) : (
            <></>
          )
        }
      />
      {userSuggestions.length > 0 ? (
        <View style={[styles.contactsList, { backgroundColor: theme.colors.background }]}>
          <ScrollView>
            {userSuggestions.map((user, index) => renderContactItem(user, index))}
          </ScrollView>
        </View>
      ) : (
        <></>
      )}
      {reply ? (
        <View style={[styles.reply, { backgroundColor: theme.colors.elevation.level2 }]}>
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
              onPressUser={(user) => setDisplayUserDrawer(user.id)}
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
          label={t('groupPage.typeMessage') ?? ''}
          value={input}
          onChangeText={onChangeText}
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
    paddingBottom: 3,
  },
  cardContentDate: {
    flexDirection: 'row',
  },
  contactRow: {
    paddingLeft: 16,
    paddingRight: 16,
    paddingTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
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
  contactsList: {
    bottom: 1,
    maxHeight: 200,
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
  warning: {
    borderRadius: 4,
    paddingLeft: 5,
    paddingRight: 5,
    marginRight: 5,
  },
  input: {
    flexDirection: 'column-reverse',
    marginTop: 16,
    paddingLeft: 16,
    paddingRight: 16,
  },
  loading: {
    paddingTop: 16,
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
})

export default GroupPage
