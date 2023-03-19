import React, { useContext, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { type ListRenderItem, StyleSheet, View, FlatList } from 'react-native'
import { Button, Card, Divider, List, Text, useTheme } from 'react-native-paper'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import { AppContext } from '../../../Contexts/AppContext'
import { RelayPoolContext } from '../../../Contexts/RelayPoolContext'
import { UserContext } from '../../../Contexts/UserContext'
import { getUsers, type User } from '../../../Functions/DatabaseFunctions/Users'
import { relayToColor } from '../../../Functions/NativeFunctions'
import {
  getAllRelayMetadata,
  type RelayMetadata,
} from '../../../Functions/DatabaseFunctions/RelayMetadatas'
import { getContactsRelays } from '../../../Functions/RelayFunctions/Metadata'

interface ThirdStepProps {
  nextStep: () => void
  skip: () => void
}

export const ThirdStep: React.FC<ThirdStepProps> = ({ nextStep, skip }) => {
  const theme = useTheme()
  const { t } = useTranslation('common')
  const { database } = useContext(AppContext)
  const { relayPool, relayPoolReady, lastEventId, relays, addRelayItem } =
    useContext(RelayPoolContext)
  const { publicKey, setUserState } = useContext(UserContext)
  const [asignation, setAsignation] = useState<string[]>()
  const [contactsRelays, setContactsRelays] = useState<RelayMetadata[]>([])

  const calculateRelays: () => void = () => {
    if (database) {
      getAllRelayMetadata(database).then((relayMetadata) => {
        setContactsRelays(relayMetadata)
        getContactsRelays(relays, relayMetadata).then(setAsignation)
      })
    }
  }

  React.useEffect(() => {
    loadPetsRelays()
    calculateRelays()
  }, [])

  React.useEffect(calculateRelays, [lastEventId])

  const loadPetsRelays: () => void = () => {
    if (database && publicKey && relayPoolReady) {
      getUsers(database, {}).then((results) => {
        if (results.length > 0) {
          const authors = [...results.map((user: User) => user.id), publicKey]
          relayPool?.subscribe('profile-load-contacts', [
            {
              kinds: [10002],
              authors,
            },
          ])
        }
      })
    }
  }

  const renderItem: ListRenderItem<string> = ({ item, index }) => {
    return (
      <View style={styles.relayItem}>
        <List.Item
          key={index}
          title={item.replace('wss://', '').replace('ws://', '')}
          left={() => (
            <MaterialCommunityIcons
              style={styles.relayColor}
              name='circle'
              color={relayToColor(item)}
            />
          )}
        />
      </View>
    )
  }

  const connect: () => void = () => {
    if (asignation) {
      asignation.forEach(async (url) => await addRelayItem({ url, resilient: 1, global_feed: 0 }))
    }
    setUserState('ready')
  }

  return (
    <View style={styles.container}>
      <View>
        <View style={styles.loadingProfile}>
          <Text style={{ color: theme.colors.onSurfaceVariant }} variant='titleMedium'>
            {t('profileLoadPage.connectingRandomRelays')}
          </Text>
          <MaterialCommunityIcons
            style={{ color: '#7ADC70' }}
            name='check-circle-outline'
            size={20}
          />
        </View>
        <View style={styles.loadingProfile}>
          <Text style={{ color: theme.colors.onSurfaceVariant }} variant='titleMedium'>
            {t('profileLoadPage.searchContacts')}
          </Text>
          <MaterialCommunityIcons
            style={{ color: '#7ADC70' }}
            name='check-circle-outline'
            size={20}
          />
        </View>
        <View style={styles.loadingProfile}>
          <Text variant='titleMedium'>{t('profileLoadPage.searchContactsRelays')}</Text>
        </View>
        <View style={styles.loadingProfile}>
          <Text style={{ color: theme.colors.onSurfaceVariant }}>
            {t('profileLoadPage.searchContactsRelaysDescription')}
          </Text>
        </View>
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.loadingProfile}>
              <Text>{t('profileLoadPage.contatcsRelays')}</Text>
              <Text style={{ color: '#7ADC70' }}>
                {t('profileLoadPage.contatcsRelaysCount', { activeRelays: contactsRelays.length })}
              </Text>
            </View>
            <FlatList
              showsVerticalScrollIndicator={false}
              data={asignation}
              renderItem={renderItem}
              ItemSeparatorComponent={Divider}
              style={styles.list}
            />
          </Card.Content>
        </Card>
      </View>
      <View style={styles.buttons}>
        <Button style={styles.button} mode='outlined' onPress={skip}>
          {t('profileLoadPage.skip')}
        </Button>
        <Button mode='contained' onPress={connect} disabled={contactsRelays === undefined}>
          {t('profileLoadPage.connectAccess')}
        </Button>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    justifyContent: 'space-between',
    flex: 1,
  },
  buttons: {
    justifyContent: 'space-between',
  },
  button: {
    marginBottom: 16,
  },
  logo: {
    justifyContent: 'center',
    alignContent: 'center',
    flexDirection: 'row',
  },
  center: {
    alignContent: 'center',
    textAlign: 'center',
  },
  card: {
    marginBottom: 16,
  },
  loadingProfile: {
    flexDirection: 'row',
    marginBottom: 16,
    justifyContent: 'space-between',
  },
  relayItem: {
    paddingLeft: 16,
    paddingRight: 16,
  },
  relayColor: {
    paddingTop: 9,
  },
  list: {
    maxHeight: 230,
  },
})

export default ThirdStep
