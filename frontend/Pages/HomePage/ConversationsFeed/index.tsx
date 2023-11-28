import React, { useContext, useEffect, useState } from 'react'
import {
  Dimensions,
  FlatList,
  type ListRenderItem,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  StyleSheet,
  View,
} from 'react-native'
import Clipboard from '@react-native-clipboard/clipboard'
import { AppContext } from '../../../Contexts/AppContext'
import { RelayPoolContext } from '../../../Contexts/RelayPoolContext'
import { Kind } from 'nostr-tools'
import {
  type DirectMessage,
  getGroupedDirectMessages,
  getUserLastDirectMessages,
} from '../../../Functions/DatabaseFunctions/DirectMessages'
import { getUsers, type User } from '../../../Functions/DatabaseFunctions/Users'
import { getOtherPubKey } from '../../../Functions/RelayFunctions/DirectMessages'
import { username } from '../../../Functions/RelayFunctions/Users'
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
import { UserContext } from '../../../Contexts/UserContext'
import { navigate } from '../../../lib/Navigation'
import RBSheet from 'react-native-raw-bottom-sheet'
import { useTranslation } from 'react-i18next'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import { useFocusEffect } from '@react-navigation/native'
import ProfileData from '../../../Components/ProfileData'
import { formatHour, handleInfinityScroll } from '../../../Functions/NativeFunctions'

