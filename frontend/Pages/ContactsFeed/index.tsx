import React, { useContext, useEffect, useState } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native'
import { AppContext } from '../../Contexts/AppContext'
import { EventKind } from '../../lib/nostr/Events'
import { useTranslation } from 'react-i18next'
import { getUsers, updateUserContact, User } from '../../Functions/DatabaseFunctions/Users'
import { Button, UserCard } from '../../Components'
import { RelayPoolContext } from '../../Contexts/RelayPoolContext'
import { populatePets } from '../../Functions/RelayFunctions/Users'
import { getNip19Key } from '../../lib/nostr/Nip19'
import { UserContext } from '../../Contexts/UserContext'
import { useTheme } from 'react-native-paper'

export const ContactsFeed: React.FC = () => {
  const { database } = useContext(AppContext)
  const { publicKey, privateKey } = React.useContext(UserContext)
  const { relayPool, lastEventId } = useContext(RelayPoolContext)
  const theme = useTheme()
  // State
  const [users, setUsers] = useState<User[]>()
  const [showAddContact, setShowAddContact] = useState<boolean>(false)
  const [contactInput, setContactInput] = useState<string>()
  const [selectedTab, setSelectedTab] = useState(0)
  const [isAddingContact, setIsAddingContact] = useState<boolean>(false)

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
      let filters: object = { followers: true }
      if (selectedTab === 0) {
        filters = { contacts: true }
      }

      getUsers(database, filters).then((results) => {
        if (results && results.length > 0) {
          setUsers(results)
          relayPool?.subscribe('contacts-meta', [
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
          setShowAddContact(false)
          loadUsers()
          setIsAddingContact(false) // restore sending status
        })
        .catch((err) => {
          setIsAddingContact(false) // restore sending status
        })
    }
  }

  return (
    <>
      {/* <TopNavigation alignment='center' accessoryLeft={renderBackAction} />
      <TabBar
        style={styles.topBar}
        selectedIndex={selectedTab}
        onSelect={(index) => setSelectedTab(index)}
      >
        <Tab title={<Text>{t('contactsPage.following')}</Text>} />
        <Tab title={<Text>{t('contactsPage.followers')}</Text>} />
      </TabBar>
      <Layout style={styles.container} level='3'>
        <ScrollView horizontal={false}>
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
              <Button onPress={onPressAddContact} loading={isAddingContact}>
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
      )} */}
    </>
  )
}

export default ContactsFeed
