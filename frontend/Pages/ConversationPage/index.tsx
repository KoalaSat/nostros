import React, { useContext, useEffect, useMemo, useRef, useState } from 'react'
import { NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleSheet, View } from 'react-native'
import { AppContext } from '../../Contexts/AppContext'
import { RelayPoolContext } from '../../Contexts/RelayPoolContext'
import { Event } from '../../lib/nostr/Events'
import {
  DirectMessage,
  getDirectMessages,
  updateConversationRead,
} from '../../Functions/DatabaseFunctions/DirectMessages'
import { getUser, User } from '../../Functions/DatabaseFunctions/Users'
import { useTranslation } from 'react-i18next'
import { username, usernamePubKey, usersToTags } from '../../Functions/RelayFunctions/Users'
import { getUnixTime, formatDistance, fromUnixTime } from 'date-fns'
import TextContent from '../../Components/TextContent'
import { encrypt, decrypt } from '../../lib/nostr/Nip04'
import { Card, useTheme, TextInput, Snackbar, TouchableRipple, Text } from 'react-native-paper'
import { UserContext } from '../../Contexts/UserContext'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import { useFocusEffect } from '@react-navigation/native'
import { Kind } from 'nostr-tools'
import { handleInfinityScroll } from '../../Functions/NativeFunctions'
import NostrosAvatar from '../../Components/NostrosAvatar'
import { FlashList, ListRenderItem } from '@shopify/flash-list'
import UploadImage from '../../Components/UploadImage'

interface ConversationPageProps {
  route: { params: { pubKey: string; conversationId: string } }
}

export const ConversationPage: React.FC<ConversationPageProps> = ({ route }) => {
  const initialPageSize = 10
  const theme = useTheme()
  const scrollViewRef = useRef<ScrollView>()
  const { database, setRefreshBottomBarAt, setDisplayUserDrawer } = useContext(AppContext)
  const { relayPool, lastEventId } = useContext(RelayPoolContext)
  const { publicKey, privateKey, name, picture } = useContext(UserContext)
  const otherPubKey = useMemo(() => route.params.pubKey, [])
  const [pageSize, setPageSize] = useState<number>(initialPageSize)
  const [directMessages, setDirectMessages] = useState<DirectMessage[]>([])
  const [sendingMessages, setSendingMessages] = useState<DirectMessage[]>([])
  const [otherUser, setOtherUser] = useState<User>({ id: otherPubKey })
  const [input, setInput] = useState<string>('')
  const [showNotification, setShowNotification] = useState<string>()
  const [startUpload, setStartUpload] = useState<boolean>(false)
  const [uploadingFile, setUploadingFile] = useState<boolean>(false)

  const { t } = useTranslation('common')

  useFocusEffect(
    React.useCallback(() => {
      loadDirectMessages(true)
      subscribeDirectMessages()

      return () => relayPool?.unsubscribe([`conversation${route.params.pubKey}`])
    }, []),
  )

  useEffect(() => {
    loadDirectMessages(false)
  }, [lastEventId])

  const loadDirectMessages: (subscribe: boolean) => void = (subscribe) => {
    if (database && publicKey && privateKey) {
      const conversationId = route.params?.conversationId
      updateConversationRead(conversationId, database)
      setRefreshBottomBarAt(getUnixTime(new Date()))
      getUser(otherPubKey, database).then((user) => {
        if (user) setOtherUser(user)
      })
      getDirectMessages(database, conversationId, publicKey, otherPubKey, {
        order: 'DESC',
        limit: pageSize,
      }).then((results) => {
        if (results.length > 0) {
          setSendingMessages([])
          setDirectMessages((prev) => {
            return results.map((message, index) => {
              if (prev.length > index) {
                return prev[index]
              } else {
                message.content = decrypt(privateKey, otherPubKey, message.content ?? '')
                return message
              }
            })
          })
          if (subscribe) subscribeDirectMessages(results[0].created_at)
        } else if (subscribe) {
          subscribeDirectMessages()
        }
      })
    }
  }

  const subscribeDirectMessages: (lastCreateAt?: number) => void = async (lastCreateAt) => {
    if (publicKey && otherPubKey) {
      relayPool?.subscribe(`conversation${route.params.pubKey}`, [
        {
          kinds: [Kind.EncryptedDirectMessage],
          authors: [publicKey],
          '#p': [otherPubKey],
          since: lastCreateAt ?? 0,
        },
        {
          kinds: [Kind.EncryptedDirectMessage],
          authors: [otherPubKey],
          '#p': [publicKey],
          since: lastCreateAt ?? 0,
        },
      ])
    }
  }

  const send: () => void = () => {
    if (input !== '' && otherPubKey && publicKey && privateKey) {
      const event: Event = {
        content: input,
        created_at: getUnixTime(new Date()),
        kind: Kind.EncryptedDirectMessage,
        pubkey: publicKey,
        tags: usersToTags([otherUser]),
      }
      encrypt(privateKey, otherPubKey, input)
        .then((encryptedcontent) => {
          relayPool
            ?.sendEvent({
              ...event,
              content: encryptedcontent,
            })
            .catch(() => {
              setShowNotification('privateMessageSendError')
            })
        })
        .catch(() => {
          setShowNotification('privateMessageSendError')
        })

      const directMessage = event as DirectMessage
      directMessage.pending = true
      setSendingMessages((prev) => [...prev, directMessage])
      setInput('')
    }
  }

  const renderDirectMessageItem: ListRenderItem<DirectMessage> = ({ index, item }) => {
    if (!publicKey || !privateKey || !otherUser) return <></>

    const displayName =
      item.pubkey === publicKey ? usernamePubKey(name, publicKey) : username(otherUser)
    const showAvatar = directMessages[index - 1]?.pubkey !== item.pubkey

    return (
      <View style={styles.messageRow}>
        {publicKey !== item.pubkey && (
          <View style={styles.pictureSpaceLeft}>
            {showAvatar && (
              <TouchableRipple onPress={() => setDisplayUserDrawer(otherPubKey)}>
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
            <View style={styles.cardContentInfo}>
              <Text>{displayName}</Text>
              <View style={styles.cardContentDate}>
                {item.pending && (
                  <View style={styles.cardContentPending}>
                    <MaterialCommunityIcons
                      name='clock-outline'
                      size={14}
                      color={theme.colors.onPrimaryContainer}
                    />
                  </View>
                )}
                <Text>
                  {formatDistance(fromUnixTime(item.created_at), new Date(), { addSuffix: true })}
                </Text>
              </View>
            </View>
            <TextContent content={item.content} />
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
    )
  }

  const onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void = (event) => {
    if (handleInfinityScroll(event)) {
      setPageSize(pageSize + initialPageSize)
    }
  }

  return (
    <View style={styles.container}>
      <FlashList
        inverted
        data={[...sendingMessages, ...directMessages]}
        renderItem={renderDirectMessageItem}
        horizontal={false}
        ref={scrollViewRef}
        estimatedItemSize={100}
        onScroll={onScroll}
      />
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
          onFocus={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
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
        uploadingFile={uploadingFile}
        setUploadingFile={setUploadingFile}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  scrollView: {
    paddingBottom: 16,
  },
  messageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardContentDate: {
    flexDirection: 'row',
  },
  container: {
    padding: 16,
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
  },
  snackbar: {
    margin: 16,
    bottom: 70,
  },
})

export default ConversationPage
