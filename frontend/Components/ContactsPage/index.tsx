import { Button, Card, Input, Layout, Modal, useTheme } from '@ui-kitten/components'
import React, { useCallback, useContext, useEffect, useState } from 'react'
import { RefreshControl, ScrollView, StyleSheet, TouchableOpacity } from 'react-native'
import { AppContext } from '../../Contexts/AppContext'
import Icon from 'react-native-vector-icons/FontAwesome5'
import { Event, EventKind } from '../../lib/nostr/Events'
import { useTranslation } from 'react-i18next'
import {
  addContact,
  getUsers,
  insertUserContact,
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

  const { t } = useTranslation('common')

  useEffect(() => {
    loadUsers()
  }, [lastEventId])

  useEffect(() => {
    subscribeContacts()
  }, [])

  const loadUsers: () => void = () => {
    if (database && publicKey) {
      setTimeout(() => setRefreshing(false), 5000)
      getUsers(database, { contacts: true }).then((results) => {
        if (results) setUsers(results)
      })
    }
  }

  const subscribeContacts: () => void = async () => {
    relayPool?.unsubscribeAll()
    relayPool?.on('event', 'contacts', (relay: Relay, _subId?: string, event?: Event) => {
      console.log('CONTACTS PAGE EVENT =======>', relay.url, event)
      if (database && event?.id && event.kind === EventKind.petNames) {
        insertUserContact(event, database).finally(() => setLastEventId(event?.id ?? ''))
        relayPool?.removeOn('event', 'contacts')
      }
    })
    if (publicKey) {
      relayPool?.subscribe('main-channel', {
        kinds: [EventKind.petNames],
        authors: [publicKey],
      })
    }
  }

  const onPressAddContact: () => void = () => {
    if (contactInput && relayPool && database && publicKey) {
      addContact(contactInput, database).then(() => {
        populatePets(relayPool, database, publicKey)
        setShowAddContact(false)
        loadUsers()
      })
    }
  }

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    relayPool?.unsubscribeAll()
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
  })

  return (
    <>
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
