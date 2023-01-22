import React, { useContext, useEffect, useState } from 'react'
import { generateRandomKey } from '../../lib/nostr/Bip'
import { StyleSheet, View } from 'react-native'
import Clipboard from '@react-native-clipboard/clipboard'
import { Button, Snackbar, Text, TextInput } from 'react-native-paper'
import { useTranslation } from 'react-i18next'
import { nsecEncode } from 'nostr-tools/nip19'
import { DrawerNavigationHelpers } from '@react-navigation/drawer/lib/typescript/src/types'
import { UserContext } from '../../Contexts/UserContext'

interface ProfileCreatePageProps {
  navigation: DrawerNavigationHelpers
}

export const ProfileCreatePage: React.FC<ProfileCreatePageProps> = ({ navigation }) => {
  const { t } = useTranslation('common')
  const { setPrivateKey, setUserState } = useContext(UserContext)
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
    setUserState('ready')
  }

  return (
    <View style={styles.container}>
      <View style={styles.form}>
        <TextInput
          mode='outlined'
          label={t('profileCreatePage.label') ?? ''}
          onChangeText={setInputValue}
          value={inputValue}
          secureTextEntry={true}
          editable={false}
          selectTextOnFocus={true}
          right={
            <TextInput.Icon
              icon={'content-copy'}
              onPress={copyContent}
              forceTextInputFocus={false}
            />
          }
        />
        {/* FIXME: colors are not on the theme */}
        <View style={[styles.warning, { backgroundColor: '#683D00' }]}>
          <Text variant='titleSmall' style={[styles.warningTitle, { color: '#FFDCBB' }]}>
            {t('profileCreatePage.warningTitle')}
          </Text>
          <Text style={{ color: '#FFDCBB' }}>{t('profileCreatePage.warningDescription')}</Text>
          <View style={styles.warningActionOuterLayout}>
            <Button
              style={styles.warningAction}
              textColor='#FFDCBB'
              mode='text'
              onPress={copyContent}
            >
              {t('profileCreatePage.warningAction')}
            </Button>
          </View>
        </View>
        <Button mode='contained' compact onPress={onPress} disabled={!copied}>
          {t('profileCreatePage.accessButton')}
        </Button>
      </View>
      {showNotification && (
        <Snackbar
          style={styles.snackbar}
          visible={showNotification !== undefined}
          duration={Snackbar.DURATION_SHORT}
          onIconPress={() => setShowNotification(undefined)}
          onDismiss={() => setShowNotification(undefined)}
        >
          {t('profileCreatePage.notifications.copied')}
        </Snackbar>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  snackbar: {
    margin: 16,
    width: '100%',
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
  form: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
    alignContent: 'center',
  },
  bold: {
    fontWeight: 'bold',
  },
})

export default ProfileCreatePage
