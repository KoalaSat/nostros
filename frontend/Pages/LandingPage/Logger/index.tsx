import React, { useContext, useState } from 'react'
import { Button, Input, Layout, useTheme } from '@ui-kitten/components'
import { Clipboard, StyleSheet } from 'react-native'
import { RelayPoolContext } from '../../../Contexts/RelayPoolContext'
import { useTranslation } from 'react-i18next'
import Icon from 'react-native-vector-icons/FontAwesome5'
import { generateRandomKey } from '../../../lib/nostr/Bip'
import { showMessage } from 'react-native-flash-message'
import { getNip19Key, isPrivateKey, isPublicKey } from '../../../lib/nostr/Nip19'

export const Logger: React.FC = () => {
  const { publicKey, setPrivateKey, setPublicKey } = useContext(RelayPoolContext)
  const { t } = useTranslation('common')
  const theme = useTheme()
  const [isPrivate, setIsPrivate] = useState<boolean>(true)
  const [inputValue, setInputValue] = useState<string>('')

  const onPress: () => void = () => {
    if (inputValue && inputValue !== '') {
      const isBenchPrivate = isPrivateKey(inputValue)
      const isBenchPublic = isPublicKey(inputValue)
      if (isBenchPrivate) setIsPrivate(true)
      if (isBenchPublic) setIsPrivate(false)

      const key = getNip19Key(inputValue)

      if ((isPrivate && !isBenchPublic) || isBenchPrivate) {
        setPrivateKey(key)
      } else {
        setPublicKey(key)
      }
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

  return (
    <>
      <Layout style={styles.inputsContainer}>
        <Layout style={styles.input}>
          <Input
            size='medium'
            label={label}
            onChangeText={setInputValue}
            value={inputValue}
            disabled={publicKey !== undefined}
            accessoryRight={randomKeyGenerator}
          />
        </Layout>
      </Layout>
      <Layout style={styles.buttonssContainer}>
        <Layout style={styles.buttonLeft}>
          <Button
            onPress={() => {
              setIsPrivate(!isPrivate)
              setInputValue('')
            }}
            disabled={publicKey !== undefined}
            accessoryLeft={keyButton}
            status={isPrivate ? 'warning' : 'default'}
          />
        </Layout>
        <Layout style={styles.buttonRight}>
          <Button onPress={onPress} disabled={publicKey !== undefined}>
            {t('landing.connect')}
          </Button>
        </Layout>
      </Layout>
    </>
  )
}

export default Logger
