import React, { useContext, useEffect, useState } from 'react'
import { type NativeScrollEvent, type NativeSyntheticEvent, StyleSheet, View } from 'react-native'
import Clipboard from '@react-native-clipboard/clipboard'
import { AppContext } from '../../Contexts/AppContext'
import { Kind } from 'nostr-tools'
import { useTranslation } from 'react-i18next'
import { FlashList, type ListRenderItem } from '@shopify/flash-list'
import {
  getBlocked,
  getFollowersAndFollowing,
  type User,
  getUsers,
} from '../../Functions/DatabaseFunctions/Users'
import { RelayPoolContext } from '../../Contexts/RelayPoolContext'
import { populatePets } from '../../Functions/RelayFunctions/Users'
import { getNip19Key, getNpub } from '../../lib/nostr/Nip19'
import { UserContext } from '../../Contexts/UserContext'
import {
  AnimatedFAB,
  Button,
  Divider,
  Snackbar,
  Text,
  TextInput,
  TouchableRipple,
  useTheme,
} from 'react-native-paper'
import RBSheet from 'react-native-raw-bottom-sheet'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import { useFocusEffect } from '@react-navigation/native'
import ProfileData from '../../Components/ProfileData'
import { handleInfinityScroll } from '../../Functions/NativeFunctions'
import { queryProfile } from 'nostr-tools/nip05'
import { navigate } from '../../lib/Navigation'
import DatabaseModule from '../../lib/Native/DatabaseModule'
import { removeMutedUsersList } from '../../Functions/RelayFunctions/Lists'

