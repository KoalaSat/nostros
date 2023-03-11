import { Kind } from 'nostr-tools'
import React, { useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { type Relay } from '../../../Functions/DatabaseFunctions/Relays'
import {
  ActivityIndicator,
  FlatList,
  type ListRenderItem,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native'
import { Button, Divider, List, Text } from 'react-native-paper'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import Logo from '../../../Components/Logo'
import { AppContext } from '../../../Contexts/AppContext'
import { RelayPoolContext } from '../../../Contexts/RelayPoolContext'
import { UserContext } from '../../../Contexts/UserContext'
import { getUsers, type User } from '../../../Functions/DatabaseFunctions/Users'
import { relayToColor } from '../../../Functions/NativeFunctions'

interface SecondStepProps {
  nextStep: () => void
}

export const SecondStep: React.FC<SecondStepProps> = ({ nextStep }) => {
  const { t } = useTranslation('common')
  const { database } = useContext(AppContext)
  const { relayPool, relayPoolReady, lastEventId, relays, updateRelayItem } =
    useContext(RelayPoolContext)
  const { publicKey, setUserState } = useContext(UserContext)
  const [contactsCount, setContactsCount] = useState<number>()

  React.useEffect(() => {
    setTimeout(loadData, 1500)
  }, [])

  useEffect(() => {
    if (publicKey && relayPoolReady && database) {
      loadPets()
    }
  }, [publicKey, lastEventId])

  const loadData: () => void = () => {
    if (publicKey && relayPoolReady) {
      relayPool?.subscribe('profile-load-contacts', [
        {
          kinds: [Kind.Contacts],
          authors: [publicKey],
        },
        {
          kinds: [Kind.ChannelCreation, Kind.ChannelMetadata],
          authors: [publicKey],
        },
        {
          kinds: [10000],
          authors: [publicKey],
          limit: 1,
        },
        {
          kinds: [10001],
          authors: [publicKey],
          limit: 1,
        },
        {
          kinds: [30001],
          authors: [publicKey],
          limit: 1,
        },
      ])
    }
  }

  const loadPets: () => void = () => {
    if (database && publicKey && relayPoolReady) {
      getUsers(database, {}).then((results) => {
        if (results.length > 0) {
          setContactsCount(results.filter((user) => user.contact).length)
          const authors = [...results.map((user: User) => user.id)]
          relayPool?.subscribe('profile-load-contacts', [
            {
              kinds: [Kind.Metadata, 10002],
              authors,
            },
          ])
        }
      })
    }
  }

  const activeGlobalFeedRelay: (relay: Relay) => void = (relay) => {
    relay.active = 1
    relay.global_feed = 1
    updateRelayItem(relay)
  }

  const desactiveGlobalFeedRelay: (relay: Relay) => void = (relay) => {
    relay.global_feed = 0
    updateRelayItem(relay)
  }

  const renderItem: ListRenderItem<Relay> = ({ item, index }) => {
    return (
      <List.Item
        key={index}
        title={item.url.replace('wss://', '').replace('ws://', '')}
        right={() => (
          <Button
            style={styles.relayButton}
            mode={item.global_feed !== undefined && item.global_feed > 0 ? 'contained' : 'outlined'}
            onPress={() => {
              item.global_feed ? desactiveGlobalFeedRelay(item) : activeGlobalFeedRelay(item)
            }}
          >
            {t('relaysPage.globalFeed')}
          </Button>
        )}
        left={() => (
          <MaterialCommunityIcons
            style={styles.relayColor}
            name='circle'
            color={relayToColor(item.url)}
          />
        )}
      />
    )
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
          {!contactsCount && (
            <ActivityIndicator animating={true} style={styles.activityIndicator} />
          )}
          <Text variant='titleMedium' style={styles.center}>
            {contactsCount
              ? t('profileLoadPage.foundContacts', { contactsCount })
              : t('profileLoadPage.searchingContacts')}
          </Text>
        </View>
        <View style={styles.list}>
          <View style={styles.titleWrapper}>
            <Text style={styles.title} variant='titleMedium'>
              {t('relaysPage.myList')}
            </Text>
            <Divider />
          </View>
          <ScrollView horizontal={false}>
            <FlatList
              showsVerticalScrollIndicator={false}
              data={relays.sort((a, b) => {
                if (a.url > b.url) return 1
                if (a.url < b.url) return -1
                return 0
              })}
              renderItem={renderItem}
              ItemSeparatorComponent={Divider}
            />
          </ScrollView>
        </View>
      </View>
      <View style={styles.buttons}>
        <Button mode='contained' onPress={nextStep} disabled={!contactsCount}>
          {t('profileLoadPage.nextStep')}
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
    maxHeight: 400,
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
  relayActionButtons: {
    flexDirection: 'row',
  },
  relayColor: {
    paddingTop: 9,
  },
  relayButton: {
    marginRight: -22,
  },
})

export default SecondStep
