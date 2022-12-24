import React, { useContext, useEffect, useState } from 'react'
import { Button, Input, Layout, useTheme } from '@ui-kitten/components'
import { Clipboard, StyleSheet } from 'react-native'
import { RelayPoolContext } from '../../../Contexts/RelayPoolContext'
import { useTranslation } from 'react-i18next'
import { EventKind } from '../../../lib/nostr/Events'
import { AppContext } from '../../../Contexts/AppContext'
import SInfo from 'react-native-sensitive-info'
import Icon from 'react-native-vector-icons/FontAwesome5'
import { generateRandomKey, getPublickey } from '../../../lib/nostr/Bip'
import { showMessage } from 'react-native-flash-message'
import { getUsers, User } from '../../../Functions/DatabaseFunctions/Users'

export const Logger: React.FC = () => {
  const { goToPage, loadingDb, database } = useContext(AppContext)
  const { privateKey, publicKey, relayPool, loadingRelayPool, setPrivateKey, setPublicKey } =
    useContext(RelayPoolContext)
  const { t } = useTranslation('common')
  const theme = useTheme()
  const [loading, setLoading] = useState<boolean>(false)
  const [status, setStatus] = useState<number>(0)
  const [isPrivate, setIsPrivate] = useState<boolean>(true)
  const [inputValue, setInputValue] = useState<string>('')

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

  useEffect(() => {
    if (!loadingRelayPool && !loadingDb && publicKey) {
      relayPool?.subscribe('main-channel', {
        kinds: [EventKind.petNames, EventKind.meta],
        authors: [publicKey],
      })
      setTimeout(loadPets, 4000)
    }
  }, [loadingRelayPool, publicKey, loadingDb])

  const loadPets: () => void = () => {
    if (database) {
      getUsers(database, { contacts: true }).then((results) => {
        if (results && results.length > 0) {
          relayPool?.subscribe('main-channel', {
            kinds: [EventKind.textNote, EventKind.recommendServer, EventKind.meta],
            authors: results.map((user: User) => user.id),
          })
        }
        setTimeout(() => goToPage('home', true), 5000)
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

  const statusName: { [status: number]: string } = {
    0: t('landing.connect'),
    1: t('landing.connecting'),
    2: t('landing.ready'),
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

  const label: string = isPrivate ? t('landing.privateKey') : t('landing.publicKey')

  return !privateKey || !publicKey || status !== 0 ? (
    <>
      <Layout style={styles.inputsContainer}>
        <Layout style={styles.input}>
          <Input
            size='medium'
            label={label}
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