export const ContactsPage: React.FC = () => {
  const { t } = useTranslation('common')
  const initialPageSize = 20
  const { database, setDisplayUserDrawer, qrReader, setQrReader } = useContext(AppContext)
  const { privateKey, publicKey, nPub, mutedUsers, reloadLists } = React.useContext(UserContext)
  const { relayPool, lastEventId } = useContext(RelayPoolContext)
  const theme = useTheme()
  const [pageSize, setPageSize] = useState<number>(initialPageSize)
  const bottomSheetAddContactRef = React.useRef<RBSheet>(null)
  const bottomSheetProfileRef = React.useRef<RBSheet>(null)
  // State
  const [followers, setFollowers] = useState<User[]>([])
  const [following, setFollowing] = useState<User[]>([])
  const [muted, setMuted] = useState<User[]>([])
  const [contactInput, setContactInput] = useState<string>()
  const [isAddingContact, setIsAddingContact] = useState<boolean>(false)
  const [showNotification, setShowNotification] = useState<undefined | string>()
  const [tabKey, setTabKey] = React.useState('following')

  useFocusEffect(
    React.useCallback(() => {
      subscribeContacts()
      loadUsers()

      return () => relayPool?.unsubscribe(['followers', 'following', 'muted', 'contacts-meta'])
    }, []),
  )

  useEffect(() => {
    if (qrReader) {
      setContactInput(qrReader)
      setQrReader(undefined)
      onPressAddContact()
    }
  }, [qrReader])

  useEffect(() => {
    reloadLists()
    loadUsers()
    subscribeContacts()
  }, [lastEventId])

  useEffect(() => {
    loadUsers()
  }, [mutedUsers])

  const loadUsers: () => void = () => {
    if (database && publicKey) {
      getBlocked(database).then((results) => {
        if (mutedUsers.length > 0 || results.length > 0) {
          getUsers(database, {
            includeIds: [...mutedUsers, ...results.map((user) => user.id)],
          }).then((results) => {
            if (results) setMuted(results)
          })
        }
      })
      getFollowersAndFollowing(database).then((results) => {
        const followers: User[] = []
        const following: User[] = []
        if (results && results.length > 0) {
          results.forEach((user) => {
            if (user.id !== publicKey) {
              if (user.follower) followers.push(user)
              if (user.contact) following.push(user)
            }
          })
          if (results.length > 0) {
            relayPool?.subscribe('contacts-meta', [
              {
                kinds: [Kind.Metadata],
                authors: following
                  .filter((user) => !user.name || user.name === '')
                  .map((user) => user.id),
              },
            ])
          }
          setFollowers(followers)
          setFollowing(following)
        }
      })
    }
  }

  const subscribeContacts: () => void = async () => {
    if (publicKey) {
      relayPool?.subscribe('followers', [
        {
          kinds: [Kind.Contacts],
          authors: [publicKey],
        },
      ])
      relayPool?.subscribe('following', [
        {
          kinds: [Kind.Contacts],
          '#p': [publicKey],
        },
      ])
      relayPool?.subscribe('muted', [
        {
          kinds: [10000],
          authors: [publicKey],
          limit: 1,
        },
      ])
    }
  }

  const onPressAddContact: () => Promise<void> = async () => {
    if (contactInput && relayPool && database && publicKey) {
      setIsAddingContact(true)

      let hexKey = contactInput

      if (contactInput.includes('@')) {
        const profile = await queryProfile(contactInput)
        hexKey = profile?.pubkey ?? hexKey
      } else {
        hexKey = getNip19Key(contactInput) ?? hexKey
      }

      if (hexKey) {
        DatabaseModule.updateUserContact(hexKey, true, () => {
          populatePets(relayPool, database, publicKey)
          loadUsers()
          setIsAddingContact(false)
          setShowNotification('contactAdded')
        })
      } else {
        setIsAddingContact(false)
        setShowNotification('addContactError')
      }
    }
  }

  const pasteContact: () => void = () => {
    Clipboard.getString().then((value) => {
      setContactInput(value ?? '')
    })
  }

  const removeContact: (user: User) => void = (user) => {
    if (relayPool && database && publicKey) {
      DatabaseModule.updateUserContact(user.id, false, () => {
        populatePets(relayPool, database, publicKey)
        setShowNotification('contactRemoved')
        loadUsers()
      })
    }
  }

  const addContact: (user: User) => void = (user) => {
    if (relayPool && database && publicKey) {
      DatabaseModule.updateUserContact(user.id, true, () => {
        populatePets(relayPool, database, publicKey)
        setShowNotification('contactRemoved')
        loadUsers()
      })
    }
  }

  const unmute: (user: User) => void = (user) => {
    if (relayPool && database && publicKey) {
      DatabaseModule.updateUserBlock(user.id, false, () => {
        removeMutedUsersList(relayPool, database, publicKey, user.id)
        setShowNotification('contactUnmuted')
        loadUsers()
        reloadLists()
      })
    }
  }

  const renderContactItem: ListRenderItem<User> = ({ index, item }) => {
    return (
      <TouchableRipple
        onPress={() => {
          setDisplayUserDrawer(item.id)
          bottomSheetProfileRef.current?.open()
        }}
      >
        <View key={item.id} style={styles.contactRow}>
          <View style={styles.profileData}>
            <ProfileData
              username={item?.name}
              publicKey={getNpub(item.id)}
              validNip05={item?.valid_nip05}
              nip05={item?.nip05}
              lnurl={item?.lnurl}
              lnAddress={item?.ln_address}
              picture={item?.picture}
            />
          </View>
          <View>
            <Button onPress={() => (item.contact ? removeContact(item) : addContact(item))}>
              {item.contact ? t('contactsPage.stopFollowing') : t('contactsPage.follow')}
            </Button>
          </View>
        </View>
      </TouchableRipple>
    )
  }

  const renderMutedItem: ListRenderItem<User> = ({ index, item }) => {
    return (
      <TouchableRipple
        onPress={() => {
          setDisplayUserDrawer(item.id)
          bottomSheetProfileRef.current?.open()
        }}
      >
        <View key={item.id} style={styles.contactRow}>
          <View style={styles.profileData}>
            <ProfileData
              username={item?.name}
              publicKey={getNpub(item.id)}
              validNip05={item?.valid_nip05}
              nip05={item?.nip05}
              lnurl={item?.lnurl}
              lnAddress={item?.ln_address}
              picture={item?.picture}
            />
          </View>
          <View style={styles.contactInfo}>
            <Button onPress={() => unmute(item)}>{t('contactsPage.unmute')}</Button>
          </View>
        </View>
      </TouchableRipple>
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

  const onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void = (event) => {
    if (handleInfinityScroll(event)) {
      setPageSize(pageSize + initialPageSize)
    }
  }

  const ListEmptyComponentFollowing = (
    <View style={styles.blank}>
      <MaterialCommunityIcons
        name='account-group-outline'
        size={64}
        style={styles.center}
        color={theme.colors.onPrimaryContainer}
      />
      <Text variant='headlineSmall' style={styles.center}>
        {t('contactsPage.emptyTitleFollowing')}
      </Text>
      <Text variant='bodyMedium' style={styles.center}>
        {t('contactsPage.emptyDescriptionFollowing')}
      </Text>
      <Button mode='contained' compact onPress={() => bottomSheetAddContactRef.current?.open()}>
        {t('contactsPage.emptyButtonFollowing')}
      </Button>
    </View>
  )

  const Following: JSX.Element = (
    <View style={styles.container}>
      <FlashList
        estimatedItemSize={71}
        showsVerticalScrollIndicator={false}
        data={following.slice(0, pageSize)}
        renderItem={renderContactItem}
        onScroll={onScroll}
        ItemSeparatorComponent={Divider}
        ListEmptyComponent={ListEmptyComponentFollowing}
        horizontal={false}
        contentContainerStyle={styles.list}
      />
    </View>
  )

  const ListEmptyComponentFollowers = (
    <View style={styles.blank}>
      <MaterialCommunityIcons
        name='account-group-outline'
        size={64}
        style={styles.center}
        color={theme.colors.onPrimaryContainer}
      />
      <Text variant='headlineSmall' style={styles.center}>
        {t('contactsPage.emptyTitleFollower')}
      </Text>
      <Text variant='bodyMedium' style={styles.center}>
        {t('contactsPage.emptyDescriptionFollower')}
      </Text>
      <Button
        mode='contained'
        compact
        onPress={() => {
          setShowNotification('keyCopied')
          Clipboard.setString(nPub ?? '')
        }}
      >
        {t('contactsPage.emptyButtonFollower')}
      </Button>
    </View>
  )

  const Followers: JSX.Element = (
    <View style={styles.container}>
      <FlashList
        estimatedItemSize={71}
        data={followers.slice(0, pageSize)}
        renderItem={renderContactItem}
        ListEmptyComponent={ListEmptyComponentFollowers}
        onScroll={onScroll}
        ItemSeparatorComponent={Divider}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
      />
    </View>
  )

  const ListEmptyComponentBlocked = (
    <View style={styles.blankNoButton}>
      <MaterialCommunityIcons
        name='account-group-outline'
        size={64}
        style={styles.center}
        color={theme.colors.onPrimaryContainer}
      />
      <Text variant='headlineSmall' style={styles.center}>
        {t('contactsPage.emptyTitleBlocked')}
      </Text>
      <Text variant='bodyMedium' style={styles.center}>
        {t('contactsPage.emptyDescriptionBlocked')}
      </Text>
    </View>
  )

  const Muted: JSX.Element = (
    <View style={styles.container}>
      <FlashList
        estimatedItemSize={71}
        showsVerticalScrollIndicator={false}
        data={muted.slice(0, pageSize)}
        renderItem={renderMutedItem}
        onScroll={onScroll}
        ItemSeparatorComponent={Divider}
        ListEmptyComponent={ListEmptyComponentBlocked}
        horizontal={false}
        contentContainerStyle={styles.list}
      />
    </View>
  )

  const renderScene: Record<string, JSX.Element> = {
    following: Following,
    followers: Followers,
    muted: Muted,
  }

  return (
    <>
      <View style={styles.tabsNavigator}>
        <View
          style={[
            styles.tab,
            tabKey === 'following'
              ? { ...styles.tabActive, borderBottomColor: theme.colors.primary }
              : {},
          ]}
        >
          <TouchableRipple style={styles.textWrapper} onPress={() => setTabKey('following')}>
            <Text style={styles.tabText}>
              {t('contactsPage.following', { count: following.length })}
            </Text>
          </TouchableRipple>
        </View>
        <View
          style={[
            styles.tab,
            tabKey === 'followers'
              ? { ...styles.tabActive, borderBottomColor: theme.colors.primary }
              : {},
          ]}
        >
          <TouchableRipple style={styles.textWrapper} onPress={() => setTabKey('followers')}>
            <Text style={styles.tabText}>
              {t('contactsPage.followers', { count: followers.length })}
            </Text>
          </TouchableRipple>
        </View>
        <View
          style={[
            styles.tab,
            tabKey === 'muted'
              ? { ...styles.tabActive, borderBottomColor: theme.colors.primary }
              : {},
          ]}
        >
          <TouchableRipple style={styles.textWrapper} onPress={() => setTabKey('muted')}>
            <Text style={styles.tabText}>{t('contactsPage.muted', { count: muted.length })}</Text>
          </TouchableRipple>
        </View>
      </View>
      {renderScene[tabKey]}
      {privateKey && (
        <AnimatedFAB
          style={styles.fab}
          icon='account-multiple-plus-outline'
          label='Label'
          onPress={() => bottomSheetAddContactRef.current?.open()}
          animateFrom='right'
          iconMode='static'
          extended={false}
        />
      )}
      <RBSheet
        ref={bottomSheetAddContactRef}
        closeOnDragDown={true}
        customStyles={bottomSheetStyles}
        onClose={() => setContactInput('')}
      >
        <View>
          <Text variant='titleLarge'>{t('contactsPage.addContactTitle')}</Text>
          <Text variant='bodyMedium'>{t('contactsPage.addContactDescription')}</Text>
          <TextInput
            style={styles.input}
            mode='outlined'
            label={t('contactsPage.addContact') ?? ''}
            onChangeText={setContactInput}
            value={contactInput}
            right={
              <TextInput.Icon
                icon='content-paste'
                onPress={pasteContact}
                forceTextInputFocus={false}
              />
            }
            // left={
            //   <TextInput.Icon
            //     icon='qrcode'
            //     onPress={() => {
            //       bottomSheetAddContactRef.current?.close()
            //       navigate('QrReader')
            //     }}
            //     forceTextInputFocus={false}
            //   />
            // }
          />
          <Button
            style={styles.addContactButton}
            mode='contained'
            disabled={!contactInput || contactInput === ''}
            onPress={onPressAddContact}
            loading={isAddingContact}
          >
            {t('contactsPage.addContact')}
          </Button>
          <Button
            mode='outlined'
            onPress={() => {
              bottomSheetAddContactRef.current?.close()
              setContactInput('')
            }}
          >
            {t('contactsPage.cancel')}
          </Button>
        </View>
      </RBSheet>
      {showNotification && (
        <Snackbar
          style={styles.snackbar}
          visible={showNotification !== undefined}
          duration={Snackbar.DURATION_SHORT}
          onIconPress={() => setShowNotification(undefined)}
          onDismiss={() => setShowNotification(undefined)}
        >
          {t(`contactsPage.notifications.${showNotification}`)}
        </Snackbar>
      )}
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: '90%',
  },
  tabsNavigator: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
  },
  bottomSheet: {
    paddingBottom: 24,
  },
  input: {
    marginTop: 16,
    marginBottom: 16,
  },
  addContactButton: {
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignContent: 'center',
  },
  tabActive: {
    borderBottomWidth: 3,
  },
  textWrapper: {
    justifyContent: 'center',
    height: '100%',
    textAlign: 'center',
  },
  tabText: {
    textAlign: 'center',
  },
  snackbar: {
    margin: 16,
    marginBottom: 95,
    flex: 1,
  },
  contactRow: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  contactData: {
    paddingLeft: 16,
  },
  contactName: {
    flexDirection: 'row',
  },
  contactInfo: {
    alignContent: 'center',
    justifyContent: 'space-between',
  },
  fab: {
    bottom: 16,
    right: 16,
    position: 'absolute',
  },
  center: {
    alignContent: 'center',
    textAlign: 'center',
  },
  blank: {
    justifyContent: 'space-between',
    height: 252,
    marginTop: 75,
    padding: 16,
  },
  blankNoButton: {
    justifyContent: 'space-between',
    height: 192,
    marginTop: 75,
    padding: 16,
  },
  tabLabel: {
    margin: 8,
  },
  list: {
    paddingBottom: 80,
  },
  verifyIcon: {
    paddingTop: 4,
    paddingLeft: 5,
  },
  profileData: {
    flex: 1,
  },
})

export default ContactsPage
