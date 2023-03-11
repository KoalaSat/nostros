import React, { useContext, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FlatList, type ListRenderItem, ScrollView, StyleSheet, View } from 'react-native'
import { Button, Divider, List, Text } from 'react-native-paper'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import Logo from '../../../Components/Logo'
import { AppContext } from '../../../Contexts/AppContext'
import { RelayPoolContext } from '../../../Contexts/RelayPoolContext'
import { UserContext } from '../../../Contexts/UserContext'
import { getUsers, type User } from '../../../Functions/DatabaseFunctions/Users'
import { relayToColor } from '../../../Functions/NativeFunctions'
import {
  getAllRelayMetadata,
  RelayMetadata,
} from '../../../Functions/DatabaseFunctions/RelayMetadatas'
import { getContactsRelays } from '../../../Functions/RelayFunctions/Metadata'

interface ThirdStepProps {
  nextStep: () => void
}

export const ThirdStep: React.FC<ThirdStepProps> = ({ nextStep }) => {
  const { t } = useTranslation('common')
  const { database } = useContext(AppContext)
  const { relayPool, relayPoolReady, lastEventId, relays, addRelayItem } =
    useContext(RelayPoolContext)
  const { publicKey, setUserState } = useContext(UserContext)
  const [asignation, setAsignation] = useState<string[]>()
  const [contactsRelays, setContactsRelays] = useState<RelayMetadata[]>([])

  React.useEffect(() => {
    loadPetsRelays()
  }, [])

  React.useEffect(() => {
    if (database) {
      getAllRelayMetadata(database).then((relayMetadata) => {
        setContactsRelays(relayMetadata)
        getContactsRelays(relays, relayMetadata).then(setAsignation)
      })
    }
  }, [lastEventId])

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
          <Text variant='titleMedium'>{t('profileLoadPage.connectedRelays')}</Text>
          <Text variant='titleMedium' style={{ color: '#7ADC70' }}>
            {relays.length}
          </Text>
        </View>
        <View style={styles.logo}>
          <Logo onlyIcon size='medium' />
        </View>
        <View style={styles.loadingProfile}>
          <Text variant='titleMedium' style={styles.center}>
            {t('profileLoadPage.contactRelaysDescription')}
          </Text>
        </View>
        <View style={styles.loadingProfile}>
          <Text variant='titleMedium'>{t('profileLoadPage.contactsRelays')}</Text>
          <Text variant='titleMedium' style={{ color: '#7ADC70' }}>
            {contactsRelays.length}
          </Text>
        </View>
        <View style={styles.list}>
          <View style={styles.titleWrapper}>
            <Text style={styles.title} variant='titleMedium'>
              {t('profileLoadPage.contactRelays')}
            </Text>
            <Divider />
          </View>
          <ScrollView horizontal={false}>
            <FlatList
              showsVerticalScrollIndicator={false}
              data={asignation}
              renderItem={renderItem}
              ItemSeparatorComponent={Divider}
            />
          </ScrollView>
        </View>
      </View>
      <View style={styles.buttons}>
        <Button mode='contained' onPress={connect}>
          {t('profileLoadPage.connect')}
        </Button>
        <Button mode='outlined' onPress={() => setUserState('ready')}>
          {t('profileLoadPage.home')}
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
    height: 100,
    justifyContent: 'space-between',
  },
  logo: {
    justifyContent: 'center',
    alignContent: 'center',
    flexDirection: 'row',
  },
  list: {
    maxHeight: 450,
  },
  center: {
    alignContent: 'center',
    textAlign: 'center',
  },
  loadingProfile: {
    justifyContent: 'center',
    alignContent: 'center',
    flexDirection: 'row',
  },
  activityIndicator: {
    paddingRight: 16,
  },
  titleWrapper: {
    marginBottom: 4,
    marginTop: 24,
  },
  title: {
    paddingLeft: 16,
    paddingRight: 16,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  relayItem: {
    paddingLeft: 16,
    paddingRight: 16,
  },
  relayButtons: {
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  relayButton: {
    marginRight: 16,
  },
  relayActionButtons: {
    flexDirection: 'row',
  },
  relayColor: {
    paddingTop: 9,
  },
})

export default ThirdStep
