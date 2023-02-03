import { t } from 'i18next'
import * as React from 'react'
import { StyleSheet, Switch, View } from 'react-native'
import { Divider, IconButton, List, Snackbar, Text } from 'react-native-paper'
import { AppContext } from '../../Contexts/AppContext'
import { RelayPoolContext } from '../../Contexts/RelayPoolContext'
import RBSheet from 'react-native-raw-bottom-sheet'
import { getRelay, Relay, RelayInfo } from '../../Functions/DatabaseFunctions/Relays'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import { relayToColor } from '../../Functions/NativeFunctions'
import axios from 'axios'
import { ScrollView } from 'react-native-gesture-handler'
import Clipboard from '@react-native-clipboard/clipboard'
import Logo from '../Logo'

interface RelayCardProps {
  url?: string
  bottomSheetRef: React.RefObject<RBSheet>
}

export const RelayCard: React.FC<RelayCardProps> = ({ url, bottomSheetRef }) => {
  const { updateRelayItem } = React.useContext(RelayPoolContext)
  const { database } = React.useContext(AppContext)
  const [relay, setRelay] = React.useState<Relay>()
  const [uri, setUri] = React.useState<string>()
  const [relayInfo, setRelayInfo] = React.useState<RelayInfo>()
  const [showNotification, setShowNotification] = React.useState<string>()
  const [moreInfo, setMoreInfo] = React.useState<boolean>(false)

  React.useEffect(() => {
    loadRelay()
  }, [])

  React.useEffect(() => {
    if (relay) {
      setUri(relay.url.split('wss://')[1]?.split('/')[0])
    }
  }, [relay])

  React.useEffect(() => {
    if (uri && moreInfo) {
      const headers = {
        Accept: 'application/nostr+json',
      }
      axios
        .get('http://' + uri, {
          headers,
        })
        .then((response) => {
          setRelayInfo(response.data)
        })
        .catch((e) => {
          console.log(e)
        })
    }
  }, [moreInfo])

  const activeRelay: () => void = () => {
    if (relay) {
      const newRelay = relay
      newRelay.active = 1
      newRelay.global_feed = 1
      updateRelayItem(newRelay).then(() => {
        setShowNotification('active')
      })
      setRelay(newRelay)
    }
  }

  const desactiveRelay: () => void = () => {
    if (relay) {
      const newRelay = relay
      newRelay.active = 0
      newRelay.global_feed = 0
      updateRelayItem(newRelay).then(() => {
        setShowNotification('desactive')
      })
      setRelay(newRelay)
    }
  }

  const activeGlobalFeedRelay: () => void = () => {
    if (relay) {
      const newRelay = relay
      newRelay.active = 1
      newRelay.global_feed = 1
      updateRelayItem(newRelay).then(() => {
        setShowNotification('globalFeedActive')
      })
      setRelay(newRelay)
    }
  }

  const desactiveGlobalFeedRelay: () => void = () => {
    if (relay) {
      const newRelay = relay
      newRelay.global_feed = 0
      updateRelayItem(relay).then(() => {
        setShowNotification('globalFeedActiveUnactive')
      })
      setRelay(newRelay)
    }
  }

  const loadRelay: () => void = () => {
    if (database && url) {
      getRelay(database, url).then((result) => {
        if (result) setRelay(result)
      })
    }
  }

  return relay ? (
    <View>
      <View style={styles.relayDescription}>
        <View style={styles.relayName}>
          <MaterialCommunityIcons
            style={styles.relayColor}
            name='circle'
            color={relayToColor(relay.url)}
          />
          <Text>{relay.url.split('wss://')[1]?.split('/')[0]}</Text>
        </View>
        <Text>{relay.url}</Text>
        <View style={styles.moreInfo}>
          {!moreInfo && (
            <Text style={styles.moreInfoText} onPress={() => setMoreInfo(true)}>
              {t('relayCard.moreInfo')}
            </Text>
          )}
          {moreInfo && (
            <Text style={styles.moreInfoText} onPress={() => setMoreInfo(false)}>
              {t('relayCard.lessInfo')}
            </Text>
          )}
          {moreInfo && (
            <>
              {relayInfo ? (
                <ScrollView>
                  <View style={styles.moreInfoItem}>
                    <Text variant='titleMedium'>{t('relayCard.description')}</Text>
                    <Text>{relayInfo?.description}</Text>
                  </View>
                  <View style={styles.moreInfoItem}>
                    <Text variant='titleMedium'>{t('relayCard.pubkey')}</Text>
                    <Text
                      onPress={() => {
                        if (relayInfo?.pubkey) {
                          Clipboard.setString(relayInfo?.pubkey)
                          setShowNotification('pubkeyCopied')
                        }
                      }}
                    >
                      {relayInfo?.pubkey}
                    </Text>
                  </View>
                  <View style={styles.moreInfoItem}>
                    <Text variant='titleMedium'>{t('relayCard.contact')}</Text>
                    <Text
                      onPress={() => {
                        if (relayInfo?.contact) {
                          Clipboard.setString(relayInfo?.contact)
                          setShowNotification('contactCopied')
                        }
                      }}
                    >
                      {relayInfo?.contact}
                    </Text>
                  </View>
                  <View style={styles.moreInfoItem}>
                    <Text variant='titleMedium'>{t('relayCard.supportedNips')}</Text>
                    <Text>{relayInfo?.supported_nips.join(', ')}</Text>
                  </View>
                  <View style={styles.moreInfoItem}>
                    <Text variant='titleMedium'>{t('relayCard.software')}</Text>
                    <Text>{relayInfo?.software}</Text>
                  </View>
                  <View style={styles.moreInfoItem}>
                    <Text variant='titleMedium'>{t('relayCard.version')}</Text>
                    <Text>{relayInfo?.version}</Text>
                  </View>
                </ScrollView>
              ) : (
                <View style={styles.loading}>
                  <Logo onlyIcon size='medium' />
                  <Text variant='titleLarge'>{'relayCard.obtainingInfo'}</Text>
                </View>
              )}
            </>
          )}
        </View>
      </View>
      <Divider />
      <View>
        <List.Item
          title={t('relayCard.globalFeed')}
          right={() => (
            <Switch
              value={relay.global_feed !== undefined && relay.global_feed > 0}
              onValueChange={() =>
                relay.global_feed ? desactiveGlobalFeedRelay() : activeGlobalFeedRelay()
              }
            />
          )}
        />
        <List.Item
          title={t('relayCard.active')}
          right={() => (
            <Switch
              value={relay.active !== undefined && relay.active > 0}
              onValueChange={() => (relay.active ? desactiveRelay() : activeRelay())}
            />
          )}
        />
      </View>
      <Divider />
      <View style={styles.actions}>
        <View style={styles.actionButton}>
          <IconButton
            icon={'share-variant-outline'}
            size={28}
            onPress={() => {
              Clipboard.setString(relay.url)
              setShowNotification('urlCopied')
            }}
          />
          <Text>{t('relayCard.share')}</Text>
        </View>
      </View>
      {showNotification && (
        <Snackbar
          style={styles.snackbar}
          visible={showNotification !== undefined}
          duration={Snackbar.DURATION_SHORT}
          onIconPress={() => setShowNotification(undefined)}
          onDismiss={() => setShowNotification(undefined)}
        >
          {t(`relayCard.notifications.${showNotification}`)}
        </Snackbar>
      )}
    </View>
  ) : (
    <></>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  loading: {
    height: 372,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreInfoItem: {
    paddingTop: 16,
  },
  relayColor: {
    paddingTop: 5,
    paddingRight: 8,
  },
  snackbar: {
    marginBottom: 85,
  },
  moreInfo: {
    paddingTop: 16,
  },
  moreInfoText: {
    textDecorationLine: 'underline',
  },
  relayName: {
    flexDirection: 'row',
  },
  relayDescription: {
    padding: 16,
    justifyContent: 'space-between',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButton: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    width: '33%',
  },
})

export default RelayCard