export const ConversationsFeed: React.FC = () => {
  const initialPageSize = 14
  const theme = useTheme()
  const { t } = useTranslation('common')
  const { database, refreshBottomBarAt, qrReader, setQrReader, online } = useContext(AppContext)
  const [pageSize, setPageSize] = useState<number>(initialPageSize)
  const { publicKey, privateKey } = useContext(UserContext)
  const { relayPool, lastEventId, setNewDirectMessages, newDirectMessages } = useContext(RelayPoolContext)
  const [directMessages, settDirectMessages] = useState<DirectMessage[]>([])
  const [sendPubKeyInput, setSendPubKeyInput] = useState<string>('')
  const [users, setUsers] = useState<User[]>()
  const bottomSheetCreateRef = React.useRef<RBSheet>(null)
  const bottomSheetUserListRef = React.useRef<RBSheet>(null)
  const bottomSheetPubKeyRef = React.useRef<RBSheet>(null)

  useFocusEffect(
    React.useCallback(() => {
      loadDirectMessages(true)

      return () =>
        relayPool?.unsubscribe([
          `directmessages-meta${publicKey?.substring(0, 8)}`,
          `directmessages-user${publicKey?.substring(0, 8)}`,
          `directmessages-others${publicKey?.substring(0, 8)}`,
        ])
    }, []),
  )

  useEffect(() => {
    setNewDirectMessages(0)
    loadDirectMessages(false)
  }, [lastEventId, refreshBottomBarAt, newDirectMessages, online])

  useEffect(() => {
    if (qrReader) {
      setQrReader(undefined)
      navigate('Conversation', { pubKey: qrReader, title: qrReader })
    }
  }, [qrReader])

  const loadDirectMessages: (subscribe: boolean) => void = (subscribe) => {
    if (database && publicKey) {
      getGroupedDirectMessages(database, { limit: pageSize }).then((results) => {
        if (results && results.length > 0) {
          settDirectMessages(results)
          const otherUsers = results.map((message) => getOtherPubKey(message, publicKey))
          getUsers(database, { includeIds: otherUsers }).then(setUsers)
          relayPool?.subscribe(`directmessages-meta${publicKey?.substring(0, 8)}`, [
            {
              kinds: [Kind.Metadata],
              authors: otherUsers,
            },
          ])
          if (subscribe) {
            subscribeDirectMessages(results[0].created_at)
          }
        } else if (subscribe) {
          subscribeDirectMessages()
        }
      })
    }
  }

  const subscribeDirectMessages: (lastCreateAt?: number) => void = async (lastCreateAt) => {
    if (publicKey && database) {
      getUserLastDirectMessages(database, publicKey).then((result) => {
        relayPool?.subscribe(`directmessages-user${publicKey?.substring(0, 8)}`, [
          {
            kinds: [Kind.EncryptedDirectMessage],
            authors: [publicKey],
          },
        ])
        relayPool?.subscribe(`directmessages-others${publicKey?.substring(0, 8)}`, [
          {
            kinds: [Kind.EncryptedDirectMessage],
            '#p': [publicKey],
          },
        ])
      })
    }
  }

  const renderConversationItem: ListRenderItem<DirectMessage> = ({ index, item }) => {
    if (!publicKey || !privateKey) return <></>

    const otherPubKey = getOtherPubKey(item, publicKey)
    const user: User = users?.find((user) => user.id === otherPubKey) ?? { id: otherPubKey }
    const userMame = username(user)

    return (
      <TouchableRipple
        onPress={() =>
          navigate('Conversation', {
            pubKey: user.id,
            conversationId: item.conversation_id,
            title: userMame,
          })
        }
      >
        <View key={user.id} style={styles.contactRow}>
          <View style={styles.profileData}>
            <ProfileData
              username={user?.name}
              publicKey={user.id}
              validNip05={user?.valid_nip05}
              nip05={user?.nip05}
              lnurl={user?.lnurl}
              lnAddress={user?.ln_address}
              picture={user?.picture}
            />
          </View>
          <View style={styles.contactInfo}>
            <View style={styles.contactDate}>
              <Text>{formatHour(item?.created_at)}</Text>
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
        paddingTop: 16,
        paddingRight: 16,
        paddingBottom: 32,
        paddingLeft: 16,
        borderTopRightRadius: 28,
        borderTopLeftRadius: 28,
        height: 'auto',
      },
    }
  }, [])

  const onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void = (event) => {
    if (handleInfinityScroll(event)) {
      setPageSize(pageSize + initialPageSize)
    }
  }

  const createOptions = React.useMemo(() => {
    return [
      {
        key: 1,
        title: t('conversationsFeed.newMessageContact'),
        left: () => (
          <List.Icon
            icon={() => (
              <MaterialCommunityIcons
                name='account-multiple-plus-outline'
                size={25}
                color={theme.colors.onPrimaryContainer}
              />
            )}
          />
        ),
        onPress: async () => bottomSheetUserListRef.current?.open(),
        disabled: users?.length === 0,
        style: users?.length === 0 ? { color: theme.colors.outline } : {},
      },
      {
        key: 2,
        title: t('conversationsFeed.addPubKey'),
        left: () => (
          <List.Icon
            icon={() => (
              <MaterialCommunityIcons
                name='account-multiple-plus-outline'
                size={25}
                color={theme.colors.onPrimaryContainer}
              />
            )}
          />
        ),
        onPress: async () => bottomSheetPubKeyRef.current?.open(),
        disabled: false,
        style: {},
      },
    ]
  }, [])

  const renderUserItem: ListRenderItem<User> = ({ index, item }) => (
    <TouchableRipple
      onPress={() => {
        bottomSheetUserListRef.current?.close()
        bottomSheetPubKeyRef.current?.close()
        navigate('Conversation', { pubKey: item.id, title: username(item) })
      }}
    >
      <View key={item.id} style={styles.contactRow}>
        <ProfileData
          username={item?.name}
          publicKey={item.id}
          validNip05={item?.valid_nip05}
          nip05={item?.nip05}
          lnurl={item?.lnurl}
          lnAddress={item?.ln_address}
          picture={item?.picture}
        />
      </View>
    </TouchableRipple>
  )

  return (
    <View style={styles.container}>
      {directMessages.length > 0 ? (
        <FlatList
          style={styles.list}
          data={directMessages}
          renderItem={renderConversationItem}
          ItemSeparatorComponent={Divider}
          horizontal={false}
          onScroll={onScroll}
        />
      ) : (
        <View style={styles.blank}>
          <MaterialCommunityIcons
            name='message-outline'
            size={64}
            style={styles.center}
            color={theme.colors.onPrimaryContainer}
          />
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
        style={[styles.fab, { top: Dimensions.get('window').height - 191 }]}
        icon='pencil-outline'
        label='Label'
        onPress={() => bottomSheetCreateRef.current?.open()}
        animateFrom='right'
        iconMode='static'
        extended={false}
      />
      <RBSheet ref={bottomSheetCreateRef} closeOnDragDown={true} customStyles={bottomSheetStyles}>
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
                titleStyle={item.style}
              />
            )
          }}
          ItemSeparatorComponent={Divider}
          horizontal={false}
        />
      </RBSheet>
      <RBSheet ref={bottomSheetUserListRef} closeOnDragDown={true} customStyles={bottomSheetStyles}>
        <FlatList
          data={users}
          renderItem={renderUserItem}
          ItemSeparatorComponent={Divider}
          horizontal={false}
        />
      </RBSheet>
      <RBSheet ref={bottomSheetPubKeyRef} closeOnDragDown={true} customStyles={bottomSheetStyles}>
        <View>
          <Text variant='titleLarge'>{t('conversationsFeed.openMessageTitle')}</Text>
          <Text variant='bodyMedium'>{t('conversationsFeed.openMessageDescription')}</Text>
          <TextInput
            style={styles.input}
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
            // left={
            //   <TextInput.Icon
            //     icon='qrcode'
            //     onPress={() => {
            //       bottomSheetCreateRef.current?.close()
            //       bottomSheetPubKeyRef.current?.close()
            //       navigate('QrReader')
            //     }}
            //     forceTextInputFocus={false}
            //   />
            // }
          />
          <Button
            mode='contained'
            disabled={!sendPubKeyInput || sendPubKeyInput === ''}
            onPress={() => {
              navigate('Conversation', { pubKey: sendPubKeyInput, title: sendPubKeyInput })
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
  },
  profileData: {
    flex: 1,
  },
  contactRow: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  contactDate: {
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
  input: {
    marginTop: 16,
    marginBottom: 16,
  },
  center: {
    alignContent: 'center',
    textAlign: 'center',
  },
  blank: {
    justifyContent: 'space-between',
    height: 220,
    marginTop: 139,
    paddingLeft: 16,
    paddingRight: 16,
  },
  list: {
    paddingBottom: 64,
  },
})

export default ConversationsFeed
