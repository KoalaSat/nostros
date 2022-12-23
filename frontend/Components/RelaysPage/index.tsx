import { Button, Layout, TopNavigation, useTheme, Text } from '@ui-kitten/components'
import React, { useContext, useEffect, useState } from 'react'
import { RefreshControl, ScrollView, StyleSheet } from 'react-native'
import { AppContext } from '../../Contexts/AppContext'
import Icon from 'react-native-vector-icons/FontAwesome5'
import { useTranslation } from 'react-i18next'
import { RelayPoolContext } from '../../Contexts/RelayPoolContext'
import { getRelays, Relay } from '../../Functions/DatabaseFunctions/Relays'
import { defaultRelays } from '../../Constants/RelayConstants'
import { showMessage } from 'react-native-flash-message'

export const RelaysPage: React.FC = () => {
  const theme = useTheme()
  const { goBack, database } = useContext(AppContext)
  const { relayPool, publicKey } = useContext(RelayPoolContext)
  const { t } = useTranslation('common')
  const [relays, setRelays] = useState<Relay[]>([])
  const [loading, setLoading] = useState<boolean>(false)

  const loadRelays: () => void = () => {
    if (database) {
      getRelays(database).then((results) => {
        if (results) {
          setRelays(results)
          setLoading(false)
        }
      })
    }
  }

  useEffect(loadRelays, [])

  const onPressBack: () => void = () => {
    goBack()
  }

  const renderBackAction = (): JSX.Element => (
    <Button
      accessoryRight={<Icon name='arrow-left' size={16} color={theme['text-basic-color']} />}
      onPress={onPressBack}
      appearance='ghost'
    />
  )

  const addRelayItem: (url: string) => void = async (url) => {
    if (relayPool && database && publicKey) {
      setLoading(true)
      relayPool.add(url, () => {
        showMessage({
          message: t('alerts.relayAdded'),
          description: url,
          type: 'success',
        })
        loadRelays()
      })
    }
  }

  const removeRelayItem: (url: string) => void = async (url) => {
    if (relayPool && database && publicKey) {
      setLoading(true)
      relayPool.remove(url, () => {
        showMessage({
          message: t('alerts.relayRemoved'),
          description: url,
          type: 'danger',
        })
        loadRelays()
      })
    }
  }

  const relayActions: (relay: Relay) => JSX.Element = (relay) => {
    return relays?.find((item) => item.url === relay.url) ? (
      <Button
        status='danger'
        disabled={loading}
        onPress={() => removeRelayItem(relay.url)}
        accessoryLeft={<Icon name='trash' size={16} color={theme['text-basic-color']} solid />}
      />
    ) : (
      <Button
        status='success'
        disabled={loading}
        onPress={() => addRelayItem(relay.url)}
        accessoryLeft={<Icon name='plus' size={16} color={theme['text-basic-color']} solid />}
      />
    )
  }

  const renderItem: (relay: Relay, index: number) => JSX.Element = (relay, index) => (
    <Layout style={styles.item} level='1' key={index}>
      <Layout style={styles.itemBody} level='1'>
        <Text category='h6'>{relay.url.split('wss://')[1].split('/')[0]}</Text>
      </Layout>
      <Layout style={styles.itemAction} level='1'>
        {relayActions(relay)}
      </Layout>
    </Layout>
  )

  const defaultList: () => Relay[] = () => {
    return defaultRelays
      .filter((url) => !relays?.find((item) => item.url === url))
      .map((url) => {
        return {
          url,
        }
      })
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      marginBottom: 55,
    },
    actionContainer: {},
    action: {
      marginTop: 30,
    },
    item: {
      height: 80,
      flexDirection: 'row',
      padding: 16,
      borderBottomWidth: 1,
    },
    itemBody: {
      flex: 4,
      color: theme['text-basic-color'],
      justifyContent: 'center',
    },
    itemAction: {
      flex: 2,
    },
    text: {
      color: theme['text-basic-color'],
    },
  })

  return (
    <>
      <Layout style={styles.container} level='2'>
        <TopNavigation
          alignment='center'
          title={t('relaysPage.title')}
          accessoryLeft={renderBackAction}
        />
        <Layout style={styles.actionContainer} level='2'>
          <ScrollView refreshControl={<RefreshControl refreshing={loading} />}>
            {relays ? (
              [...relays, ...defaultList()].map((item, index) => {
                return renderItem(item, index)
              })
            ) : (
              <></>
            )}
          </ScrollView>
        </Layout>
      </Layout>
    </>
  )
}

export default RelaysPage
