import React, { useContext, useEffect, useState } from 'react'
import { Button, Layout, Text, useTheme } from '@ui-kitten/components'
import { StyleSheet } from 'react-native'
import { RelayPoolContext } from '../../../Contexts/RelayPoolContext'
import { EventKind } from '../../../lib/nostr/Events'
import { AppContext } from '../../../Contexts/AppContext'
import { getUser, getUsers, User } from '../../../Functions/DatabaseFunctions/Users'
import Icon from 'react-native-vector-icons/FontAwesome5'
import { useTranslation } from 'react-i18next'
import moment from 'moment'

export const Loader: React.FC = () => {
  const { goToPage, loadingDb, database } = useContext(AppContext)
  const { publicKey, relayPool, lastEventId, loadingRelayPool } = useContext(RelayPoolContext)
  const theme = useTheme()
  const { t } = useTranslation('common')
  const [profileFound, setProfileFound] = useState<boolean>(false)
  const [contactsCount, setContactsCount] = useState<number>()

  useEffect(() => {
    if (!loadingRelayPool && !loadingDb && publicKey) {
      relayPool?.subscribe('loading-meta', {
        kinds: [EventKind.petNames, EventKind.meta],
        authors: [publicKey],
      })
    }
  }, [loadingRelayPool, publicKey, loadingDb])

  useEffect(() => {
    loadPets()
    loadProfile()
  }, [lastEventId])

  const loadPets: () => void = () => {
    if (database) {
      getUsers(database, { contacts: true }).then((results) => {
        setContactsCount(results.length)
        if (publicKey && results && results.length > 0) {
          const authors = [...results.map((user: User) => user.id), publicKey]
          relayPool?.subscribe('loading-notes', {
            kinds: [EventKind.meta, EventKind.textNote],
            authors,
            since: moment().unix() - 86400 * 2,
          })
        }
      })
    }
  }

  const loadProfile: () => void = () => {
    if (database && publicKey) {
      getUser(publicKey, database).then((result) => {
        if (result) {
          setProfileFound(true)
        }
      })
    }
  }

  const styles = StyleSheet.create({
    container: {
      padding: 32,
    },
    text: {
      marginVertical: 10,
      padding: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    action: {
      backgroundColor: 'transparent',
      marginTop: 12,
    },
  })

  return (
    <>
      <Layout style={styles.text}>
        <Text>{profileFound ? t('loader.profileFound') : t('loader.searchingProfile')}</Text>
        <Text>{`${t('loader.searchingContacts')} ${contactsCount}`}</Text>
      </Layout>
      <Layout>
        <Text>{t('loader.help1')}</Text>
        <Text>{t('loader.help2')}</Text>
      </Layout>
      <Layout style={styles.action}>
        <Button
          onPress={() => goToPage('relays')}
          status='warning'
          accessoryLeft={<Icon name='server' size={16} color={theme['text-basic-color']} solid />}
        >
          {t('loader.relays')}
        </Button>
      </Layout>
      <Layout style={styles.action}>
        <Button
          onPress={() => goToPage('home')}
          accessoryLeft={<Icon name='home' size={16} color={theme['text-basic-color']} solid />}
        >
          {t('loader.home')}
        </Button>
      </Layout>
    </>
  )
}

export default Loader
