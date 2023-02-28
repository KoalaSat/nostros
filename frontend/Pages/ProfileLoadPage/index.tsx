import React, { useContext, useEffect, useState } from 'react'
import { RelayPoolContext, WebsocketEvent } from '../../Contexts/RelayPoolContext'
import { Kind } from 'nostr-tools'
import { AppContext } from '../../Contexts/AppContext'
import { UserContext } from '../../Contexts/UserContext'
import { getUsers, User } from '../../Functions/DatabaseFunctions/Users'
import { useTranslation } from 'react-i18next'
import getUnixTime from 'date-fns/getUnixTime'
import { DeviceEventEmitter, StyleSheet, View } from 'react-native'
import Logo from '../../Components/Logo'
import { ActivityIndicator, Button, Text, useTheme } from 'react-native-paper'
import { navigate } from '../../lib/Navigation'
import { useFocusEffect } from '@react-navigation/native'
import { formatId } from '../../Functions/RelayFunctions/Users'

export const ProfileLoadPage: React.FC = () => {
  const theme = useTheme()
  const { database } = useContext(AppContext)
  const { relayPool, relayPoolReady } = useContext(RelayPoolContext)
  const { publicKey, reloadUser, setUserState, name } = useContext(UserContext)
  const { t } = useTranslation('common')
  const [profileFound, setProfileFound] = useState<boolean>(false)
  const [contactsCount, setContactsCount] = useState<number>(0)
  const [lastEventId, setLastEventId] = useState<string>('')

  useFocusEffect(
    React.useCallback(() => {
      DeviceEventEmitter.addListener('WebsocketEvent', (event: WebsocketEvent) =>
        setLastEventId(event.eventId),
      )
      setTimeout(() => loadMeta(), 1000)
      reloadUser()
      if (profileFound) loadPets()
      return () =>
        relayPool?.unsubscribe(['profile-load-meta', 'profile-load-notes', 'profile-load-others'])
    }, []),
  )

  useEffect(() => {
    if (!name) reloadUser()
  }, [lastEventId, publicKey, relayPoolReady])

  useEffect(() => {
    if (name) setProfileFound(true)
  }, [name])

  useEffect(() => {
    if (profileFound) loadPets()
  }, [profileFound, publicKey, relayPoolReady])

  useEffect(() => {
    setTimeout(loadMeta, 1000)
  }, [profileFound, publicKey, relayPoolReady])

  const loadMeta: () => void = () => {
    if (publicKey && relayPoolReady) {
      relayPool?.subscribe('profile-load-meta', [
        {
          kinds: [Kind.Metadata, Kind.Contacts],
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
    } else {
      setTimeout(() => loadMeta(), 1000)
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
              kinds: [Kind.Metadata],
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
      <View style={styles.info}>
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
        <Text variant='titleMedium' style={styles.center}>
          {t('profileLoadPage.foundContacts', { contactsCount })}
        </Text>
        {lastEventId && (
          <Text variant='titleMedium' style={styles.center}>
            {t('profileLoadPage.storing', { lastEventId: formatId(lastEventId) })}
          </Text>
        )}
        <Button mode='contained' onPress={() => setUserState('ready')}>
          {t('profileLoadPage.home')}
        </Button>
      </View>
      <View style={[styles.warning, { backgroundColor: theme.colors.primaryContainer }]}>
        <Text>{t('profileLoadPage.relaysDescripion')}</Text>
        <View style={styles.warningActionOuterLayout}>
          <Button
            style={styles.warningAction}
            mode='text'
            onPress={() => {
              reloadUser()
              navigate('Relays')
            }}
          >
            {t('profileLoadPage.relays')}
          </Button>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  info: {
    top: 150,
    height: 220,
    justifyContent: 'space-between',
  },
  container: {
    padding: 16,
    justifyContent: 'space-between',
    flex: 1,
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
  warning: {
    borderRadius: 4,
    padding: 16,
    marginTop: 16,
    marginBottom: 16,
  },
  warningTitle: {
    marginBottom: 8,
  },
  warningAction: {
    marginTop: 16,
  },
  warningActionOuterLayout: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
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

export default ProfileLoadPage
