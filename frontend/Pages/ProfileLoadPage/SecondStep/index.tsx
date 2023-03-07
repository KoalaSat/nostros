import { getUnixTime } from 'date-fns'
import { Kind } from 'nostr-tools'
import React, { useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { Button, Text } from 'react-native-paper'
import Logo from '../../../Components/Logo'
import { AppContext } from '../../../Contexts/AppContext'
import { RelayPoolContext } from '../../../Contexts/RelayPoolContext'
import { UserContext } from '../../../Contexts/UserContext'
import { getUsers, User } from '../../../Functions/DatabaseFunctions/Users'

interface SecondStepProps {
  nextStep: () => void
}

export const SecondStep: React.FC<SecondStepProps> = ({ nextStep }) => {
  const { t } = useTranslation('common')
  const { database } = useContext(AppContext)
  const { relayPool, relayPoolReady, lastEventId } = useContext(RelayPoolContext)
  const { publicKey, setUserState } = useContext(UserContext)
  const [contactsCount, setContactsCount] = useState<number>()

  React.useEffect(() => {
    setTimeout(loadData, 1500)
  }, [])

  useEffect(() => {
    if (publicKey && relayPoolReady && database) {
      loadPets()
    }
  }, [publicKey, lastEventId])

  const loadData: () => void = () => {
    if (publicKey && relayPoolReady) {
      relayPool?.subscribe('profile-load-contacts', [
        {
          kinds: [Kind.Contacts],
          authors: [publicKey],
        },
      ])
      relayPool?.subscribe('profile-load-others', [
        {
          kinds: [Kind.ChannelCreation, Kind.ChannelMetadata],
          authors: [publicKey],
        },
        {
          kinds: [1002],
          authors: [publicKey],
          limit: 1,
        },
        {
          kinds: [10000],
          authors: [publicKey],
          limit: 1,
        },
        {
          kinds: [10001],
          authors: [publicKey],
          limit: 1,
        },
        {
          kinds: [3001],
          authors: [publicKey],
          limit: 1,
        },
      ])
    }
  }

  const loadPets: () => void = () => {
    if (database && publicKey && relayPoolReady) {
      getUsers(database, {}).then((results) => {
        if (results.length > 0) {
          setContactsCount(results.filter((user) => user.contact).length)
          const authors = [...results.map((user: User) => user.id), publicKey]
          relayPool?.subscribe('profile-load-notes', [
            {
              kinds: [Kind.Metadata, 10002],
              authors,
            },
            {
              kinds: [Kind.Text],
              authors,
              since: getUnixTime(new Date()) - 43200,
            },
          ])
        }
      })
    }
  }

  return (
    <View style={styles.container}>
      <View>
        <View style={styles.logo}>
          <Logo onlyIcon size='medium' />
        </View>
        <View style={styles.loadingProfile}>
          {!contactsCount && (
            <ActivityIndicator animating={true} style={styles.activityIndicator} />
          )}
          <Text variant='titleMedium' style={styles.center}>
            {contactsCount
              ? t('profileLoadPage.foundContacts', { contactsCount })
              : t('profileLoadPage.searchingContacts')}
          </Text>
        </View>
      </View>
      <View style={styles.buttons}>
        <Button mode='outlined' onPress={() => {}}>
          {t('profileLoadPage.retry')}
        </Button>
        <Button mode='contained' onPress={() => setUserState('ready')}>
          {t('profileLoadPage.home')}
        </Button>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    justifyContent: 'space-between',
    flex: 1,
  },
  buttons: {
    height: 120,
    justifyContent: 'space-between',
  },
  logo: {
    justifyContent: 'center',
    alignContent: 'center',
    flexDirection: 'row',
  },
  center: {
    alignContent: 'center',
    textAlign: 'center',
  },
  loadingProfile: {
    justifyContent: 'center',
    alignContent: 'center',
    flexDirection: 'row',
  },
  activityIndicator: {
    paddingRight: 16,
  },
})

export default SecondStep
