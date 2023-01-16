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
import { getUsers, updateUserContact, User } from '../../Functions/DatabaseFunctions/Users'
import { RelayPoolContext } from '../../Contexts/RelayPoolContext'
import { formatPubKey, populatePets, username } from '../../Functions/RelayFunctions/Users'
import { getNip19Key } from '../../lib/nostr/Nip19'
import { UserContext } from '../../Contexts/UserContext'
import {
  AnimatedFAB,
  Button,
  Divider,
  Text,
  TextInput,
  TouchableRipple,
  useTheme,
} from 'react-native-paper'
import { Tabs, TabScreen } from 'react-native-paper-tabs'
import NostrosAvatar from '../../Components/NostrosAvatar'
import { navigate } from '../../lib/Navigation'
import RBSheet from 'react-native-raw-bottom-sheet'
import NostrosNotification from '../../Components/NostrosNotification'

export const ContactsFeed: React.FC = () => {
  const { database } = useContext(AppContext)
  const { publicKey, setContantsCount, setFollowersCount } = React.useContext(UserContext)
  const { relayPool, lastEventId } = useContext(RelayPoolContext)
  const theme = useTheme()
  const bottomSheetAddContactRef = React.useRef<RBSheet>(null)
  // State
  const [followers, setFollowers] = useState<User[]>([])
  const [following, setFollowing] = useState<User[]>([])
  const [contactInput, setContactInput] = useState<string>()
  const [isAddingContact, setIsAddingContact] = useState<boolean>(false)
  const [showNotification, setShowNotification] = useState<undefined | string>()

  const { t } = useTranslation('common')

  useEffect(() => {
    loadUsers()
    subscribeContacts()
  }, [lastEventId])

  const loadUsers: () => void = () => {
    if (database && publicKey) {
      getUsers(database, { contacts: true }).then((results) => {
        if (results && results.length > 0) {
          setFollowing(results)
          setContantsCount(results.length)
          relayPool?.subscribe('contacts-meta-following', [
            {
              kinds: [EventKind.meta],
              authors: results.map((user) => user.id),
            },
          ])
        }
      })
      getUsers(database, { followers: true }).then((results) => {
        if (results && results.length > 0) {
          setFollowers(results)
          setFollowersCount(results.length)
          relayPool?.subscribe('contacts-meta-followers', [
            {
              kinds: [EventKind.meta],
              authors: results.map((user) => user.id),
            },
          ])
        }
      })
    }
  }

  const subscribeContacts: () => void = async () => {
    relayPool?.unsubscribeAll()
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

  const renderContactItem: ListRenderItem<User> = ({ index, item }) => (
    <TouchableRipple onPress={() => navigate('Profile', { pubKey: item.id })}>
      <View key={item.id} style={styles.contactRow}>
        <View style={styles.contactInfo}>
          <NostrosAvatar
            name={item.name}
            pubKey={item.id}
            src={item.picture}
            lud06={item.lnurl}
            size={40}
          />
          <View style={styles.contactName}>
            <Text>{formatPubKey(item.id)}</Text>
            {item.name && <Text variant='titleSmall'>{username(item)}</Text>}
          </View>
        </View>
        <View style={styles.contactFollow}>
          <Button onPress={() => (item.contact ? removeContact(item) : addContact(item))}>
            {item.contact ? t('sendPage.stopFollowing') : t('sendPage.follow')}
          </Button>
        </View>
      </View>
    </TouchableRipple>
  )

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

  return (
    <>
      <Tabs uppercase={false} theme={theme} style={{ backgroundColor: theme.colors.background }}>
        <TabScreen label={t('contactsFeed.following', { count: following.length })}>
          <View style={styles.container}>
            <ScrollView horizontal={false}>
              <FlatList
                data={following}
                renderItem={renderContactItem}
                ItemSeparatorComponent={Divider}
              />
            </ScrollView>
          </View>
        </TabScreen>
        <TabScreen label={t('contactsFeed.followers', { count: followers.length })}>
          <View style={styles.container}>
            <ScrollView horizontal={false}>
              <FlatList
                data={followers}
                renderItem={renderContactItem}
                ItemSeparatorComponent={Divider}
              />
            </ScrollView>
          </View>
        </TabScreen>
      </Tabs>
      <AnimatedFAB
        style={[styles.fab, { top: Dimensions.get('window').height - 220 }]}
        icon='account-multiple-plus-outline'
        label='Label'
        onPress={() => bottomSheetAddContactRef.current?.open()}
        animateFrom='right'
        iconMode='static'
        extended={false}
      />
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
            label={t('profileConfigPage.addContact') ?? ''}
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
            {t('addContact.add')}
          </Button>
        </View>
      </RBSheet>
      <NostrosNotification
        showNotification={showNotification}
        setShowNotification={setShowNotification}
      >
        <Text>{t(`profileConfigPage.${showNotification}`)}</Text>
      </NostrosNotification>
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
})

export default ContactsFeed
