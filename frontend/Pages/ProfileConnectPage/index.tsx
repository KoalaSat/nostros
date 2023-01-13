import React, { useContext, useState } from 'react'
import { Clipboard, StyleSheet, View } from 'react-native'
import { RelayPoolContext } from '../../Contexts/RelayPoolContext'
import { useTranslation } from 'react-i18next'
import { getNip19Key, isPrivateKey, isPublicKey } from '../../lib/nostr/Nip19'
import { Button, Switch, Text, TextInput } from 'react-native-paper'
import Logo from '../../Components/Logo'

export const ProfileConnectPage: React.FC = () => {
  const { setPrivateKey, setPublicKey } = useContext(RelayPoolContext)
  const { t } = useTranslation('common')
  const [isPublic, setIsPublic] = useState<boolean>(false)
  const [inputValue, setInputValue] = useState<string>('')

  const onPress: () => void = () => {
    if (inputValue && inputValue !== '') {
      const isBenchPrivate = isPrivateKey(inputValue)
      const isBenchPublic = isPublicKey(inputValue)
      if (isBenchPrivate) setIsPublic(true)
      if (isBenchPublic) setIsPublic(false)

      const key = getNip19Key(inputValue)

      if ((!isPublic && !isBenchPublic) || isBenchPrivate) {
        setPrivateKey(key)
      } else {
        setPublicKey(key)
      }
    }
  }

  const pasteContent: () => void = () => {
    Clipboard.getString().then((value) => {
      setInputValue(value ?? '')
    })
    
  }

  const label: string = React.useMemo(() => isPublic ? t('loggerPage.publicKey') : t('loggerPage.privateKey'), [isPublic])

  return (
    <>
      <View style={styles.container}>
        <Logo size='large'/>
        <View>
          <TextInput
            mode='outlined'
            label={label}
            placeholder={t('loggerPage.placeholder') ?? ''}
            onChangeText={setInputValue}
            value={inputValue}
            secureTextEntry={!isPublic}
            right={
              <TextInput.Icon
                icon={inputValue ? 'close-circle-outline' : 'content-paste'}
                onPress={() =>
                  inputValue ? setInputValue('') : pasteContent()
                }
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
            <Switch
              value={isPublic}
              onValueChange={() => setIsPublic(!isPublic)}
            />
          </View>
          <View style={styles.row}>
            <Text>{t('loggerPage.notKeys')}</Text>
            <Button mode='text' onPress={() => console.log('Pressed')}>
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
