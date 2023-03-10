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
import { Button, Divider, List, Text, useTheme } from 'react-native-paper'
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
  const theme = useTheme()
  const { database } = useContext(AppContext)
  const { relayPool, relayPoolReady, lastEventId, relays } = useContext(RelayPoolContext)
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

  const renderItem: ListRenderItem<Relay> = ({ item, index }) => {
    return (
      <View style={styles.relayItem}>
        <List.Item
          key={index}
          title={item.url.replace('wss://', '').replace('ws://', '')}
          right={() => {
            if (!item?.paid) return <></>
            return (
              <MaterialCommunityIcons
                name='wallet-outline'
                size={16}
                color={theme.colors.onPrimaryContainer}
              />
            )
          }}
          left={() => (
            <MaterialCommunityIcons
              style={styles.relayColor}
              name='circle'
              color={relayToColor(item.url)}
            />
          )}
        />
      </View>
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
              data={relays}
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

export default SecondStep
