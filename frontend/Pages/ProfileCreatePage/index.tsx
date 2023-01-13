import React, { useState } from 'react'
import { generateRandomKey } from '../../lib/nostr/Bip'
import { Clipboard } from 'react-native'

export const ProfileCreatePage: React.FC = () => {
  const [inputValue, setInputValue] = useState<string>('')

  const randomKeyGenerator: () => JSX.Element = () => {
    generateRandomKey().then((string) => {
      setInputValue(string)
      Clipboard.setString(string)
    })
  }

  return (
    <>
      {/* <Layout style={styles.text}>
        <Text>{profileFound ? t('loader.profileFound') : t('loader.searchingProfile')}</Text>
        <Text>{`${t('loader.searchingContacts')} ${contactsCount}`}</Text>
      </Layout>
      <Layout>
        <Text>{t('loader.help1')}</Text>
        <Text>{t('loader.help2')}</Text>
      </Layout>
      <Layout style={styles.action}>
        <Button
          onPress={() => goToPage('relays')}
          status='warning'
          accessoryLeft={<Icon name='server' size={16} color={theme['text-basic-color']} solid />}
        >
          {t('loader.relays')}
        </Button>
      </Layout>
      <Layout style={styles.action}>
        <Button
          onPress={() => goToPage('home')}
          accessoryLeft={<Icon name='home' size={16} color={theme['text-basic-color']} solid />}
        >
          {t('loader.home')}
        </Button>
      </Layout> */}
    </>
  )
}

export default ProfileCreatePage
