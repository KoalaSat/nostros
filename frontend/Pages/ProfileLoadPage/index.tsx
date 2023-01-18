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
import { Button, Text, useTheme } from 'react-native-paper'
import { navigate } from '../../lib/Navigation'
import { useFocusEffect } from '@react-navigation/native'

export const ProfileLoadPage: React.FC = () => {
  const theme = useTheme()
  const { database } = useContext(AppContext)
  const { relayPool, lastEventId } = useContext(RelayPoolContext)
  const { publicKey, reloadUser, user, setUserState } = useContext(UserContext)
  const { t } = useTranslation('common')
  const [profileFound, setProfileFound] = useState<boolean>(false)
  const [contactsCount, setContactsCount] = useState<number>(0)

  useFocusEffect(
    React.useCallback(() => {
      console.log('FOCUS ProfileLoadPage')
      if (publicKey) {
        relayPool?.subscribe('loading-meta', [
          {
            kinds: [EventKind.meta],
            authors: [publicKey],
          },
        ])
      }

      return () => relayPool?.unsubscribeAll()
    }, []),
  )

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
      <View style={styles.info}>
        <Logo onlyIcon size='medium' />
        <Text variant='titleMedium' style={styles.center}>
          {profileFound ? t('profileLoadPage.foundProfile') : t('profileLoadPage.searchingProfile')}
        </Text>
        <Text variant='titleMedium' style={styles.center}>
          {t('profileLoadPage.foundContacts', { contactsCount })}
        </Text>
        <Button mode='contained' onPress={() => setUserState('ready')}>
          {t('profileLoadPage.home')}
        </Button>
      </View>
      <View style={[styles.warning, { backgroundColor: theme.colors.primaryContainer }]}>
        <Text>{t('profileLoadPage.relaysDescripion')}</Text>
        <View style={styles.warningActionOuterLayout}>
          <Button style={styles.warningAction} mode='text' onPress={() => navigate('Relays')}>
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
})

export default ProfileLoadPage
