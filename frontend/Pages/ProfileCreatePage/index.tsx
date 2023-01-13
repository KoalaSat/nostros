import React, { useContext, useEffect, useState } from 'react'
import { generateRandomKey } from '../../lib/nostr/Bip'
import { Clipboard, StyleSheet, View } from 'react-native'
import { Button, Snackbar, TextInput } from 'react-native-paper'
import { useTranslation } from 'react-i18next'
import { nsecEncode } from 'nostr-tools/nip19'
import { RelayPoolContext } from '../../Contexts/RelayPoolContext'
import { DrawerNavigationHelpers } from '@react-navigation/drawer/lib/typescript/src/types'

interface ProfileCreatePageProps {
  navigation: DrawerNavigationHelpers;
}

export const ProfileCreatePage: React.FC<ProfileCreatePageProps> = ({navigation}) => {
  const { t } = useTranslation('common')
  const { setPrivateKey } = useContext(RelayPoolContext)
  const [inputValue, setInputValue] = useState<string>()
  const [copied, setCopied] = useState<boolean>(false)

  useEffect(() => {
    generateRandomKey().then((string) => {
      const nsec = nsecEncode(string)
      setInputValue(nsec)
    })
  }, [])

  const copyContent: () => void = () => {
    if (inputValue) {
      Clipboard.setString(inputValue)
      setCopied(true)
    }
  }

  const onPress: () => void = () => {
    setPrivateKey(inputValue)
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
              onPress={() => copyContent()}
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
        onDismiss={() => {}}
        action={{label: t('profileCreatePage.snackbarAction') ?? '', onPress: copyContent}}
      >
        Muy importante. Guarda tu clave privada en un lugar seguro, si la pierdes no podrás volver a
        acceder con ella ni recuperar tu cuenta.
      </Snackbar>
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
