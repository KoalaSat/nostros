import React, { useContext, useEffect, useState } from 'react'
import { generateRandomKey } from '../../lib/nostr/Bip'
import { Clipboard, StyleSheet, View } from 'react-native'
import { Button, Text, TextInput, useTheme } from 'react-native-paper'
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
  const theme = useTheme()

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
        <Button style={styles.button} mode='contained' compact onPress={onPress} disabled={!copied}>
          {t('profileCreatePage.accessButton')}
        </Button>
        <View style={[styles.warning, { backgroundColor: theme.colors.warningContainer }]}>
          <Text variant='titleSmall' style={[styles.warningTitle, {color: theme.colors.onWarningContainer}]}>
            {t('profileCreatePage.warningTitle')}
          </Text>
          <Text style={{color: theme.colors.onWarningContainer}}>
            {t('profileCreatePage.warningDescription')}
          </Text>
          <View style={styles.warningActionOuterLayout}>
            <Button
                style={styles.warningAction}
                mode='text'
                onPress={copyContent}>
              {t('profileCreatePage.warningAction')}
            </Button>
          </View>
        </View>
      </View>
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
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  button: {
    marginBottom: 24,
    marginTop: 24,
  },
  warning: {
    borderRadius: 4,
    padding: 16,
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

export default ProfileCreatePage
