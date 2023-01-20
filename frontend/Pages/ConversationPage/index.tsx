import React, { useContext, useEffect, useMemo, useRef, useState } from 'react'
import { FlatList, ScrollView, StyleSheet, View } from 'react-native'
import { AppContext } from '../../Contexts/AppContext'
import { RelayPoolContext } from '../../Contexts/RelayPoolContext'
import { EventKind, Event } from '../../lib/nostr/Events'
import {
  DirectMessage,
  getDirectMessages,
  updateConversationRead,
} from '../../Functions/DatabaseFunctions/DirectMessages'
import { getUser, User } from '../../Functions/DatabaseFunctions/Users'
import { useTranslation } from 'react-i18next'
import { username, usersToTags } from '../../Functions/RelayFunctions/Users'
import moment from 'moment'
import TextContent from '../../Components/TextContent'
import { encrypt, decrypt } from '../../lib/nostr/Nip04'
import {
  Avatar,
  Card,
  useTheme,
  TextInput,
  Snackbar,
  TouchableRipple,
  Text,
} from 'react-native-paper'
import { UserContext } from '../../Contexts/UserContext'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import { navigate } from '../../lib/Navigation'
import { useFocusEffect } from '@react-navigation/native'

interface ConversationPageProps {
  route: { params: { pubKey: string; conversationId: string } }
}

export const ConversationPage: React.FC<ConversationPageProps> = ({ route }) => {
  const theme = useTheme()
  const scrollViewRef = useRef<ScrollView>()
  const { database } = useContext(AppContext)
  const { relayPool, lastEventId } = useContext(RelayPoolContext)
  const { publicKey, privateKey, user } = useContext(UserContext)
  const otherPubKey = useMemo(() => route.params.pubKey, [])
  const [directMessages, setDirectMessages] = useState<DirectMessage[]>([])
  const [sendingMessages, setSendingMessages] = useState<DirectMessage[]>([])
  const [otherUser, setOtherUser] = useState<User>({ id: otherPubKey })
  const [input, setInput] = useState<string>('')
  const [showNotification, setShowNotification] = useState<string>()

  const { t } = useTranslation('common')

  useFocusEffect(
    React.useCallback(() => {
      console.log('OPEN')
      loadDirectMessages(true)

      return () => relayPool?.unsubscribe([`conversation${route.params.pubKey}`])
    }, []),
  )

  useEffect(() => {
    loadDirectMessages(false)
  }, [lastEventId])

  const loadDirectMessages: (subscribe: boolean) => void = (subscribe) => {
    if (database && publicKey) {
      const conversationId = route.params?.conversationId
      getUser(otherPubKey, database).then((user) => {
        if (user) setOtherUser(user)
      })
      getDirectMessages(database, conversationId, publicKey, otherPubKey, { order: 'ASC' }).then(
        (results) => {
          if (privateKey && results && results.length > 0) {
            setSendingMessages([])
            setDirectMessages(
              results.map((message) => {
                message.content = decrypt(privateKey, otherPubKey, message.content ?? '')
                return message
              }),
            )
            if (results.length > 0) {
              updateConversationRead(results[0].conversation_id, database)
            }
            if (subscribe) {
              subscribeDirectMessages(results[0].created_at)
            }
          } else if (subscribe) {
            subscribeDirectMessages()
          }
        },
      )
    }
  }

  const subscribeDirectMessages: (lastCreateAt?: number) => void = async (lastCreateAt) => {
    if (publicKey && otherPubKey) {
      relayPool?.subscribe(`conversation${route.params.pubKey}`, [
        {
          kinds: [EventKind.directMessage],
          authors: [publicKey],
          '#p': [otherPubKey],
          since: lastCreateAt ?? 0,
        },
        {
          kinds: [EventKind.directMessage],
          authors: [otherPubKey],
          '#p': [publicKey],
          since: lastCreateAt ?? 0,
        },
      ])
    }
  }

  const onPressOtherUser: () => void = () => {
    navigate('Profile', { pubKey: otherPubKey })
  }

  const send: () => void = () => {
    if (input !== '' && otherPubKey && publicKey && privateKey) {
      const event: Event = {
        content: input,
        created_at: moment().unix(),
        kind: EventKind.directMessage,
        pubkey: publicKey,
        tags: usersToTags([otherUser]),
      }
      setSendingMessages((prev) => [...prev, event as DirectMessage])
      setInput('')

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
    }
  }

  const renderDirectMessageItem: (
    index: number,
    item: DirectMessage,
    pending: boolean,
  ) => JSX.Element = (index, item, pending) => {
    if (!publicKey || !privateKey || !otherUser || !user) return <></>

    const displayName = item.pubkey === publicKey ? username(user) : username(otherUser)
    const lastIndex = directMessages.length - 1 === index
    const nextItemHasdifferentPubKey =
      !lastIndex && directMessages[index + 1]?.pubkey !== item.pubkey

    return (
      <View style={styles.messageRow}>
        <View style={styles.pictureSpace}>
          {publicKey !== item.pubkey && (lastIndex || nextItemHasdifferentPubKey) && (
            <TouchableRipple onPress={onPressOtherUser}>
              <Avatar.Text size={40} label={username(otherUser).substring(0, 2).toUpperCase()} />
            </TouchableRipple>
          )}
        </View>
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
                {pending && (
                  <View style={styles.cardContentPending}>
                    <MaterialCommunityIcons name='clock-outline' size={14} />
                  </View>
                )}
                <Text>{moment.unix(item.created_at).format('L HH:mm')}</Text>
              </View>
            </View>
            <TextContent content={item.content} />
          </Card.Content>
        </Card>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal={false}
        ref={scrollViewRef}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        <FlatList
          data={directMessages}
          renderItem={({ index, item }) => renderDirectMessageItem(index, item, false)}
        />
        <FlatList
          data={sendingMessages}
          renderItem={({ index, item }) => renderDirectMessageItem(index, item, true)}
        />
      </ScrollView>
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
          label={t('conversationPage.typeMessage') ?? ''}
          value={input}
          onChangeText={setInput}
          onFocus={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          right={
            <TextInput.Icon
              icon={() => <MaterialCommunityIcons name='send-outline' size={25} />}
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
    </View>
  )
}

const styles = StyleSheet.create({
  scrollView: {
    paddingBottom: 16,
  },
  messageRow: {
    flexDirection: 'row',
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
  pictureSpace: {
    justifyContent: 'flex-end',
    flex: 1,
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
