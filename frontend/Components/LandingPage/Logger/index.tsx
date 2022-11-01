import React, { useContext, useEffect, useState } from 'react'
import { Button, Input, Layout, useTheme } from '@ui-kitten/components'
import { Clipboard, StyleSheet } from 'react-native'
import { RelayPoolContext } from '../../../Contexts/RelayPoolContext'
import { useTranslation } from 'react-i18next'
import { tagToUser } from '../../../Functions/RelayFunctions/Users'
import Relay from '../../../lib/nostr/Relay'
import { Event, EventKind } from '../../../lib/nostr/Events'
import { AppContext } from '../../../Contexts/AppContext'
import { insertUserContact } from '../../../Functions/DatabaseFunctions/Users'
import SInfo from 'react-native-sensitive-info'
import Icon from 'react-native-vector-icons/FontAwesome5'
import { generateRandomKey, getPublickey } from '../../../lib/nostr/Bip'
import { showMessage } from 'react-native-flash-message'

export const Logger: React.FC = () => {
  const { database, goToPage } = useContext(AppContext)
  const { privateKey, publicKey, relayPool, setPrivateKey, setPublicKey } =
    useContext(RelayPoolContext)
  const { t } = useTranslation('common')
  const theme = useTheme()
  const [loading, setLoading] = useState<boolean>(false)
  const [status, setStatus] = useState<number>(0)
  const [isPrivate, setIsPrivate] = useState<boolean>(true)
  const [totalPets, setTotalPets] = useState<number>()
  const [inputValue, setInputValue] = useState<string>('')
  const [loadedUsers, setLoadedUsers] = useState<number>()

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
    if (status) {
      const timer = setTimeout(() => setStatus(3), 8000)
      return () => {
        clearTimeout(timer)
      }
    }
  }, [status])

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

  const randomKeyGenerator: () => JSX.Element = () => {
    if (!isPrivate) return <></>

    const storeRandomPrivateKey: () => void = () => {
      generateRandomKey().then((string) => {
        setInputValue(string)
        Clipboard.setString(string)
        showMessage({
          message: t('logger.randomKeyGenerator.message'),
          description: t('logger.randomKeyGenerator.description'),
          duration: 8000,
          type: 'info',
        })
      })
    }

    return (
      <Icon
        name={'dice'}
        size={16}
        color={theme['text-basic-color']}
        solid
        onPress={storeRandomPrivateKey}
      />
    )
  }

  const onPress: () => void = () => {
    if (inputValue && inputValue !== '') {
      setLoading(true)
      setStatus(1)
      if (isPrivate) {
        setPrivateKey(inputValue)
        const publicKey: string = getPublickey(inputValue)
        setPublicKey(publicKey)
        SInfo.setItem('privateKey', inputValue, {})
        SInfo.setItem('publicKey', publicKey, {})
      } else {
        setPublicKey(inputValue)
        SInfo.setItem('publicKey', inputValue, {})
      }
    }
  }

  const statusName: { [status: number]: string } = {
    0: t('landing.connect'),
    1: t('landing.connecting'),
    2: t('landing.loadingContacts'),
    3: t('landing.ready'),
  }
  const styles = StyleSheet.create({
    inputsContainer: {
      flexDirection: 'row',
      marginVertical: 10,
      padding: 32,
    },
    buttonssContainer: {
      flexDirection: 'row',
      paddingLeft: 32,
      paddingRight: 32,
    },
    input: {
      flex: 4,
    },
    buttonLeft: {
      flex: 3,
      paddingRight: 16,
    },
    buttonRight: {
      flex: 3,
      paddingLeft: 16,
    },
  })

  const keyButton = (
    <Icon name={isPrivate ? 'lock' : 'eye'} size={16} color={theme['text-basic-color']} solid />
  )

  return !privateKey || !publicKey || status !== 0 ? (
    <>
      <Layout style={styles.inputsContainer}>
        <Layout style={styles.input}>
          <Input
            size='medium'
            label={isPrivate ? t('landing.privateKey') : t('landing.publicKey')}
            onChangeText={setInputValue}
            value={inputValue}
            disabled={loading}
            accessoryRight={randomKeyGenerator}
          />
        </Layout>
      </Layout>
      <Layout style={styles.buttonssContainer}>
        <Layout style={styles.buttonLeft}>
          <Button
            onPress={() => setIsPrivate(!isPrivate)}
            disabled={loading}
            accessoryLeft={keyButton}
            status={isPrivate ? 'warning' : 'default'}
          />
        </Layout>
        <Layout style={styles.buttonRight}>
          <Button onPress={onPress} disabled={loading}>
            {statusName[status]}
          </Button>
        </Layout>
      </Layout>
    </>
  ) : (
    <></>
  )
}

export default Logger
