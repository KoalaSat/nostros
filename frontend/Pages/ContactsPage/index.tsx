import {
  Card,
  Input,
  Layout,
  Modal,
  Tab,
  TabBar,
  TopNavigation,
  useTheme,
} from '@ui-kitten/components'
import React, { useContext, useEffect, useState } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native'
import { AppContext } from '../../Contexts/AppContext'
import Icon from 'react-native-vector-icons/FontAwesome5'
import { showMessage } from 'react-native-flash-message'
import { EventKind } from '../../lib/nostr/Events'
import { useTranslation } from 'react-i18next'
import { getUsers, updateUserContact, User } from '../../Functions/DatabaseFunctions/Users'
import { Button, UserCard } from '../../Components'
import { RelayPoolContext } from '../../Contexts/RelayPoolContext'
import { populatePets } from '../../Functions/RelayFunctions/Users'
import { getNip19Key } from '../../lib/nostr/Nip19'

export const ContactsPage: React.FC = () => {
  const { database, goBack } = useContext(AppContext)
  const { relayPool, publicKey, privateKey, lastEventId } = useContext(RelayPoolContext)
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
          showMessage({
            message: t('alerts.contactAddError'),
            description: err.message,
            type: 'danger',
          })
          setIsAddingContact(false) // restore sending status
        })
    }
  }

  const onPressBack: () => void = () => {
    relayPool?.unsubscribeAll()
    goBack()
  }

  const renderBackAction = (): JSX.Element => {
    return (
      <Button
        accessoryRight={<Icon name='arrow-left' size={16} color={theme['text-basic-color']} />}
        onPress={onPressBack}
        appearance='ghost'
      />
    )
  }

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
      <TopNavigation alignment='center' accessoryLeft={renderBackAction} />
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
      )}
    </>
  )
}

export default ContactsPage
