import React, { useContext, useEffect, useState } from 'react'
import {
  Clipboard,
  Dimensions,
  FlatList,
  ListRenderItem,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native'
import { AppContext } from '../../Contexts/AppContext'
import { RelayPoolContext } from '../../Contexts/RelayPoolContext'
import { EventKind } from '../../lib/nostr/Events'
import {
  DirectMessage,
  getGroupedDirectMessages,
} from '../../Functions/DatabaseFunctions/DirectMessages'
import { getUsers, User } from '../../Functions/DatabaseFunctions/Users'
import { getOtherPubKey } from '../../Functions/RelayFunctions/DirectMessages'
import { NostrosAvatar } from '../../Components/NostrosAvatar'
import { formatPubKey, username } from '../../Functions/RelayFunctions/Users'
import {
  AnimatedFAB,
  Badge,
  Button,
  Divider,
  List,
  Text,
  TextInput,
  TouchableRipple,
  useTheme,
} from 'react-native-paper'
import { UserContext } from '../../Contexts/UserContext'
import { navigate } from '../../lib/Navigation'
import moment from 'moment'
import RBSheet from 'react-native-raw-bottom-sheet'
import { useTranslation } from 'react-i18next'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'

export const ConversationsFeed: React.FC = () => {
  const theme = useTheme()
  const { t } = useTranslation('common')
  const { database } = useContext(AppContext)
  const { publicKey, privateKey } = useContext(UserContext)
  const { relayPool, lastEventId } = useContext(RelayPoolContext)
  const [directMessages, settDirectMessages] = useState<DirectMessage[]>([])
  const [sendPubKeyInput, setSendPubKeyInput] = useState<string>('')
  const [users, setUsers] = useState<User[]>()
  const bottomSheetCreateRef = React.useRef<RBSheet>(null)
  const bottomSheetUserListRef = React.useRef<RBSheet>(null)
  const bottomSheetPubKeyRef = React.useRef<RBSheet>(null)

  useEffect(() => {
    subscribeDirectMessages()
  }, [])

  useEffect(() => {
    loadDirectMessages()
  }, [lastEventId])

  const loadDirectMessages: () => void = () => {
    if (database && publicKey) {
      getUsers(database, { contacts: true }).then(setUsers)
      getGroupedDirectMessages(database, {}).then((results) => {
        if (results && results.length > 0) {
          settDirectMessages(results)
          const otherUsers = results.map((message) => getOtherPubKey(message, publicKey))
          relayPool?.subscribe('directmessages-meta', [
            {
              kinds: [EventKind.meta],
              authors: otherUsers,
            },
          ])
        }
      })
    }
  }

  const subscribeDirectMessages: () => void = async () => {
    if (publicKey) {
      relayPool?.subscribe('directmessages-user', [
        {
          kinds: [EventKind.directMessage],
          authors: [publicKey],
        },
        {
          kinds: [EventKind.directMessage],
          '#p': [publicKey],
        },
      ])
    }
  }

  const renderConversationItem: ListRenderItem<DirectMessage> = ({ index, item }) => {
    if (!publicKey || !privateKey) return <></>

    const otherPubKey = getOtherPubKey(item, publicKey)
    const user: User = users?.find((user) => user.id === otherPubKey) ?? { id: otherPubKey }

    return (
      <TouchableRipple
        onPress={() =>
          navigate('Conversation', { pubKey: user.id, conversationId: item.conversation_id })
        }
      >
        <View key={user.id} style={styles.contactRow}>
          <View style={styles.contactUser}>
            <NostrosAvatar
              name={user.name}
              pubKey={user.id}
              src={user.picture}
              lud06={user.lnurl}
              size={40}
            />
            <View style={styles.contactName}>
              <Text variant='titleSmall'>{username(user)}</Text>
            </View>
          </View>
          <View style={styles.contactInfo}>
            <View style={styles.contactName}>
              <Text>{moment.unix(item.created_at).format('HH:mm DD-MM-YY')}</Text>
              {item.pubkey !== publicKey && !item.read && <Badge size={16}></Badge>}
            </View>
          </View>
        </View>
      </TouchableRipple>
    )
  }

  const pastePubKey: () => void = () => {
    Clipboard.getString().then((value) => {
      setSendPubKeyInput(value ?? '')
    })
  }

  const bottomSheetStyles = React.useMemo(() => {
    return {
      container: {
        backgroundColor: theme.colors.background,
        padding: 16,
        borderTopRightRadius: 28,
        borderTopLeftRadius: 28,
      },
      draggableIcon: {
        backgroundColor: '#000',
      },
    }
  }, [])

  const createOptions = React.useMemo(() => {
    return [
      {
        key: 1,
        title: t('conversationsFeed.newMessageContact'),
        left: () => (
          <List.Icon
            icon={() => <MaterialCommunityIcons name='account-multiple-plus-outline' size={25} />}
          />
        ),
        onPress: async () => bottomSheetUserListRef.current?.open(),
        disabled: users?.length === 0,
      },
      {
        key: 2,
        title: t('conversationsFeed.addPubKey'),
        left: () => (
          <List.Icon
            icon={() => <MaterialCommunityIcons name='account-multiple-plus-outline' size={25} />}
          />
        ),
        onPress: async () => bottomSheetPubKeyRef.current?.open(),
        disabled: false,
      },
    ]
  }, [])

  const renderUserItem: ListRenderItem<User> = ({ index, item }) => (
    <TouchableRipple
      onPress={() => {
        bottomSheetUserListRef.current?.close()
        bottomSheetPubKeyRef.current?.close()
        navigate('Conversation', { pubKey: item.id })
      }}
    >
      <View key={item.id} style={styles.contactRow}>
        <View style={styles.contactUser}>
          <NostrosAvatar
            name={item.name}
            pubKey={item.id}
            src={item.picture}
            lud06={item.lnurl}
            size={40}
          />
          <View style={styles.contactName}>
            <Text variant='titleSmall'>{formatPubKey(item.id)}</Text>
            {item.name && <Text variant='titleSmall'>{username(item)}</Text>}
          </View>
        </View>
      </View>
    </TouchableRipple>
  )

  return (
    <View style={styles.container}>
      {directMessages.length > 0 ? (
        <ScrollView horizontal={false}>
          <FlatList
            data={directMessages}
            renderItem={renderConversationItem}
            ItemSeparatorComponent={Divider}
          />
        </ScrollView>
      ) : (
        <View style={styles.blank}>
          <MaterialCommunityIcons name='message-outline' size={64} style={styles.center} />
          <Text variant='headlineSmall' style={styles.center}>
            {t('conversationsFeed.emptyTitle')}
          </Text>
          <Text variant='bodyMedium' style={styles.center}>
            {t('conversationsFeed.emptyDescription')}
          </Text>
          <Button mode='contained' compact onPress={() => bottomSheetCreateRef.current?.open()}>
            {t('conversationsFeed.emptyButton')}
          </Button>
        </View>
      )}
      <AnimatedFAB
        style={[styles.fab, { top: Dimensions.get('window').height - 220 }]}
        icon='pencil-outline'
        label='Label'
        onPress={() => bottomSheetCreateRef.current?.open()}
        animateFrom='right'
        iconMode='static'
        extended={false}
      />
      <RBSheet
        ref={bottomSheetCreateRef}
        closeOnDragDown={true}
        height={190}
        customStyles={bottomSheetStyles}
      >
        <ScrollView horizontal={false}>
          <FlatList
            data={createOptions}
            renderItem={({ item }) => {
              return (
                <List.Item
                  key={item.key}
                  title={item.title}
                  onPress={item.onPress}
                  left={item.left}
                  disabled={item.disabled}
                />
              )
            }}
            ItemSeparatorComponent={Divider}
          />
        </ScrollView>
      </RBSheet>
      <RBSheet
        ref={bottomSheetUserListRef}
        closeOnDragDown={true}
        height={620}
        customStyles={bottomSheetStyles}
      >
        <ScrollView horizontal={false}>
          <FlatList data={users} renderItem={renderUserItem} ItemSeparatorComponent={Divider} />
        </ScrollView>
      </RBSheet>
      <RBSheet
        ref={bottomSheetPubKeyRef}
        closeOnDragDown={true}
        height={220}
        customStyles={bottomSheetStyles}
      >
        <View>
          <Text variant='titleLarge'>{t('conversationsFeed.openMessageTitle')}</Text>
          <Text variant='bodyMedium'>{t('conversationsFeed.openMessageDescription')}</Text>
          <TextInput
            mode='outlined'
            label={t('conversationsFeed.openMessageLabel') ?? ''}
            onChangeText={setSendPubKeyInput}
            value={sendPubKeyInput}
            right={
              <TextInput.Icon
                icon='content-paste'
                onPress={pastePubKey}
                forceTextInputFocus={false}
              />
            }
          />
          <Button
            mode='contained'
            disabled={!sendPubKeyInput || sendPubKeyInput === ''}
            onPress={() => {
              navigate('Conversation', { pubKey: sendPubKeyInput })
              bottomSheetPubKeyRef.current?.close()
            }}
          >
            {t('conversationsFeed.openMessage')}
          </Button>
        </View>
      </RBSheet>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  contactRow: {
    paddingLeft: 16,
    paddingRight: 16,
    paddingTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  contactName: {
    paddingLeft: 16,
  },
  contactUser: {
    flexDirection: 'row',
    alignContent: 'center',
  },
  contactInfo: {
    alignContent: 'center',
    justifyContent: 'space-between',
  },
  contactFollow: {
    justifyContent: 'center',
  },
  fab: {
    right: 16,
    position: 'absolute',
  },
  center: {
    alignContent: 'center',
    textAlign: 'center',
  },
  blank: {
    justifyContent: 'space-between',
    height: 200,
    marginTop: 60,
  },
})

export default ConversationsFeed
