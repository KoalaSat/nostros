import React, { useContext, useEffect, useState } from 'react'
import { Button, Input } from '@ui-kitten/components'
import { StyleSheet } from 'react-native'
import { RelayPoolContext } from '../../../Contexts/RelayPoolContext'
import { useTranslation } from 'react-i18next'
import { tagToUser } from '../../../Functions/RelayFunctions/Users'
import Relay from '../../../lib/nostr/Relay'
import { Event, EventKind } from '../../../lib/nostr/Events'
import { AppContext } from '../../../Contexts/AppContext'
import { insertUserContact } from '../../../Functions/DatabaseFunctions/Users'
// import EncryptedStorage from 'react-native-encrypted-storage';

export const Logger: React.FC = () => {
  const { database, goToPage } = useContext(AppContext)
  const { privateKey, publicKey, relayPool, setPrivateKey } = useContext(RelayPoolContext)
  const { t } = useTranslation('common')
  const [loading, setLoading] = useState<boolean>(false)
  const [status, setStatus] = useState<number>(0)
  const [totalPets, setTotalPets] = useState<number>()
  const [inputValue, setInputValue] = useState<string>('')
  const [loadedUsers, setLoadedUsers] = useState<number>()
  const styles = StyleSheet.create({
    input: {
      marginVertical: 2,
      padding: 32,
    },
  })

  useEffect(() => {
    if (relayPool && publicKey) {
      relayPool?.unsubscribeAll()
      setStatus(1)
      initEvents()
      relayPool?.subscribe('main-channel', {
        kinds: [EventKind.petNames],
        authors: [publicKey],
      })
    }
  }, [relayPool, publicKey])

  useEffect(() => {
    if (status > 2) {
      relayPool?.removeOn('event', 'landing')
      goToPage('home', true)
    }
  }, [status])

  useEffect(() => {
    if (loadedUsers) {
      const timer = setTimeout(() => setStatus(3), 4000)
      return () => {
        clearTimeout(timer)
      }
    }
  }, [loadedUsers])

  const initEvents: () => void = () => {
    relayPool?.on('event', 'landing', (_relay: Relay, _subId?: string, event?: Event) => {
      console.log('LANDING EVENT =======>', event)
      if (event && database) {
        if (event.kind === EventKind.petNames) {
          loadPets(event)
        } else if (event.kind === EventKind.meta) {
          setLoadedUsers((prev) => (prev ? prev + 1 : 1))
          if (loadedUsers && loadedUsers - 1 === totalPets) setStatus(3)
        }
      }
    })
  }

  const loadPets: (event: Event) => void = (event) => {
    if (database) {
      setTotalPets(event.tags.length)
      if (event.tags.length > 0) {
        setStatus(2)
        insertUserContact(event, database).then(() => {
          requestUserData(event)
        })
      } else {
        setStatus(3)
      }
    }
  }

  const requestUserData: (event: Event) => void = (event) => {
    if (publicKey) {
      const authors: string[] = [publicKey, ...event.tags.map((tag) => tagToUser(tag).id)]
      relayPool?.subscribe('main-channel', {
        kinds: [EventKind.meta],
        authors,
      })
    }
  }

  const onPress: () => void = () => {
    if (inputValue && inputValue !== '') {
      setLoading(true)
      setPrivateKey(inputValue)
      setStatus(1)
      // EncryptedStorage.setItem('privateKey', inputValue);
    }
  }

  const statusName: { [status: number]: string } = {
    0: t('landing.connect'),
    1: t('landing.connecting'),
    2: t('landing.loadingContacts'),
    3: t('landing.ready'),
  }

  return !privateKey || status !== 0 ? (
    <>
      <Input
        style={styles.input}
        size='medium'
        label={t('landing.privateKey')}
        secureTextEntry={true}
        onChangeText={setInputValue}
        value={inputValue}
        disabled={loading}
      />
      <Button onPress={onPress} disabled={loading}>
        {statusName[status]}
      </Button>
    </>
  ) : (
    <></>
  )
}

export default Logger
