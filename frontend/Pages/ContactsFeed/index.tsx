import React, { useContext, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  ListRenderItem,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native'
import Clipboard from '@react-native-clipboard/clipboard'
import { AppContext } from '../../Contexts/AppContext'
import { Kind } from 'nostr-tools'
import { useTranslation } from 'react-i18next'
import {
  getFollowersAndFollowing,
  updateUserContact,
  User,
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
import ProfileCard from '../../Components/ProfileCard'
import ProfileData from '../../Components/ProfileData'
import { handleInfinityScroll } from '../../Functions/NativeFunctions'

export const ContactsFeed: React.FC = () => {
  const { t } = useTranslation('common')
  const initialPageSize = 20
  const { database } = useContext(AppContext)
  const { privateKey, publicKey, nPub } = React.useContext(UserContext)
  const { relayPool, lastEventId } = useContext(RelayPoolContext)
  const theme = useTheme()
  const [pageSize, setPageSize] = useState<number>(initialPageSize)
  const bottomSheetAddContactRef = React.useRef<RBSheet>(null)
  const bottomSheetProfileRef = React.useRef<RBSheet>(null)
  // State
  const [followers, setFollowers] = useState<User[]>([])
  const [following, setFollowing] = useState<User[]>([])
  const [contactInput, setContactInput] = useState<string>()
  const [profileCardPubkey, setProfileCardPubkey] = useState<string>()
  const [isAddingContact, setIsAddingContact] = useState<boolean>(false)
  const [showNotification, setShowNotification] = useState<undefined | string>()
  const [tabKey, setTabKey] = React.useState('following')

  useFocusEffect(
    React.useCallback(() => {
      subscribeContacts()
      loadUsers()

      return () => relayPool?.unsubscribe(['contacts', 'contacts-meta'])
    }, []),
  )

  useEffect(() => {
    loadUsers()
    subscribeContacts()
  }, [lastEventId])

  const loadUsers: () => void = () => {
    if (database && publicKey) {
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
          relayPool?.subscribe('contacts-meta', [
            {
              kinds: [Kind.Metadata],
              authors: results.map((user) => user.id),
            },
          ])
          setFollowers(followers)
          setFollowing(following)
        }
      })
    }
  }

  const subscribeContacts: () => void = async () => {
    if (publicKey) {
      relayPool?.subscribe('contacts', [
        {
          kinds: [Kind.Contacts],
          authors: [publicKey],
        },
        {
          kinds: [Kind.Contacts],
          '#p': [publicKey],
        },
      ])
    }
  }

  const onPressAddContact: () => void = () => {
    if (contactInput && relayPool && database && publicKey) {
      setIsAddingContact(true)
      const hexKey = getNip19Key(contactInput) ?? contactInput
      if (hexKey) {
        updateUserContact(hexKey, database, true)
          .then(() => {
            populatePets(relayPool, database, publicKey)
            loadUsers()
            setIsAddingContact(false)
            bottomSheetAddContactRef.current?.close()
            setShowNotification('contactAdded')
          })
          .catch(() => {
            setIsAddingContact(false)
            setShowNotification('addContactError')
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
      updateUserContact(user.id, database, false).then(() => {
        populatePets(relayPool, database, publicKey)
        setShowNotification('contactRemoved')
        loadUsers()
      })
    }
  }

  const addContact: (user: User) => void = (user) => {
    if (relayPool && database && publicKey) {
      updateUserContact(user.id, database, true).then(() => {
        populatePets(relayPool, database, publicKey)
        setShowNotification('contactAdded')
        loadUsers()
      })
    }
  }

  const renderContactItem: ListRenderItem<User> = ({ index, item }) => {
    return (
      <TouchableRipple
        onPress={() => {
          setProfileCardPubkey(item.id)
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
              lud06={item?.lnurl}
              picture={item?.picture}
              avatarSize={40}
            />
          </View>
          <View style={styles.contactFollow}>
            <Button onPress={() => (item.contact ? removeContact(item) : addContact(item))}>
              {item.contact ? t('contactsFeed.stopFollowing') : t('contactsFeed.follow')}
            </Button>
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

  const Following: JSX.Element = (
    <View style={styles.container}>
      {following.length > 0 ? (
        <ScrollView horizontal={false} onScroll={onScroll} showsVerticalScrollIndicator={false}>
          <View>
            <FlatList
              style={styles.list}
              data={following.slice(0, pageSize)}
              renderItem={renderContactItem}
              ItemSeparatorComponent={Divider}
              showsVerticalScrollIndicator={false}
            />
            {pageSize < following.length && <ActivityIndicator animating={true} />}
          </View>
        </ScrollView>
      ) : (
        <View style={styles.blank}>
          <MaterialCommunityIcons
            name='account-group-outline'
            size={64}
            style={styles.center}
            color={theme.colors.onPrimaryContainer}
          />
          <Text variant='headlineSmall' style={styles.center}>
            {t('contactsFeed.emptyTitleFollowing')}
          </Text>
          <Text variant='bodyMedium' style={styles.center}>
            {t('contactsFeed.emptyDescriptionFollowing')}
          </Text>
          <Button mode='contained' compact onPress={() => bottomSheetAddContactRef.current?.open()}>
            {t('contactsFeed.emptyButtonFollowing')}
          </Button>
        </View>
      )}
    </View>
  )

  const Follower: JSX.Element = (
    <View style={styles.container}>
      {followers.length > 0 ? (
        <ScrollView horizontal={false} onScroll={onScroll} showsVerticalScrollIndicator={false}>
          <View>
            <FlatList
              style={styles.list}
              data={followers.slice(0, pageSize)}
              renderItem={renderContactItem}
              ItemSeparatorComponent={Divider}
              showsVerticalScrollIndicator={false}
            />
          </View>
          {pageSize < followers.length && <ActivityIndicator animating={true} />}
        </ScrollView>
      ) : (
        <View style={styles.blank}>
          <MaterialCommunityIcons
            name='account-group-outline'
            size={64}
            style={styles.center}
            color={theme.colors.onPrimaryContainer}
          />
          <Text variant='headlineSmall' style={styles.center}>
            {t('contactsFeed.emptyTitleFollower')}
          </Text>
          <Text variant='bodyMedium' style={styles.center}>
            {t('contactsFeed.emptyDescriptionFollower')}
          </Text>
          <Button
            mode='contained'
            compact
            onPress={() => {
              setShowNotification('keyCopied')
              Clipboard.setString(nPub ?? '')
            }}
          >
            {t('contactsFeed.emptyButtonFollower')}
          </Button>
        </View>
      )}
    </View>
  )

  const renderScene: Record<string, JSX.Element> = {
    following: Following,
    followers: Follower,
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
              {t('contactsFeed.following', { count: following.length })}
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
              {t('contactsFeed.followers', { count: followers.length })}
            </Text>
          </TouchableRipple>
        </View>
      </View>
      {renderScene[tabKey]}
      {privateKey && (
        <AnimatedFAB
          style={[styles.fab, { top: Dimensions.get('window').height - 220 }]}
          icon='account-multiple-plus-outline'
          label='Label'
          onPress={() => bottomSheetAddContactRef.current?.open()}
          animateFrom='right'
          iconMode='static'
          extended={false}
        />
      )}

      <RBSheet ref={bottomSheetProfileRef} closeOnDragDown={true} customStyles={bottomSheetStyles}>
        <ProfileCard userPubKey={profileCardPubkey ?? ''} bottomSheetRef={bottomSheetProfileRef} />
      </RBSheet>
      <RBSheet
        ref={bottomSheetAddContactRef}
        closeOnDragDown={true}
        customStyles={bottomSheetStyles}
        onClose={() => setContactInput('')}
      >
        <View>
          <Text variant='titleLarge'>{t('contactsFeed.addContactTitle')}</Text>
          <Text variant='bodyMedium'>{t('contactsFeed.addContactDescription')}</Text>
          <TextInput
            style={styles.input}
            mode='outlined'
            label={t('contactsFeed.addContact') ?? ''}
            onChangeText={setContactInput}
            value={contactInput}
            right={
              <TextInput.Icon
                icon='content-paste'
                onPress={pasteContact}
                forceTextInputFocus={false}
              />
            }
          />
          <Button
            style={styles.addContactButton}
            mode='contained'
            disabled={!contactInput || contactInput === ''}
            onPress={onPressAddContact}
            loading={isAddingContact}
          >
            {t('contactsFeed.addContact')}
          </Button>
          <Button
            mode='outlined'
            onPress={() => {
              bottomSheetAddContactRef.current?.close()
              setContactInput('')
            }}
          >
            {t('contactsFeed.cancel')}
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
          {t(`contactsFeed.notifications.${showNotification}`)}
        </Snackbar>
      )}
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  },
  contactRow: {
    paddingLeft: 16,
    paddingRight: 16,
    paddingTop: 16,
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
    flexDirection: 'row',
    alignContent: 'center',
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
    height: 252,
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
    maxWidth: 300,
  },
})

export default ContactsFeed
