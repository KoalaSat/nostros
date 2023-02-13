import React, { useContext, useEffect, useMemo, useState } from 'react'
import { generateRandomMnemonic } from '../../lib/nostr/Bip'
import { Keyboard, StyleSheet, View } from 'react-native'
import Clipboard from '@react-native-clipboard/clipboard'
import { Button, Checkbox, Snackbar, Text, TextInput } from 'react-native-paper'
import { useTranslation } from 'react-i18next'
import { DrawerNavigationHelpers } from '@react-navigation/drawer/lib/typescript/src/types'
import { UserContext } from '../../Contexts/UserContext'
import { privateKeyFromSeedWords } from 'nostr-tools/nip06'
import { nsecEncode } from 'nostr-tools/nip19'

interface ProfileCreatePageProps {
  navigation: DrawerNavigationHelpers
}

export const ProfileCreatePage: React.FC<ProfileCreatePageProps> = ({ navigation }) => {
  const { t } = useTranslation('common')
  const { setPrivateKey, setUserState } = useContext(UserContext)
  const [key, setKey] = useState<string>()
  const [inputValue, setInputValue] = useState<string>()
  const [keyboardShow, setKeyboardShow] = useState<boolean>(false)
  const [step, setStep] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(true)
  const [mnemonicWords, setMnemonicWords] = useState<Record<number, string>>({})
  const [confirmWords, setConfirmWords] = useState<Record<number, string>>({})
  const [checked, setChecked] = useState<'checked' | 'unchecked' | 'indeterminate'>('unchecked')
  const [showNotification, setShowNotification] = useState<string>()

  useEffect(() => {
    Keyboard.addListener('keyboardDidShow', () => setKeyboardShow(true))
    Keyboard.addListener('keyboardDidHide', () => setKeyboardShow(false))
    generateRandomMnemonic().then((words) => {
      setMnemonicWords(words)
      const privateKey = privateKeyFromSeedWords(Object.values(words).join(' '))
      setKey(privateKey)
      const nsec = nsecEncode(privateKey)
      setInputValue(nsec)
    })
  }, [])

  useEffect(() => {
    if (inputValue) setLoading(false)
  }, [inputValue])

  const validConfirmation: () => boolean = () => {
    return (
      Object.values(mnemonicWords).join(' ') ===
      Object.values(confirmWords)
        .map((word) => word.toLocaleLowerCase().trim())
        .join(' ')
    )
  }

  const copyContent: () => void = () => {
    if (inputValue) {
      Clipboard.setString(inputValue)
      setShowNotification('copied')
    }
  }

  const onPress: () => void = () => {
    if (step > 1) {
      if (validConfirmation()) {
        setPrivateKey(key)
        setUserState('ready')
      } else {
        setShowNotification('wrongWords')
      }
    } else {
      setStep(step + 1)
    }
  }

  const onPressSkip: () => void = () => {
    setPrivateKey(key)
    setUserState('ready')
  }

  const onChangeTextConfirm: (value: string, position: number) => void = (value, position) => {
    setConfirmWords((prev) => {
      prev[position] = value
      return prev
    })
  }

  const stepZero = (
    <View style={styles.intro}>
      <View>
        <Text style={styles.introText} variant='titleSmall'>
          {t('profileCreatePage.introTitle')}
        </Text>
        <Text style={styles.introText} variant='bodyMedium'>
          {t('profileCreatePage.mnemonicTitle')}
        </Text>
      </View>
    </View>
  )

  const wordsInput = useMemo(
    () => (
      <View style={styles.mnemonicContainer}>
        {[0, 3, 6, 9].map((row) => {
          return (
            <View style={styles.mnemonicRow} key={row}>
              {[1, 2, 3].map((column) => {
                return (
                  <TextInput
                    key={row + column}
                    mode='outlined'
                    label={`${row + column}.`}
                    value={mnemonicWords && mnemonicWords[row + column]}
                    style={styles.mnemonicInput}
                  />
                )
              })}
            </View>
          )
        })}
      </View>
    ),
    [mnemonicWords],
  )

  const stepOne = (
    <View style={styles.form}>
      <View>
        <Text style={styles.mnemonicText} variant='titleSmall'>
          {t('profileCreatePage.mnemonicTitle')}
        </Text>
        <Text style={styles.mnemonicText} variant='bodyMedium'>
          {t('profileCreatePage.warningDescription')}
        </Text>
      </View>
      <View>
        {wordsInput}
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
      </View>
    </View>
  )

  const stepTwo = (
    <View style={styles.form}>
      <View>
        <Text style={styles.mnemonicText} variant='titleSmall'>
          {t('profileCreatePage.confirmTitle')}
        </Text>
      </View>
      <View>
        <View style={styles.mnemonicContainer}>
          {[0, 3, 6, 9].map((row) => {
            return (
              <View style={styles.mnemonicRow} key={row}>
                {[1, 2, 3].map((column) => {
                  return (
                    <TextInput
                      key={row + column}
                      mode='outlined'
                      label={`${row + column}.`}
                      value={confirmWords && confirmWords[row + column]}
                      onChangeText={(value) => onChangeTextConfirm(value, row + column)}
                      style={styles.mnemonicInput}
                    />
                  )
                })}
              </View>
            )
          })}
        </View>
      </View>
    </View>
  )

  return (
    <View style={styles.container}>
      {step === 0 && stepZero}
      {step === 1 && stepOne}
      {step === 2 && stepTwo}
      {(step !== 1 || !keyboardShow) && (
        <View>
          {step === 1 && (
            <View style={styles.row}>
              <Text>{t('profileCreatePage.wordsNoted')}</Text>
              <Checkbox
                status={checked}
                onPress={() => setChecked(checked === 'checked' ? 'unchecked' : 'checked')}
              />
            </View>
          )}
          <View>
            <Button
              mode='contained'
              compact
              onPress={onPress}
              loading={loading}
              disabled={loading || (step === 1 && checked !== 'checked')}
            >
              {t(step === 2 ? 'profileCreatePage.accessButton' : 'profileCreatePage.continue')}
              {` ${step + 1}/3`}
            </Button>
          </View>
          {step > 1 && (
            <View style={styles.bottomButton}>
              <Button mode='outlined' compact onPress={onPressSkip}>
                {t('profileCreatePage.skip')}
              </Button>
            </View>
          )}
        </View>
      )}
      {showNotification && (
        <Snackbar
          style={styles.snackbar}
          visible={showNotification !== undefined}
          duration={Snackbar.DURATION_SHORT}
          onIconPress={() => setShowNotification(undefined)}
          onDismiss={() => setShowNotification(undefined)}
        >
          {t(`profileCreatePage.notifications.${showNotification}`)}
        </Snackbar>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 56,
    justifyContent: 'space-between',
  },
  mnemonicRow: {
    flexDirection: 'row',
  },
  mnemonicText: {
    paddingBottom: 16,
  },
  introText: {
    textAlign: 'center',
    paddingBottom: 16,
  },
  mnemonicContainer: {
    marginBottom: 32,
  },
  mnemonicInput: {
    flex: 1,
    margin: 4,
    height: 35,
  },
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
    alignContent: 'center',
  },
  intro: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
    alignContent: 'center',
  },
  bold: {
    fontWeight: 'bold',
  },
  bottomButton: {
    marginTop: 16,
  },
})

export default ProfileCreatePage
