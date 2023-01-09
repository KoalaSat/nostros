import React, { useContext, useEffect, useRef, useState } from 'react'
import { Button, Input, Layout, Text, TopNavigation, useTheme } from '@ui-kitten/components'
import { ScrollView, StyleSheet, TouchableOpacity } from 'react-native'
import { AppContext } from '../../Contexts/AppContext'
import { RelayPoolContext } from '../../Contexts/RelayPoolContext'
import { EventKind, Event } from '../../lib/nostr/Events'
import {
  DirectMessage,
  getDirectMessages,
  updateConversationRead,
} from '../../Functions/DatabaseFunctions/DirectMessages'
import { getUser, User } from '../../Functions/DatabaseFunctions/Users'
import Avatar from '../../Components/Avatar'
import Icon from 'react-native-vector-icons/FontAwesome5'
import { useTranslation } from 'react-i18next'
import { showMessage } from 'react-native-flash-message'
import { username, usersToTags } from '../../Functions/RelayFunctions/Users'
import moment from 'moment'
import TextContent from '../../Components/TextContent'
import { encrypt, decrypt } from '../../lib/nostr/Nip04'

export const ConversationPage: React.FC = () => {
  const theme = useTheme()
  const scrollViewRef = useRef<ScrollView>()
  const { database, getActualPage, goBack, goToPage } = useContext(AppContext)
  const { relayPool, publicKey, lastEventId, privateKey } = useContext(RelayPoolContext)

  const conversationId = getActualPage().split('#')[1]
  const otherPubKey = getActualPage().split('#')[2]
  // State
  const [directMessages, setDirectMessages] = useState<DirectMessage[]>([])
  const [sendingMessages, setSendingMessages] = useState<DirectMessage[]>([])
  const [otherUser, setOtherUser] = useState<User>({ id: otherPubKey })
  const [user, setUser] = useState<User>()
  const [input, setInput] = useState<string>('')

  const { t } = useTranslation('common')

  useEffect(() => {
    loadDirectMessages()
  }, [lastEventId])

  useEffect(() => {
    loadDirectMessages()
    subscribeDirectMessages()
    if (database && publicKey) {
      getUser(publicKey, database).then((user) => {
        if (user) setUser(user)
      })
    }
  }, [])

  const loadDirectMessages: () => void = () => {
    if (database && publicKey) {
      getUser(otherPubKey, database).then((user) => {
        if (user) setOtherUser(user)
      })
      getDirectMessages(database, { conversationId, order: 'ASC' }).then((results) => {
        if (privateKey && results && results.length > 0) {
          setSendingMessages([])
          setDirectMessages(
            results.map((message) => {
              message.content = decrypt(privateKey, otherPubKey, message.content ?? '')
              return message
            }),
          )
          updateConversationRead(conversationId, database)
        }
      })
    }
  }

  const subscribeDirectMessages: () => void = async () => {
    relayPool?.unsubscribeAll()
    if (publicKey && otherPubKey) {
      relayPool?.subscribe('conversation', [
        {
          kinds: [EventKind.directMessage],
          authors: [publicKey],
          '#p': [otherPubKey],
        },
        {
          kinds: [EventKind.directMessage],
          authors: [otherPubKey],
          '#p': [publicKey],
        },
      ])
    }
  }

  const onPressOtherUser: () => void = () => {
    goToPage(`profile#${otherPubKey}`)
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
            .catch((err) => {
              showMessage({
                message: t('alerts.privateMessageSendError'),
                description: err.message,
                type: 'danger',
              })
            })
        })
        .catch((err) => {
          showMessage({
            message: t('alerts.privateMessageEncryptError'),
            description: err.message,
            type: 'danger',
          })
        })
    }
  }

  const userCard: (message: DirectMessage, index: number) => JSX.Element = (message, index) => {
    if (!publicKey || !privateKey || !otherUser || !user) return <></>

    return message.pubkey === otherPubKey ? (
      <Layout key={index} style={styles.card} level='3'>
        <Layout style={styles.layout} level='3'>
          <Layout style={styles.profile} level='3'>
            <TouchableOpacity onPress={onPressOtherUser}>
              <Avatar name={otherUser.name} src={otherUser.picture} pubKey={otherUser.id} />
            </TouchableOpacity>
          </Layout>
          <Layout style={styles.contentLeft} level='3'>
            <Layout style={styles.title} level='3'>
              <Text appearance='hint'>{username(otherUser)}</Text>
              <Text appearance='hint'>
                {moment.unix(message.created_at).format('HH:mm DD-MM-YY')}
              </Text>
            </Layout>
            <TextContent event={message} />
          </Layout>
        </Layout>
      </Layout>
    ) : (
      <Layout key={index} style={styles.card} level='2'>
        <Layout style={styles.contentRight} level='2'>
          <Layout style={styles.title} level='2'>
            <Text appearance='hint'>
              {moment.unix(message.created_at).format('HH:mm DD-MM-YY')}
            </Text>
            <Layout style={styles.username} level='2'>
              <Text appearance='hint'>{username(user)}</Text>
              {message.id ? (
                <></>
              ) : (
                <Icon name='clock' size={12} color={theme['text-basic-color']} />
              )}
            </Layout>
          </Layout>
          <TextContent event={message} />
        </Layout>
      </Layout>
    )
  }

  const onPressBack: () => void = () => {
    relayPool?.unsubscribeAll()
    goBack()
  }

  const renderBackAction = (): JSX.Element => {
    return (
      <Button
        accessoryRight={<Icon name='arrow-left' size={16} color={theme['text-basic-color']} />}
        onPress={onPressBack}
        appearance='ghost'
      />
    )
  }

  const styles = StyleSheet.create({
    card: {
      flex: 1,
      padding: 20,
    },
    container: {
      flex: 1,
      paddingBottom: 85,
    },
    layout: {
      flex: 1,
      flexDirection: 'row',
    },
    username: {
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'flex-end',
    },
    profile: {
      flex: 1,
      width: 38,
      alignItems: 'center',
      backgroundColor: 'transparent',
    },
    contentLeft: {
      flex: 4,
    },
    contentRight: {
      flex: 4,
      alignItems: 'flex-end',
    },
    form: {
      flex: 1,
      padding: 15,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'absolute',
      bottom: 0,
      width: '100%',
      flexDirection: 'row',
    },
    input: {
      flex: 5,
    },
    sendButton: {
      flex: 1,
      paddingLeft: 15,
    },
    title: {
      flexDirection: 'row',
      width: '100%',
      justifyContent: 'space-between',
    },
  })

  return (
    <>
      <TopNavigation
        alignment='center'
        title={
          <TouchableOpacity onPress={onPressOtherUser}>
            <Text>{username(otherUser)}</Text>
          </TouchableOpacity>
        }
        accessoryLeft={renderBackAction}
      />
      <Layout style={styles.container}>
        <ScrollView
          ref={scrollViewRef}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          horizontal={false}
        >
          {[...directMessages, ...sendingMessages].map((msg, index) => userCard(msg, index))}
        </ScrollView>
      </Layout>
      <Layout style={styles.form}>
        <Layout style={styles.input}>
          <Input
            multiline={true}
            value={input}
            onChangeText={setInput}
            size='large'
            keyboardType='twitter'
            onPressOut={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          />
        </Layout>
        <Layout style={styles.sendButton}>
          <Button onPress={send}>
            <Icon name={'paper-plane'} size={22} color={theme['text-basic-color']} solid />
          </Button>
        </Layout>
      </Layout>
    </>
  )
}

export default ConversationPage
