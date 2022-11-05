import {
  Button,
  Divider,
  Input,
  Layout,
  TopNavigation,
  TopNavigationAction,
  useTheme,
} from '@ui-kitten/components'
import React, { useContext, useEffect } from 'react'
import { Clipboard, StyleSheet } from 'react-native'
import { AppContext } from '../../Contexts/AppContext'
import Icon from 'react-native-vector-icons/FontAwesome5'
import { useTranslation } from 'react-i18next'
import { dropTables } from '../../Functions/DatabaseFunctions'
import { RelayPoolContext } from '../../Contexts/RelayPoolContext'
import SInfo from 'react-native-sensitive-info'

export const ConfigPage: React.FC = () => {
  const theme = useTheme()
  const { goToPage, goBack, database, init } = useContext(AppContext)
  const { setPrivateKey, setPublicKey, relayPool, publicKey, privateKey } =
    useContext(RelayPoolContext)
  const { t } = useTranslation('common')

  useEffect(() => {
    relayPool?.unsubscribeAll()
  }, [])

  const onPressBack: () => void = () => {
    relayPool?.unsubscribeAll()
    goBack()
  }

  const onPressLogout: () => void = () => {
    if (database) {
      relayPool?.unsubscribeAll()
      setPrivateKey(undefined)
      setPublicKey(undefined)
      dropTables(database).then(() => {
        SInfo.deleteItem('privateKey', {}).then(() => {
          SInfo.deleteItem('publicKey', {}).then(() => {
            init()
            goToPage('landing', true)
          })
        })
      })
    }
  }

  const renderBackAction = (): JSX.Element => (
    <TopNavigationAction
      icon={<Icon name='arrow-left' size={16} color={theme['text-basic-color']} />}
      onPress={onPressBack}
    />
  )

  const copyToClipboard: (value: string) => JSX.Element = (value) => {
    const copy: () => void = () => Clipboard.setString(value)

    return <Icon name={'copy'} size={16} color={theme['text-basic-color']} solid onPress={copy} />
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    actionContainer: {
      marginTop: 30,
      paddingLeft: 32,
      paddingRight: 32,
    },
    action: {
      backgroundColor: 'transparent',
      marginTop: 30,
    },
  })

  return (
    <>
      <Layout style={styles.container} level='2'>
        <TopNavigation
          alignment='center'
          title={t('configPage.title')}
          accessoryLeft={renderBackAction}
        />
        <Layout style={styles.actionContainer} level='2'>
          <Layout style={styles.action}>
            <Button
              onPress={() => goToPage('relays')}
              status='info'
              accessoryLeft={
                <Icon name='server' size={16} color={theme['text-basic-color']} solid />
              }
            >
              {t('configPage.relays')}
            </Button>
          </Layout>
          <Layout style={styles.action}>
            <Divider />
          </Layout>
          <Layout style={styles.action}>
            <Input
              disabled={true}
              placeholder={t('configPage.publicKey')}
              accessoryRight={() => copyToClipboard(publicKey ?? '')}
              value={publicKey}
              label={t('configPage.publicKey')}
            />
          </Layout>
          <Layout style={styles.action}>
            <Input
              disabled={true}
              placeholder={t('configPage.privateKey')}
              accessoryRight={() => copyToClipboard(privateKey ?? '')}
              value={privateKey}
              secureTextEntry={true}
              label={t('configPage.privateKey')}
            />
          </Layout>
          <Layout style={styles.action}>
            <Button onPress={onPressLogout} status='danger'>
              {t('configPage.logout')}
            </Button>
          </Layout>
        </Layout>
      </Layout>
    </>
  )
}

export default ConfigPage
