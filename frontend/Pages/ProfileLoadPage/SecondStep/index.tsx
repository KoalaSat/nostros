import { Kind } from 'nostr-tools'
import React, { useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { Button, Card, Text, useTheme } from 'react-native-paper'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import { AppContext } from '../../../Contexts/AppContext'
import { RelayPoolContext } from '../../../Contexts/RelayPoolContext'
import { UserContext } from '../../../Contexts/UserContext'
import { getUsers, type User } from '../../../Functions/DatabaseFunctions/Users'

interface SecondStepProps {
  nextStep: () => void
  skip: () => void
}

export const SecondStep: React.FC<SecondStepProps> = ({ nextStep, skip }) => {
  const theme = useTheme()
  const { t } = useTranslation('common')
  const { database } = useContext(AppContext)
  const { relayPool, relayPoolReady, lastEventId, relays } = useContext(RelayPoolContext)
  const { publicKey } = useContext(UserContext)
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
        {
          kinds: [Kind.ChannelCreation, Kind.ChannelMetadata],
          authors: [publicKey],
        },
        {
          kinds: [10000],
          limit: 1,
          authors: [publicKey],
        },
        {
          kinds: [10003],
          limit: 1,
          authors: [publicKey],
        },
        {
          kinds: [30001],
          limit: 1,
          authors: [publicKey],
        },
      ])
    }
  }

  const loadPets: () => void = () => {
    if (database && publicKey && relayPoolReady) {
      getUsers(database, {}).then((results) => {
        if (results.length > 0) {
          setContactsCount(results.filter((user) => user.contact).length)
          const authors = [...results.map((user: User) => user.id)]
          relayPool?.subscribe('profile-load-contacts', [
            {
              kinds: [10002],
              authors,
            },
          ])
        }
      })
    }
  }

  return (
    <View style={styles.container}>
      <View>
        <View style={styles.loadingProfile}>
          <Text style={{ color: theme.colors.onSurfaceVariant }} variant='titleMedium'>
            {t('profileLoadPage.connectingRandomRelays')}
          </Text>
          <MaterialCommunityIcons
            style={{ color: '#7ADC70' }}
            name='check-circle-outline'
            size={20}
          />
        </View>
        <View style={styles.loadingProfile}>
          <Text variant='titleMedium'>{t('profileLoadPage.searchContacts')}</Text>
        </View>
        <View style={styles.loadingProfile}>
          <Text style={{ color: theme.colors.onSurfaceVariant }}>
            {t('profileLoadPage.searchContactsDescription')}
          </Text>
        </View>
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.loadingProfile}>
              <Text>{t('profileLoadPage.myRelays')}</Text>
              <Text style={{ color: '#7ADC70' }}>
                {t('profileLoadPage.connectedRelays', { activeRelays: relays.length })}
              </Text>
            </View>
            <View style={styles.loadingProfile}>
              <Text>{t('profileLoadPage.contactsCount')}</Text>
              {contactsCount ? (
                <Text>{contactsCount}</Text>
              ) : (
                <ActivityIndicator animating={true} size={20} />
              )}
            </View>
          </Card.Content>
        </Card>
        <View style={styles.loadingProfile}>
          <Text style={{ color: theme.colors.onSurfaceVariant }} variant='titleMedium'>
            {t('profileLoadPage.searchContactsRelays')}
          </Text>
        </View>
      </View>
      <View style={styles.buttons}>
        <Button style={styles.button} mode='outlined' onPress={skip}>
          {t('profileLoadPage.skip')}
        </Button>
        <Button mode='contained' onPress={nextStep} disabled={contactsCount === undefined}>
          {t('profileLoadPage.continue')}
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
    justifyContent: 'space-between',
  },
  button: {
    marginBottom: 16,
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
  card: {
    marginBottom: 16,
  },
  loadingProfile: {
    flexDirection: 'row',
    marginBottom: 16,
    justifyContent: 'space-between',
  },
})

export default SecondStep
