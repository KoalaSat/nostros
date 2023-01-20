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
import { EventKind } from '../../lib/nostr/Events'
import { useTranslation } from 'react-i18next'
import {
  getFollowersAndFollowing,
  updateUserContact,
  User,
} from '../../Functions/DatabaseFunctions/Users'
import { RelayPoolContext } from '../../Contexts/RelayPoolContext'
import { formatPubKey, populatePets, username } from '../../Functions/RelayFunctions/Users'
import { getNip19Key } from '../../lib/nostr/Nip19'
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
import NostrosAvatar from '../../Components/NostrosAvatar'
import RBSheet from 'react-native-raw-bottom-sheet'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import { npubEncode } from 'nostr-tools/nip19'
import { useFocusEffect } from '@react-navigation/native'
import ProfileCard from '../../Components/ProfileCard'

export const ContactsFeed: React.FC = () => {
  const { t } = useTranslation('common')
  const { database } = useContext(AppContext)
  const { publicKey, setContantsCount, setFollowersCount, nPub } = React.useContext(UserContext)
  const { relayPool, lastEventId } = useContext(RelayPoolContext)
  const theme = useTheme()
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
              kinds: [EventKind.meta],
              authors: results.map((user) => user.id),
              since: results[0]?.created_at ?? 0,
            },
          ])
          setFollowers(followers)
          setFollowing(following)
          setContantsCount(following.length)
          setFollowersCount(followers.length)
        }
      })
    }
  }

  const subscribeContacts: () => void = async () => {
    if (publicKey) {
      relayPool?.subscribe('contacts', [
        {
          kinds: [EventKind.petNames],
          authors: [publicKey],
        },
        {
          kinds: [EventKind.petNames],
          '#p': [publicKey],
        },
      ])
    }
  }

  const onPressAddContact: () => void = () => {
    if (contactInput && relayPool && database && publicKey) {
      setIsAddingContact(true)
      const hexKey = getNip19Key(contactInput)
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
    const nPub = npubEncode(item.id)
    return (
      <TouchableRipple
        onPress={() => {
          setProfileCardPubkey(item.id)
          bottomSheetProfileRef.current?.open()
        }}
      >
        <View key={item.id} style={styles.contactRow}>
          <View style={styles.contactInfo}>
            <NostrosAvatar
              name={item.name}
              pubKey={nPub}
              src={item.picture}
              lud06={item.lnurl}
              size={40}
            />
            <View style={styles.contactName}>
              <Text>{formatPubKey(nPub)}</Text>
              {item.name && <Text variant='titleSmall'>{username(item)}</Text>}
            </View>
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
        padding: 16,
        borderTopRightRadius: 28,
        borderTopLeftRadius: 28,
      },
    }
  }, [])

  const Following: JSX.Element = (
    <View style={styles.container}>
      {following.length > 0 ? (
        <ScrollView horizontal={false}>
          <View>
            <FlatList
              data={following}
              renderItem={renderContactItem}
              ItemSeparatorComponent={Divider}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </ScrollView>
      ) : (
        <View style={styles.blank}>
          <MaterialCommunityIcons name='account-group-outline' size={64} style={styles.center} />
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
        <ScrollView horizontal={false}>
          <View>
            <FlatList
              data={followers}
              renderItem={renderContactItem}
              ItemSeparatorComponent={Divider}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </ScrollView>
      ) : (
        <View style={styles.blank}>
          <MaterialCommunityIcons name='account-group-outline' size={64} style={styles.center} />
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
          <TouchableRipple onPress={() => setTabKey('following')}>
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
          <TouchableRipple onPress={() => setTabKey('followers')}>
            <Text style={styles.tabText}>
              {t('contactsFeed.followers', { count: followers.length })}
            </Text>
          </TouchableRipple>
        </View>
      </View>
      {renderScene[tabKey]}
      <AnimatedFAB
        style={[styles.fab, { top: Dimensions.get('window').height - 200 }]}
        icon='account-multiple-plus-outline'
        label='Label'
        onPress={() => bottomSheetAddContactRef.current?.open()}
        animateFrom='right'
        iconMode='static'
        extended={false}
      />

      <RBSheet
        ref={bottomSheetProfileRef}
        closeOnDragDown={true}
        height={280}
        customStyles={bottomSheetStyles}
      >
        <ProfileCard userPubKey={profileCardPubkey ?? ''} bottomSheetRef={bottomSheetProfileRef} />
      </RBSheet>
      <RBSheet
        ref={bottomSheetAddContactRef}
        closeOnDragDown={true}
        height={280}
        customStyles={bottomSheetStyles}
        onClose={() => setContactInput('')}
      >
        <View>
          <Text variant='titleLarge'>{t('contactsFeed.addContactTitle')}</Text>
          <Text variant='bodyMedium'>{t('contactsFeed.addContactDescription')}</Text>
          <TextInput
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
    justifyContent: 'space-between',
    height: 70,
  },
  tab: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignContent: 'center',
  },
  tabActive: {
    borderBottomWidth: 5,
  },
  tabText: {
    textAlign: 'center',
    paddingTop: 25,
    height: '100%',
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
    width: '100%',
  },
  contactName: {
    paddingLeft: 16,
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
    height: 232,
    marginTop: 5,
    padding: 16,
  },
  tabLabel: {
    margin: 8,
  },
})

export default ContactsFeed
