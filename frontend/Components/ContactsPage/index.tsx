import { Button, Card, Input, Layout, Modal, Tab, TabBar, useTheme } from '@ui-kitten/components'
import React, { useCallback, useContext, useEffect, useState } from 'react'
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native'
import { AppContext } from '../../Contexts/AppContext'
import Icon from 'react-native-vector-icons/FontAwesome5'
import { EventKind } from '../../lib/nostr/Events'
import { useTranslation } from 'react-i18next'
import { getUsers, updateUserContact, User } from '../../Functions/DatabaseFunctions/Users'
import UserCard from '../UserCard'
import { RelayPoolContext } from '../../Contexts/RelayPoolContext'
import { populatePets } from '../../Functions/RelayFunctions/Users'

export const ContactsPage: React.FC = () => {
  const { database } = useContext(AppContext)
  const { relayPool, publicKey, privateKey } = useContext(RelayPoolContext)
  const theme = useTheme()
  const [users, setUsers] = useState<User[]>()
  const [refreshing, setRefreshing] = useState(true)
  const [showAddContact, setShowAddContact] = useState<boolean>(false)
  const [contactInput, setContactInput] = useState<string>()
  const [selectedTab, setSelectedTab] = useState(0)

  const { t } = useTranslation('common')

  useEffect(() => {
    setUsers([])
    loadUsers()
    subscribeContacts()
  }, [selectedTab])

  const loadUsers: () => void = () => {
    if (database && publicKey) {
      let filters: object = { followers: true }
      if (selectedTab === 0) {
        filters = { contacts: true }
      }

      getUsers(database, filters).then((results) => {
        if (results) {
          setUsers(results)
          relayPool?.subscribe('main-channel', {
            kinds: [EventKind.meta],
            authors: results.map((user) => user.id),
          })
        }
        setRefreshing(false)
      })
    }
  }

  const subscribeContacts: () => void = async () => {
    relayPool?.unsubscribeAll()
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
        <Tab title={<Text>{t('contactsPage.following')}</Text>} />
        <Tab title={<Text>{t('contactsPage.followers')}</Text>} />
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
              <Button onPress={onPressAddContact}>
                {<Text>{t('contactsPage.addContact.add')}</Text>}
              </Button>
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
