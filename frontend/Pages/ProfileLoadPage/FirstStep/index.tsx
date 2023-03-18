import React, { useContext, useEffect, useState } from 'react'
import { RelayPoolContext } from '../../../Contexts/RelayPoolContext'
import { Kind } from 'nostr-tools'
import { UserContext } from '../../../Contexts/UserContext'
import { StyleSheet, View } from 'react-native'
import { ActivityIndicator, Button, Card, Divider, Text, useTheme } from 'react-native-paper'
import { useTranslation } from 'react-i18next'
import { AppContext } from '../../../Contexts/AppContext'
import {
  getRelayMetadata,
  type RelayMetadata,
} from '../../../Functions/DatabaseFunctions/RelayMetadatas'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'

interface FirstStepProps {
  nextStep: () => void
  skip: () => void
}

export const FirstStep: React.FC<FirstStepProps> = ({ nextStep, skip }) => {
  const theme = useTheme()
  const { t } = useTranslation('common')
  const { database } = useContext(AppContext)
  const {
    relayPool,
    relays,
    relayPoolReady,
    lastEventId,
    removeRelayItem,
    addRelayItem,
    createRandomRelays,
  } = useContext(RelayPoolContext)
  const { publicKey, reloadUser, name } = useContext(UserContext)
  const [profileFound, setProfileFound] = useState<boolean>(false)
  const [activeRelays, setActiveRelays] = React.useState<number>()
  const [metadata, setMetadata] = React.useState<RelayMetadata>()

  const loadMeta: () => void = () => {
    if (publicKey && relayPoolReady) {
      relayPool?.subscribe('profile-load-meta', [
        {
          kinds: [Kind.Metadata, 10002],
          authors: [publicKey],
        },
      ])
    }
  }

  React.useEffect(() => {
    setActiveRelays(relays.filter((relay) => relay.active).length)
  }, [relays])

  React.useEffect(() => {
    if (activeRelays !== undefined && relayPoolReady) {
      if (activeRelays === 0) {
        createRandomRelays()
      } else if (activeRelays > 7) {
        setTimeout(loadMeta, 1500)
      }
    }
  }, [activeRelays, relayPoolReady])

  useEffect(() => {
    if (publicKey && relayPoolReady && database) {
      reloadUser()
      getRelayMetadata(database, publicKey).then(setMetadata)
    }
  }, [publicKey, relayPoolReady, database, lastEventId])

  useEffect(() => {
    if (name) setProfileFound(true)
  }, [name])

  const finish: () => void = () => {
    if (metadata) {
      relays.forEach((relay) => {
        removeRelayItem(relay)
      })
      metadata.tags.forEach(async (tag) => {
        if (tag[0] === 'r') await addRelayItem({ url: tag[1] })
      })
      nextStep()
    }
  }

  const reconnectRelays: () => void = () => {
    relayPool?.unsubscribeAll()
    relays.forEach((relay) => {
      removeRelayItem(relay)
    })
  }

  return (
    <View style={styles.container}>
      <View>
        <View style={styles.loadingProfile}>
          <Text variant='titleMedium'>{t('profileLoadPage.connectingRandomRelays')}</Text>
        </View>
        <View style={styles.loadingProfile}>
          <Text style={{ color: theme.colors.onSurfaceVariant }}>
            {t('profileLoadPage.connectingRandomRelaysDescription')}
          </Text>
        </View>
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.loadingProfile}>
              <Text>{t('profileLoadPage.randomRelays')}</Text>
              <Text style={{ color: '#7ADC70' }}>
                {t('profileLoadPage.connectedRelays', { activeRelays })}
              </Text>
            </View>
            <View style={styles.loadingProfile}>
              <Text>{t('profileLoadPage.myProfile')}</Text>
              {profileFound ? (
                <MaterialCommunityIcons
                  style={{ color: '#7ADC70' }}
                  name='check-circle-outline'
                  size={20}
                />
              ) : (
                <ActivityIndicator animating={true} size={20} />
              )}
            </View>
            <View style={styles.loadingProfile}>
              <Text>{t('profileLoadPage.myRelays')}</Text>
              {metadata ? (
                <MaterialCommunityIcons
                  style={{ color: '#7ADC70' }}
                  name='check-circle-outline'
                  size={20}
                />
              ) : (
                <ActivityIndicator animating={true} size={20} />
              )}
            </View>
            <Divider style={styles.loadingProfile} />
            <View style={styles.loadingProfile}>
              <Text>{t('profileLoadPage.relaysTooLong')}</Text>
            </View>
            <View>
              <Button onPress={reconnectRelays}>{t('profileLoadPage.relaysReconnect')}</Button>
            </View>
          </Card.Content>
        </Card>
        <View style={styles.loadingProfile}>
          <Text style={{ color: theme.colors.onSurfaceVariant }} variant='titleMedium'>
            {t('profileLoadPage.searchContacts')}
          </Text>
        </View>
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
        <Button mode='contained' onPress={finish} disabled={!profileFound}>
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

export default FirstStep
