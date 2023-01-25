import React, { useContext, useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import Clipboard from '@react-native-clipboard/clipboard'
import { UserContext } from '../../Contexts/UserContext'
import { useTranslation } from 'react-i18next'
import { getNip19Key, isPrivateKey, isPublicKey } from '../../lib/nostr/Nip19'
import { Button, Switch, Text, TextInput } from 'react-native-paper'
import Logo from '../../Components/Logo'
import { navigate } from '../../lib/Navigation'
import { useFocusEffect } from '@react-navigation/native'

export const ProfileConnectPage: React.FC = () => {
  const { setPrivateKey, setPublicKey } = useContext(UserContext)
  const { t } = useTranslation('common')
  const [isNip19, setIsNip19] = useState<boolean>(false)
  const [isPublic, setIsPublic] = useState<boolean>(false)
  const [inputValue, setInputValue] = useState<string>('')

  useFocusEffect(
    React.useCallback(() => {
      return () => setInputValue('')
    }, []),
  )

  useEffect(() => checkKey(), [inputValue])

  const checkKey: () => void = () => {
    if (inputValue && inputValue !== '') {
      const isBenchPrivate = isPrivateKey(inputValue)
      const isBenchPublic = isPublicKey(inputValue)
      setIsPublic(!isBenchPrivate && isBenchPublic)
      setIsNip19(isBenchPrivate || isBenchPublic)
    }
  }

  const onPress: () => void = () => {
    if (inputValue && inputValue !== '') {
      const key = isNip19 ? getNip19Key(inputValue) : inputValue
      if (key) {
        if (isPublic) {
          setPublicKey(key)
        } else {
          setPrivateKey(key)
        }
        navigate('ProfileLoad')
      }
    }
  }

  const pasteContent: () => void = () => {
    Clipboard.getString().then((value) => {
      setInputValue(value ?? '')
    })
  }

  const label: string = React.useMemo(
    () => (isPublic ? t('loggerPage.publicKey') : t('loggerPage.privateKey')),
    [isPublic],
  )

  return (
    <>
      <View style={styles.container}>
        <View style={styles.logo}>
          <Logo size='medium' />
        </View>
        <View style={styles.loginMain}>
          <TextInput
            mode='outlined'
            multiline
            label={label}
            onChangeText={setInputValue}
            value={inputValue}
            secureTextEntry={!isPublic}
            style={styles.input}
            right={
              <TextInput.Icon
                icon={inputValue ? 'close-circle-outline' : 'content-paste'}
                onPress={() => (inputValue ? setInputValue('') : pasteContent())}
                forceTextInputFocus={false}
              />
            }
          />
          <Button mode='contained' onPress={onPress}>
            {t('loggerPage.accessButton')}
          </Button>
        </View>
        <View style={styles.loginOptions}>
          <View style={styles.row}>
            <Text>{t('loggerPage.isPublic')}</Text>
            <Switch value={isPublic} onValueChange={() => setIsPublic(!isPublic)} />
          </View>
          <View style={styles.row}>
            <Text>{t('loggerPage.notKeys')}</Text>
            <Button mode='text' onPress={() => navigate('ProfileCreate')}>
              {t('loggerPage.createButton')}
            </Button>
          </View>
        </View>
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  logo: {
    justifyContent: 'center',
    alignContent: 'center',
    flexDirection: 'row',
  },
  loginMain: {
    flex: 1,
    justifyContent: 'center',
  },
  input: {
    marginBottom: 16,
    marginTop: 16,
  },
  loginOptions: {
    marginTop: 16,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 56,
    justifyContent: 'space-between',
  },
})

export default ProfileConnectPage
