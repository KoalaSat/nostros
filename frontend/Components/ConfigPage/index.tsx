import { Button, Layout, TopNavigation, TopNavigationAction, useTheme } from '@ui-kitten/components'
import React, { useContext, useEffect } from 'react'
import { StyleSheet } from 'react-native'
import { AppContext } from '../../Contexts/AppContext'
import Icon from 'react-native-vector-icons/FontAwesome5'
import { useTranslation } from 'react-i18next'
import { dropTables } from '../../Functions/DatabaseFunctions'
import { RelayPoolContext } from '../../Contexts/RelayPoolContext'
import SInfo from 'react-native-sensitive-info'

export const ConfigPage: React.FC = () => {
  const theme = useTheme()
  const { goToPage, goBack, database, init } = useContext(AppContext)
  const { setPrivateKey, setPublicKey, relayPool } = useContext(RelayPoolContext)
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
          init()
          goToPage('landing', true)
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

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    actionContainer: {
      marginTop: 30,
      paddingLeft: 32,
      paddingRight: 32,
    },
    button: {
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
          <Layout style={styles.button}>
            <Button
              onPress={onPressLogout}
              status='danger'
              accessoryLeft={
                <Icon name='power-off' size={16} color={theme['text-basic-color']} solid />
              }
            >
              {t('configPage.logout')}
            </Button>
          </Layout>
        </Layout>
      </Layout>
    </>
  )
}

export default ConfigPage
