import React, { useContext, useEffect, useState } from 'react'
import { RelayPoolContext } from '../../../Contexts/RelayPoolContext'
import { Kind } from 'nostr-tools'
import { UserContext } from '../../../Contexts/UserContext'
import { StyleSheet, View } from 'react-native'
import Logo from '../../../Components/Logo'
import { ActivityIndicator, Button, Text } from 'react-native-paper'
import { useTranslation } from 'react-i18next'
import { AppContext } from '../../../Contexts/AppContext'
import {
  getRelayMetadata,
  type RelayMetadata,
} from '../../../Functions/DatabaseFunctions/RelayMetadatas'

interface FirstStepProps {
  nextStep: () => void
}

export const FirstStep: React.FC<FirstStepProps> = ({ nextStep }) => {
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
  const { publicKey, reloadUser, setUserState, name } = useContext(UserContext)
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
      <View style={styles.main}>
        <View style={styles.loadingProfile}>
          <Text variant='titleMedium'>{t('profileLoadPage.connectedRelays')}</Text>
          <Text variant='titleMedium' style={{ color: '#7ADC70' }}>
            {activeRelays}
          </Text>
        </View>
        <View style={styles.logo}>
          <Logo onlyIcon size='medium' />
        </View>
        <View style={styles.loadingProfile}>
          {!profileFound && <ActivityIndicator animating={true} style={styles.activityIndicator} />}
          <Text variant='titleMedium' style={styles.center}>
            {profileFound
              ? t('profileLoadPage.foundProfile')
              : t('profileLoadPage.searchingProfile')}
          </Text>
        </View>
        <View style={styles.loadingProfile}>
          {!metadata && <ActivityIndicator animating={true} style={styles.activityIndicator} />}
          <Text variant='titleMedium' style={styles.center}>
            {metadata ? t('profileLoadPage.foundRelays') : t('profileLoadPage.searchingRelays')}
          </Text>
        </View>
      </View>
      <View style={styles.buttons}>
        <Button mode='outlined' onPress={() => reconnectRelays()}>
          {t('profileLoadPage.reconnectOther')}
        </Button>
        <Button mode='contained' onPress={finish} disabled={!profileFound}>
          {t('profileLoadPage.nextStep')}
        </Button>
        <Button mode='outlined' onPress={() => setUserState('ready')}>
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
  main: {
    height: 160,
  },
  buttons: {
    height: 160,
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

export default FirstStep
