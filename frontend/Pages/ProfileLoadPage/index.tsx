import React, { useContext, useEffect, useState } from 'react'
import { RelayPoolContext } from '../../Contexts/RelayPoolContext'
import { EventKind } from '../../lib/nostr/Events'
import { AppContext } from '../../Contexts/AppContext'
import { getUser, getUsers, User } from '../../Functions/DatabaseFunctions/Users'
import { useTranslation } from 'react-i18next'
import moment from 'moment'
import { StyleSheet, View } from 'react-native'
import Logo from '../../Components/Logo'
import { Button, Snackbar, Text } from 'react-native-paper'
import { DrawerNavigationHelpers } from '@react-navigation/drawer/lib/typescript/src/types'

interface ProfileLoadPageProps {
  navigation: DrawerNavigationHelpers;
}

export const ProfileLoadPage: React.FC<ProfileLoadPageProps> = ({navigation}) => {
  const { loadingDb, database } = useContext(AppContext)
  const { publicKey, relayPool, lastEventId, loadingRelayPool } = useContext(RelayPoolContext)
  const { t } = useTranslation('common')
  const [profileFound, setProfileFound] = useState<boolean>(false)
  const [contactsCount, setContactsCount] = useState<number>()

  useEffect(() => {
    if (!loadingRelayPool && !loadingDb && publicKey) {
      relayPool?.subscribe('loading-meta', [
        {
          kinds: [EventKind.petNames, EventKind.meta],
          authors: [publicKey],
        },
      ])
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

  const loadProfile: () => void = () => {
    if (database && publicKey) {
      getUser(publicKey, database).then((result) => {
        if (result) {
          setProfileFound(true)
        }
      })
    }
  }

  return (
    <View style={styles.container}>
      <Logo onlyIcon size='medium'/>
      <Text variant='titleMedium'>
        {profileFound ? t('profileLoadPage.foundProfile') : t('profileLoadPage.searchingProfile')}
      </Text>
      <Text variant='titleMedium'>
        {t('profileLoadPage.foundContacts', { contactsCount })}
      </Text>
      <Button mode='contained' onPress={() => navigation}>
        {t('profileLoadPage.home')}
      </Button>

      <Snackbar
        style={styles.snackbar}
        visible
        onDismiss={() => {}}
        action={{label: t('profileLoadPage.relays') ?? '', onPress: () => navigation.navigate('Relays')}}
      >
        Conéctate a otros relays si tienes problemas encontrando tus datos.
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
