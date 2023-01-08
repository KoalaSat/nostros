import React, { useContext, useEffect, useState } from 'react'
import {
  Card,
  Input,
  Layout,
  Modal,
  Text,
  useTheme,
  Button,
  Select,
  SelectItem,
} from '@ui-kitten/components'
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native'
import { AppContext } from '../../Contexts/AppContext'
import { RelayPoolContext } from '../../Contexts/RelayPoolContext'
import { EventKind } from '../../lib/nostr/Events'
import {
  DirectMessage,
  getGroupedDirectMessages,
} from '../../Functions/DatabaseFunctions/DirectMessages'
import { getUsers, User } from '../../Functions/DatabaseFunctions/Users'
import {
  generateConversationId,
  getOtherPubKey,
} from '../../Functions/RelayFunctions/DirectMessages'
import Avatar from '../../Components/Avatar'
import Icon from 'react-native-vector-icons/FontAwesome5'
import { useTranslation } from 'react-i18next'
import { username } from '../../Functions/RelayFunctions/Users'
import { getPublicKey } from '../../lib/nostr/Nip19'

export const DirectMessagesPage: React.FC = () => {
  const theme = useTheme()
  const { t } = useTranslation('common')
  const { database, goToPage } = useContext(AppContext)
  const { relayPool, publicKey, lastEventId, privateKey } = useContext(RelayPoolContext)
  const [sendMessage, showSendMessage] = useState<boolean>(false)
  const [contacts, setContacts] = useState<User[]>([])
  const [directMessages, settDirectMessages] = useState<DirectMessage[]>()
  const [sendPubKeyInput, setSendPubKeyInput] = useState<string>('')
  const [users, settUsers] = useState<User[]>()

  useEffect(() => {
    loadDirectMessages()
  }, [lastEventId])

  useEffect(() => {
    loadDirectMessages()
    subscribeDirectMessages()
  }, [])

  const loadDirectMessages: () => void = () => {
    if (database && publicKey) {
      getGroupedDirectMessages(database, {}).then((results) => {
        if (results && results.length > 0) {
          settDirectMessages(results)
          const otherUsers = results.map((message) => getOtherPubKey(message, publicKey))
          relayPool?.subscribe('main-channel', {
            kinds: [EventKind.meta],
            authors: otherUsers,
          })
          getUsers(database, { includeIds: otherUsers }).then(settUsers)
        }
      })
      getUsers(database, { contacts: true }).then(setContacts)
    }
  }

  const subscribeDirectMessages: () => void = async () => {
    relayPool?.unsubscribeAll()
    if (publicKey) {
      relayPool?.subscribe('main-channel', {
        kinds: [EventKind.directMessage],
        authors: [publicKey],
      })
      relayPool?.subscribe('main-channel', {
        kinds: [EventKind.directMessage],
        '#p': [publicKey],
      })
    }
  }

  const onPressOpenConversation: (sendPubKey: string) => void = (sendPubKey) => {
    if (sendPubKey !== '' && publicKey) {
      const contactPubKey = getPublicKey(sendPubKey)
      const conversationId = generateConversationId(publicKey, contactPubKey)
      const conversationPath = getConversationPath(conversationId, contactPubKey)
      goToPage(conversationPath)
    }
  }

  const getConversationPath: (conversationId: string, otherPubKey: string) => string = (
    conversationId,
    otherPubKey,
  ) => {
    return `conversation#${conversationId}#${otherPubKey}`
  }

  const userCard: (message: DirectMessage) => JSX.Element = (message) => {
    if (!publicKey || !privateKey) return <View key={message.id}></View>

    const otherPubKey = getOtherPubKey(message, publicKey)
    const user: User = users?.find((user) => user.id === otherPubKey) ?? { id: otherPubKey }

    return (
      <Card
        key={message.id}
        onPress={() => goToPage(getConversationPath(message.conversation_id, otherPubKey))}
      >
        <Layout style={styles.layout} level='2'>
          <Layout style={styles.profile}>
            <Avatar name={user.name} src={user.picture} pubKey={user.id} />
          </Layout>
          <Layout style={styles.content} level='2'>
            <Text category='h6'>{username(user)}</Text>
          </Layout>
          <Layout style={styles.layout}>
            {!message.read ? (
              <Icon name='envelope' size={16} color={theme['color-warning-500']} solid />
            ) : (
              <></>
            )}
          </Layout>
        </Layout>
      </Card>
    )
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    layout: {
      flex: 1,
      flexDirection: 'row',
      backgroundColor: 'transparent',
    },
    profile: {
      width: 38,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'transparent',
      marginRight: 15,
    },
    content: {
      flex: 6,
      backgroundColor: 'transparent',
      justifyContent: 'center',
    },
    actionContainer: {
      marginTop: 30,
      marginBottom: 30,
      paddingLeft: 12,
      paddingRight: 12,
    },
    select: {
      marginBottom: 30,
    },
    button: {
      marginTop: 30,
    },
    modal: {
      paddingLeft: 32,
      paddingRight: 32,
      width: '100%',
    },
    backdrop: {
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
  })

  return (
    <Layout style={styles.container}>
      <ScrollView horizontal={false}>{directMessages?.map(userCard)}</ScrollView>
      <Modal
        style={styles.modal}
        visible={sendMessage}
        backdropStyle={styles.backdrop}
        onBackdropPress={() => showSendMessage(false)}
      >
        <Card disabled={true}>
          <Layout style={styles.actionContainer}>
            <Layout style={styles.select}>
              <Select
                placeholder={t('direcMessagesPage.sendMessage.contacts')}
                onSelect={(index) => onPressOpenConversation(contacts[index.row].id)}
              >
                {contacts.map((user) => {
                  return <SelectItem title={username(user)} key={user.id} value={user.id} />
                })}
              </Select>
            </Layout>
            <Layout>
              <Input
                placeholder={t('direcMessagesPage.sendMessage.placeholder')}
                value={sendPubKeyInput}
                onChangeText={setSendPubKeyInput}
                size='large'
              />
            </Layout>
            <Layout style={styles.button}>
              <Button onPress={() => onPressOpenConversation(sendPubKeyInput)}>
                {t('direcMessagesPage.sendMessage.send')}
              </Button>
            </Layout>
          </Layout>
        </Card>
      </Modal>
      <TouchableOpacity
        style={{
          borderWidth: 1,
          borderColor: 'rgba(0,0,0,0.2)',
          alignItems: 'center',
          justifyContent: 'center',
          width: 65,
          position: 'absolute',
          bottom: 20,
          right: 20,
          height: 65,
          backgroundColor: theme['color-warning-500'],
          borderRadius: 100,
        }}
        onPress={() => showSendMessage(true)}
      >
        <Icon name='envelope' size={30} color={theme['text-basic-color']} solid />
      </TouchableOpacity>
    </Layout>
  )
}

export default DirectMessagesPage
