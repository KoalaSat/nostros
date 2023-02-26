import React, { useContext, useEffect, useState } from 'react'
import { FlatList, Keyboard, StyleSheet, View } from 'react-native'
import Clipboard from '@react-native-clipboard/clipboard'
import { UserContext } from '../../Contexts/UserContext'
import { useTranslation } from 'react-i18next'
import { getNip19Key, isPrivateKey, isPublicKey } from '../../lib/nostr/Nip19'
import { Button, Divider, List, Text, TextInput, useTheme } from 'react-native-paper'
import Logo from '../../Components/Logo'
import { navigate } from '../../lib/Navigation'
import { useFocusEffect } from '@react-navigation/native'
import RBSheet from 'react-native-raw-bottom-sheet'
import { privateKeyFromSeedWords } from 'nostr-tools/nip06'
import { AppContext } from '../../Contexts/AppContext'

interface ProfileConnectPageProps {
  route: { params: { qr: string } }
}

export const ProfileConnectPage: React.FC<ProfileConnectPageProps> = ({ route }) => {
  const theme = useTheme()
  const { setPrivateKey, setPublicKey } = useContext(UserContext)
  const { qrReader, setQrReader } = useContext(AppContext)
  const { t } = useTranslation('common')
  const bottomSheetLoginMethodRef = React.useRef<RBSheet>(null)
  const [isNip19, setIsNip19] = useState<boolean>(false)
  const [inputValue, setInputValue] = useState<string>('')
  const [keyboardShow, setKeyboardShow] = useState<boolean>(false)
  const [mnemonicWords, setMnemonicWords] = useState<Record<number, string>>({})
  const [lastMnemonicInput, setLastMnemonicInput] = useState<string>()
  const [loginMethod, setLoginMethod] = useState<'privateKey' | 'publicKey' | 'mnemonic'>(
    'privateKey',
  )

  useFocusEffect(
    React.useCallback(() => {
      Keyboard.addListener('keyboardDidShow', () => setKeyboardShow(true))
      Keyboard.addListener('keyboardDidHide', () => setKeyboardShow(false))
      return () => setInputValue('')
    }, []),
  )

  useEffect(() => {
    if (qrReader) {
      setInputValue(qrReader)
      setQrReader(undefined)
    }
  }, [qrReader])
  useEffect(() => checkKey(), [inputValue])
  useEffect(() => {}, [lastMnemonicInput])

  const checkKey: () => void = () => {
    if (inputValue && inputValue !== '') {
      const isBenchPrivate = isPrivateKey(inputValue)
      const isBenchPublic = isPublicKey(inputValue)
      if (isBenchPrivate) {
        setLoginMethod('privateKey')
      } else if (isBenchPublic) {
        setLoginMethod('publicKey')
      }
      setIsNip19(isBenchPrivate || isBenchPublic)
    }
  }

  const onPress: () => void = () => {
    if (inputValue && inputValue !== '') {
      const key = isNip19 ? getNip19Key(inputValue) : inputValue
      if (key) {
        if (loginMethod === 'publicKey') {
          setPublicKey(key)
        } else if (loginMethod === 'privateKey') {
          setPrivateKey(key)
        }
        navigate('ProfileLoad')
      }
    } else if (loginMethod === 'mnemonic') {
      const words = []
      for (let index = 1; index <= 12; index++) {
        words.push(mnemonicWords[index].trim())
      }
      setPrivateKey(privateKeyFromSeedWords(words.join(' ')))
      setMnemonicWords({})
      navigate('ProfileLoad')
    }
  }

  const pasteContent: () => void = () => {
    Clipboard.getString().then((value) => {
      setInputValue(value ?? '')
    })
  }

  const onChangeTextMnemonic: (value: string, position: number) => void = (value, position) => {
    setMnemonicWords((prev) => {
      prev[position] = value
      return prev
    })
    setLastMnemonicInput(value)
  }

  const loginMethodOptions = React.useMemo(() => {
    return ['privateKey', 'publicKey', 'mnemonic'].map((method, index) => {
      return {
        key: index,
        title: <Text>{t(`loggerPage.${method}`)}</Text>,
        onPress: () => {
          setLoginMethod(method as 'privateKey' | 'publicKey' | 'mnemonic')
          bottomSheetLoginMethodRef.current?.close()
        },
      }
    })
  }, [])

  const bottomSheetStyles = React.useMemo(() => {
    return {
      container: {
        backgroundColor: theme.colors.background,
        paddingTop: 16,
        paddingRight: 16,
        paddingBottom: 32,
        paddingLeft: 16,
        borderTopRightRadius: 28,
        borderTopLeftRadius: 28,
        height: 'auto',
      },
    }
  }, [])

  const mnemonicInput = (
    <View style={styles.mnemonicContainer}>
      <Text style={styles.mnemonicText} variant='titleSmall'>
        {t('loggerPage.mnemonicInput')}
      </Text>
      {[0, 3, 6, 9].map((row) => {
        return (
          <View style={styles.mnemonicRow} key={row}>
            {[1, 2, 3].map((column) => {
              return (
                <TextInput
                  key={row + column}
                  mode='outlined'
                  label={`${row + column}.`}
                  onChangeText={(value) => onChangeTextMnemonic(value, row + column)}
                  value={mnemonicWords[row + column]}
                  style={styles.mnemonicInput}
                />
              )
            })}
          </View>
        )
      })}
    </View>
  )

  return (
    <>
      <View style={styles.container}>
        <View style={styles.logo}>
          <Logo size='medium' />
        </View>
        <View style={styles.loginMain}>
          {loginMethod === 'mnemonic' ? (
            <>{mnemonicInput}</>
          ) : (
            <TextInput
              mode='outlined'
              label={t(`loggerPage.${loginMethod}`) ?? ''}
              onChangeText={setInputValue}
              value={inputValue}
              style={styles.input}
              right={
                <TextInput.Icon
                  icon={inputValue ? 'close-circle-outline' : 'content-paste'}
                  onPress={() => (inputValue ? setInputValue('') : pasteContent())}
                  forceTextInputFocus={false}
                />
              }
              left={
                <TextInput.Icon
                  icon='qrcode'
                  onPress={() => navigate('QrReader', { callback: 'ProfileConnect' })}
                  forceTextInputFocus={false}
                />
              }
            />
          )}
          <Button
            mode='contained'
            onPress={onPress}
            disabled={
              (loginMethod !== 'mnemonic' && !inputValue) ||
              (loginMethod === 'mnemonic' && Object.values(mnemonicWords).length < 12)
            }
          >
            {t('loggerPage.accessButton')}
          </Button>
        </View>
        {(loginMethod !== 'mnemonic' || !keyboardShow) && (
          <View style={styles.loginOptions}>
            <View style={styles.row}>
              <Text>{t('loggerPage.loginMethod')}</Text>
              <Button mode='text' onPress={() => bottomSheetLoginMethodRef.current?.open()}>
                {t(`loggerPage.${loginMethod}`)}
              </Button>
            </View>
            <View style={styles.row}>
              <Text>{t('loggerPage.notKeys')}</Text>
              <Button mode='text' onPress={() => navigate('ProfileCreate')}>
                {t('loggerPage.createButton')}
              </Button>
            </View>
          </View>
        )}
      </View>
      <RBSheet
        ref={bottomSheetLoginMethodRef}
        closeOnDragDown={true}
        customStyles={bottomSheetStyles}
      >
        <FlatList
          data={loginMethodOptions}
          renderItem={({ item }) => {
            return <List.Item key={item.key} title={item.title} onPress={item.onPress} />
          }}
          ItemSeparatorComponent={Divider}
        />
      </RBSheet>
    </>
  )
}

const styles = StyleSheet.create({
  mnemonicRow: {
    flexDirection: 'row',
  },
  container: {
    flex: 1,
    padding: 16,
  },
  mnemonicText: {
    paddingBottom: 8,
    textAlign: 'center',
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
  mnemonicContainer: {
    paddingBottom: 16,
  },
  mnemonicInput: {
    flex: 1,
    margin: 4,
    height: 35,
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
