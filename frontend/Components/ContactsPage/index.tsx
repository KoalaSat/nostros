import { Button, Card, Input, Layout, Modal, Tab, TabBar, useTheme } from '@ui-kitten/components'
import React, { useCallback, useContext, useEffect, useState } from 'react'
import { RefreshControl, ScrollView, StyleSheet, TouchableOpacity } from 'react-native'
import { AppContext } from '../../Contexts/AppContext'
import Icon from 'react-native-vector-icons/FontAwesome5'
import { Event, EventKind } from '../../lib/nostr/Events'
import { useTranslation } from 'react-i18next'
import {
  getUser,
  getUsers,
  insertUserPets,
  updateUserContact,
  updateUserFollower,
  User,
} from '../../Functions/DatabaseFunctions/Users'
import UserCard from '../UserCard'
import { RelayPoolContext } from '../../Contexts/RelayPoolContext'
import Relay from '../../lib/nostr/Relay'
import { populatePets } from '../../Functions/RelayFunctions/Users'

export const ContactsPage: React.FC = () => {
  const { database } = useContext(AppContext)
  const { relayPool, publicKey, lastEventId, setLastEventId, privateKey } =
    useContext(RelayPoolContext)
  const theme = useTheme()
  const [users, setUsers] = useState<User[]>()
  const [refreshing, setRefreshing] = useState(true)
  const [showAddContact, setShowAddContact] = useState<boolean>(false)
  const [contactInput, setContactInput] = useState<string>()
  const [selectedTab, setSelectedTab] = useState(0)

  const { t } = useTranslation('common')

  useEffect(() => {
    loadUsers()
  }, [lastEventId])

  useEffect(() => {
    setUsers([])
    loadUsers()
    subscribeContacts()
  }, [selectedTab])

  const loadUsers: () => void = () => {
    if (database && publicKey) {
      if (selectedTab === 0) {
        getUsers(database, { contacts: true }).then((results) => {
          if (results) setUsers(results)
          setRefreshing(false)
        })
      } else {
        getUsers(database, { followers: true }).then((results) => {
          if (results) setUsers(results)
          setRefreshing(false)
        })
      }
    }
  }

  const subscribeContacts: () => void = async () => {
    relayPool?.unsubscribeAll()
    relayPool?.on('event', 'contacts', async (relay: Relay, _subId?: string, event?: Event) => {
      console.log('CONTACTS PAGE EVENT =======>', relay.url, event)
      if (database && event?.id && publicKey && event.kind === EventKind.petNames) {
        if (event.pubkey === publicKey) {
          insertUserPets(event, database).finally(() => setLastEventId(event?.id ?? ''))
          relayPool?.removeOn('event', 'contacts')
        } else {
          const isFollower = event.tags.some((tag) => tag[1] === publicKey)
          await updateUserFollower(event.pubkey, database, isFollower)
          setLastEventId(event?.id ?? '')
          if (isFollower) {
            const user = await getUser(event.pubkey, database)
            if (!user?.name && user?.id) {
              relayPool?.subscribe('main-channel', {
                kinds: [EventKind.meta],
                authors: [user.id],
              })
            }
          }
        }
      }
    })
    if (publicKey) {
      if (selectedTab === 0) {
        relayPool?.subscribe('main-channel', {
          kinds: [EventKind.petNames],
          authors: [publicKey],
        })
      } else if (selectedTab === 1) {
        relayPool?.subscribe('main-channel', {
          kinds: [EventKind.petNames],
          '#p': [publicKey],
        })
      }
    }
  }

  const onPressAddContact: () => void = () => {
    if (contactInput && relayPool && database && publicKey) {
      updateUserContact(contactInput, database, true).then(() => {
        populatePets(relayPool, database, publicKey)
        setShowAddContact(false)
        loadUsers()
      })
    }
  }

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    subscribeContacts()
  }, [])

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    actionContainer: {
      marginTop: 30,
      marginBottom: 30,
      paddingLeft: 12,
      paddingRight: 12,
    },
    button: {
      marginTop: 30,
    },
    icon: {
      width: 32,
      height: 32,
    },
    modal: {
      paddingLeft: 32,
      paddingRight: 32,
      width: '100%',
    },
    backdrop: {
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    topBar: {
      height: 64,
    },
  })

  return (
    <>
      <TabBar
        style={styles.topBar}
        selectedIndex={selectedTab}
        onSelect={(index) => setSelectedTab(index)}
      >
        <Tab title={t('contactsPage.following')} />
        <Tab title={t('contactsPage.followers')} />
      </TabBar>
      <Layout style={styles.container} level='3'>
        <ScrollView
          horizontal={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {users?.map((user) => (
            <UserCard user={user} key={user.id} />
          ))}
        </ScrollView>
      </Layout>
      <Modal
        style={styles.modal}
        visible={showAddContact}
        backdropStyle={styles.backdrop}
        onBackdropPress={() => setShowAddContact(false)}
      >
        <Card disabled={true}>
          <Layout style={styles.actionContainer}>
            <Layout>
              <Input
                placeholder={t('contactsPage.addContact.placeholder')}
                value={contactInput}
                onChangeText={setContactInput}
                size='large'
              />
            </Layout>
            <Layout style={styles.button}>
              <Button onPress={onPressAddContact}>{t('contactsPage.addContact.add')}</Button>
            </Layout>
          </Layout>
        </Card>
      </Modal>
      {privateKey && (
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
          onPress={() => setShowAddContact(true)}
        >
          <Icon name='user-plus' size={30} color={theme['text-basic-color']} solid />
        </TouchableOpacity>
      )}
    </>
  )
}

export default ContactsPage
