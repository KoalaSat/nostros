import React, { useContext, useEffect, useState } from 'react'
import { generateRandomKey } from '../../lib/nostr/Bip'
import { Clipboard, StyleSheet, View } from 'react-native'
import { Button, Snackbar, Text, TextInput } from 'react-native-paper'
import { useTranslation } from 'react-i18next'
import { nsecEncode } from 'nostr-tools/nip19'
import { DrawerNavigationHelpers } from '@react-navigation/drawer/lib/typescript/src/types'
import { UserContext } from '../../Contexts/UserContext'
import NostrosNotification from '../../Components/NostrosNotification'

interface ProfileCreatePageProps {
  navigation: DrawerNavigationHelpers
}

export const ProfileCreatePage: React.FC<ProfileCreatePageProps> = ({ navigation }) => {
  const { t } = useTranslation('common')
  const { setPrivateKey } = useContext(UserContext)
  const [key, setKey] = useState<string>()
  const [inputValue, setInputValue] = useState<string>()
  const [copied, setCopied] = useState<boolean>(false)
  const [showNotification, setShowNotification] = useState<string>()

  useEffect(() => {
    generateRandomKey().then((string) => {
      setKey(string)
      const nsec = nsecEncode(string)
      setInputValue(nsec)
    })
  }, [])

  const copyContent: () => void = () => {
    if (inputValue) {
      Clipboard.setString(inputValue)
      setCopied(true)
      setShowNotification('copied')
    }
  }

  const onPress: () => void = () => {
    setPrivateKey(key)
    navigation.jumpTo('Feed')
  }

  return (
    <View style={styles.container}>
      <View>
        <TextInput
          mode='outlined'
          label={t('profileCreatePage.label') ?? ''}
          onChangeText={setInputValue}
          value={inputValue}
          secureTextEntry={true}
          editable={false}
          right={
            <TextInput.Icon
              icon={'content-copy'}
              onPress={copyContent}
              forceTextInputFocus={false}
            />
          }
        />
        <Button mode='contained' onPress={onPress} disabled={!copied}>
          {t('profileCreatePage.accessButton')}
        </Button>
      </View>
      <Snackbar
        style={styles.snackbar}
        visible
        onDismiss={copyContent}
        action={{ label: t('profileCreatePage.snackbarAction') ?? '', onPress: copyContent }}
      >
        
        {t('profileCreatePage.snackbarDescription')}
      </Snackbar>
      {showNotification && (
        <NostrosNotification
          showNotification={showNotification}
          setShowNotification={setShowNotification}
        >
          <Text>{t(`relaysPage.notifications.${showNotification}`)}</Text>
          <Text>{t('relaysPage.notifications.description')}</Text>
        </NostrosNotification>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    justifyContent: 'center',
  },
  snackbar: {
    top: 150,
    flexDirection: 'column',
  },
})

export default ProfileCreatePage
