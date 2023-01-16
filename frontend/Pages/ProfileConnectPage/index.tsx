import React, { useContext, useEffect, useState } from 'react'
import { Clipboard, StyleSheet, View } from 'react-native'
import { UserContext } from '../../Contexts/UserContext'
import { useTranslation } from 'react-i18next'
import { getNip19Key, isPrivateKey, isPublicKey } from '../../lib/nostr/Nip19'
import { Button, Switch, Text, TextInput } from 'react-native-paper'
import Logo from '../../Components/Logo'
import { navigate } from '../../lib/Navigation'

export const ProfileConnectPage: React.FC = () => {
  const { setPrivateKey, setPublicKey } = useContext(UserContext)
  const { t } = useTranslation('common')
  const [isNip19, setIsNip19] = useState<boolean>(false)
  const [isPublic, setIsPublic] = useState<boolean>(false)
  const [inputValue, setInputValue] = useState<string>('')

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

      if (isPublic) {
        setPublicKey(key)
      } else {
        setPrivateKey(key)
      }

      navigate('ProfileLoad')
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
        <Logo size='medium' />
        <View>
          <TextInput
            mode='outlined'
            label={label}
            onChangeText={setInputValue}
            value={inputValue}
            secureTextEntry={!isPublic}
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
        <View>
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
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
})

export default ProfileConnectPage
