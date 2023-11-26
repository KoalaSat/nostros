import React, { useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Clipboard,
  Dimensions,
  FlatList,
  type ListRenderItem,
  StyleSheet,
  View,
} from 'react-native'
import {
  AnimatedFAB,
  Button,
  Divider,
  List,
  Text,
  TextInput,
  TouchableRipple,
  useTheme,
} from 'react-native-paper'
import RBSheet from 'react-native-raw-bottom-sheet'
import { navigate } from '../../lib/Navigation'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import { type User, getUsers } from '../../Functions/DatabaseFunctions/Users'
import { AppContext } from '../../Contexts/AppContext'
import { UserContext } from '../../Contexts/UserContext'
import ProfileData from '../../Components/ProfileData'
import { getNip19Key, getNpub } from '../../lib/nostr/Nip19'

interface SplitZapPageProps {
  route: { params: { splits?: string[] } }
}

export const SplitZapPage: React.FC<SplitZapPageProps> = ({
  route: {
    params: { splits },
  },
}) => {
  const theme = useTheme()
  const { t } = useTranslation('common')
  const { database } = useContext(AppContext)
  const { publicKey } = useContext(UserContext)
  const [splitZaps, setSplitZaps] = useState<string[]>(splits ?? [])
  const [numberSplits, setNumberSplits] = useState<number>(splits?.length ?? 0)
  const [sendPubKeyInput, setSendPubKeyInput] = useState<string>('')
  const [users, setUsers] = useState<User[]>()
  const bottomSheetCreateRef = React.useRef<RBSheet>(null)
  const bottomSheetUserListRef = React.useRef<RBSheet>(null)
  const bottomSheetPubKeyRef = React.useRef<RBSheet>(null)

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers: () => void = () => {
    if (database && publicKey) {
      getUsers(database, {}).then(setUsers)
    }
  }

  const pastePubKey: () => void = () => {
    Clipboard.getString().then((value) => {
      setSendPubKeyInput(value ?? '')
    })
  }

  const createOptions = React.useMemo(() => {
    return [
      {
        key: 1,
        title: t('splitZaps.addContact'),
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
        title: t('splitZaps.addPubKey'),
        left: () => (
          <List.Icon
            icon={() => (
              <MaterialCommunityIcons
                name='plus'
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
        setSplitZaps((prev) => {
          if (!prev.includes(item.id)) prev.push(item.id)
          return prev
        })
        setNumberSplits((count) => count + 1)
        bottomSheetUserListRef.current?.close()
        bottomSheetCreateRef.current?.close()
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

  const renderZappedItem: ListRenderItem<string> = ({ item }) => {
    let user: User | null = null

    if (users) {
      user = users.find((u) => u.id === item) ?? null
    }

    return (
      <View key={item} style={styles.zappedRow}>
        <View style={styles.zappedData}>
          <ProfileData
            username={user?.name}
            publicKey={getNpub(user?.id ?? item)}
            validNip05={user?.valid_nip05}
            nip05={user?.nip05}
            lnurl={user?.lnurl}
            lnAddress={user?.ln_address}
            picture={user?.picture}
          />
        </View>
        <View style={styles.zappedActions}>
          <Button
            onPress={() => {
              setSplitZaps((prev) => {
                return prev.filter((e) => e !== item)
              })
              setNumberSplits((count) => (count > 0 ? count - 1 : 0))
            }}
          >
            {t('splitZaps.remove')}
          </Button>
        </View>
      </View>
    )
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

  return (
    <View style={styles.main}>
      <View>{numberSplits > 0 && <FlatList data={splitZaps} renderItem={renderZappedItem} />}</View>
      <View>
        <Button
          mode='contained'
          style={styles.spacer}
          onPress={() => navigate('Send', { splits: splitZaps })}
        >
          {t('splitZaps.accept')}
        </Button>
      </View>
      <AnimatedFAB
        style={[styles.fab, { top: Dimensions.get('window').height - 152 }]}
        icon='plus'
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
          data={users?.filter(u => u.contact)}
          renderItem={renderUserItem}
          ItemSeparatorComponent={Divider}
          horizontal={false}
        />
      </RBSheet>
      <RBSheet ref={bottomSheetPubKeyRef} closeOnDragDown={true} customStyles={bottomSheetStyles}>
        <View>
          <Text variant='titleLarge'>{t('splitZaps.zapPubkeyTitle')}</Text>
          <Text variant='bodyMedium'>{t('splitZaps.zapPubkeyDescription')}</Text>
          <TextInput
            style={styles.input}
            mode='outlined'
            label={t('splitZaps.zapPubkeyLabel') ?? ''}
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
              const key = getNip19Key(sendPubKeyInput) ?? sendPubKeyInput
              if (key) {
                setSplitZaps((prev) => {
                  if (!prev.includes(key)) prev.push(key)
                  return prev
                })
                setNumberSplits((count) => count + 1)
              }
              bottomSheetPubKeyRef.current?.close()
              bottomSheetCreateRef.current?.close()
            }}
          >
            {t('splitZaps.openMessage')}
          </Button>
        </View>
      </RBSheet>
    </View>
  )
}

const styles = StyleSheet.create({
  main: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  spacer: {
    marginBottom: 16,
  },
  contactRow: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  fab: {
    right: 16,
    position: 'absolute',
  },
  zappedRow: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  zappedAmount: {
    flexDirection: 'row',
  },
  zappedData: {
    flex: 1,
  },
  input: {
    marginTop: 16,
    marginBottom: 16,
  },
  center: {
    alignContent: 'center',
    textAlign: 'center',
  },
  list: {
    paddingBottom: 64,
  },
  zappedActions: {
    flexDirection: 'row',
    alignContent: 'center',
  },
})

export default SplitZapPage
