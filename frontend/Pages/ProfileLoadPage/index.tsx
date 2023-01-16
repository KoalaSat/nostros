import React, { useContext, useEffect, useState } from 'react'
import { RelayPoolContext } from '../../Contexts/RelayPoolContext'
import { EventKind } from '../../lib/nostr/Events'
import { AppContext } from '../../Contexts/AppContext'
import { UserContext } from '../../Contexts/UserContext'
import { getUsers, User } from '../../Functions/DatabaseFunctions/Users'
import { useTranslation } from 'react-i18next'
import moment from 'moment'
import { StyleSheet, View } from 'react-native'
import Logo from '../../Components/Logo'
import { Button, Snackbar, Text } from 'react-native-paper'
import { navigate } from '../../lib/Navigation'

export const ProfileLoadPage: React.FC = () => {
  const { loadingDb, database } = useContext(AppContext)
  const { relayPool, lastEventId, loadingRelayPool } = useContext(RelayPoolContext)
  const { publicKey, reloadUser, user } = useContext(UserContext)
  const { t } = useTranslation('common')
  const [profileFound, setProfileFound] = useState<boolean>(false)
  const [contactsCount, setContactsCount] = useState<number>(0)

  useEffect(() => {
    if (!loadingRelayPool && !loadingDb && publicKey) {
      relayPool?.subscribe('loading-meta', [
        {
          kinds: [EventKind.meta],
          authors: [publicKey],
        },
      ])
      relayPool?.subscribe('loading-pets', [
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
  }, [loadingRelayPool, publicKey, loadingDb])

  useEffect(() => {
    loadPets()
    reloadUser()
  }, [lastEventId])

  useEffect(() => {
    if (user) setProfileFound(true)
  }, [user])

  const loadPets: () => void = () => {
    if (database && publicKey) {
      getUsers(database, { contacts: true }).then((results) => {
        if (results && results.length > 0) {
          reloadUser()
          setContactsCount(results.length)
          const authors = [...results.map((user: User) => user.id), publicKey]
          relayPool?.subscribe('loading-notes', [
            {
              kinds: [EventKind.meta, EventKind.textNote],
              authors,
              since: moment().unix() - 86400,
            },
          ])
        }
      })
    }
  }

  return (
    <View style={styles.container}>
      <Logo onlyIcon size='medium' />
      <Text variant='titleMedium'>
        {profileFound ? t('profileLoadPage.foundProfile') : t('profileLoadPage.searchingProfile')}
      </Text>
      <Text variant='titleMedium'>{t('profileLoadPage.foundContacts', { contactsCount })}</Text>
      <Button mode='contained' onPress={() => navigate('Feed')}>
        {t('profileLoadPage.home')}
      </Button>
      <Snackbar
        style={styles.snackbar}
        visible
        onDismiss={() => {}}
        action={{ label: t('profileLoadPage.relays') ?? '', onPress: () => navigate('Relays') }}
      >
        {t('profileLoadPage.relaysDescripion')}
      </Snackbar>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  snackbar: {
    top: 150,
    flexDirection: 'column',
  },
})

export default ProfileLoadPage
