import { t } from 'i18next'
import * as React from 'react'
import { StyleSheet, Switch, View } from 'react-native'
import {
  Button,
  Checkbox,
  Divider,
  IconButton,
  List,
  Snackbar,
  Text,
  useTheme,
} from 'react-native-paper'
import { AppContext } from '../../Contexts/AppContext'
import { RelayPoolContext } from '../../Contexts/RelayPoolContext'
import RBSheet from 'react-native-raw-bottom-sheet'
import { getRelay, type Relay, type RelayInfo } from '../../Functions/DatabaseFunctions/Relays'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import { relayToColor } from '../../Functions/NativeFunctions'
import axios from 'axios'
import { ScrollView } from 'react-native-gesture-handler'
import Clipboard from '@react-native-clipboard/clipboard'
import Logo from '../Logo'
import { getRawUserNotes } from '../../Functions/DatabaseFunctions/Notes'
import { UserContext } from '../../Contexts/UserContext'
import { getRawUserReactions } from '../../Functions/DatabaseFunctions/Reactions'
import { getRawUserConversation } from '../../Functions/DatabaseFunctions/DirectMessages'
import { getUsers } from '../../Functions/DatabaseFunctions/Users'
import { type Event } from '../../lib/nostr/Events'
import { getUnixTime } from 'date-fns'
import { Kind } from 'nostr-tools'
import { usersToTags } from '../../Functions/RelayFunctions/Users'
import { getRawUserGroupMessages, getRawUserGroups } from '../../Functions/DatabaseFunctions/Groups'
import { getRawLists } from '../../Functions/DatabaseFunctions/Lists'
import { getRawRelayMetadata } from '../../Functions/DatabaseFunctions/RelayMetadatas'

interface RelayCardProps {
  url?: string
  bottomSheetRef: React.RefObject<RBSheet>
}

export const RelayCard: React.FC<RelayCardProps> = ({ url, bottomSheetRef }) => {
  const theme = useTheme()
  const { publicKey } = React.useContext(UserContext)
  const { updateRelayItem, relayPool, removeRelayItem, sendRelays } =
    React.useContext(RelayPoolContext)
  const { database } = React.useContext(AppContext)
  const [relay, setRelay] = React.useState<Relay>()
  const [uri, setUri] = React.useState<string>()
  const [relayInfo, setRelayInfo] = React.useState<RelayInfo>()
  const [showNotification, setShowNotification] = React.useState<string>()
  const [checkedPush, setCheckedPush] = React.useState<'checked' | 'unchecked' | 'indeterminate'>(
    'unchecked',
  )
  const [moreInfo, setMoreInfo] = React.useState<boolean>(false)
  const [pushDone, setPushDone] = React.useState<boolean>(false)
  const [pushUserHistoric, setPushUserHistoric] = React.useState<boolean>(false)
  const bottomSheetPushRelayRef = React.useRef<RBSheet>(null)

  React.useEffect(() => {
    loadRelay()
  }, [url])

  React.useEffect(() => {
    if (pushUserHistoric && url && database && publicKey && relayPool) {
      bottomSheetPushRelayRef.current?.forceUpdate()
      getRawUserNotes(database, publicKey).then((resultNotes) => {
        resultNotes.forEach((note) => {
          note.content = note.content.replace("''", "'")
          relayPool.sendEvent(note, url)
        })
        setPushDone(true)
        setShowNotification('pushCompleted')
      })
      getRawUserReactions(database, publicKey).then((resultReactions) => {
        resultReactions.forEach((reaction) => {
          relayPool.sendEvent(reaction, url)
        })
      })
      getRawUserConversation(database, publicKey).then((resultConversations) => {
        resultConversations.forEach((conversation) => {
          conversation.content = conversation.content.replace("''", "'")
          relayPool.sendEvent(conversation, url)
        })
      })
      getUsers(database, { exludeIds: [publicKey], contacts: true }).then((users) => {
        if (users) {
          const event: Event = {
            content: '',
            created_at: getUnixTime(new Date()),
            kind: Kind.Contacts,
            pubkey: publicKey,
            tags: usersToTags(users),
          }
          relayPool?.sendEvent(event, url)
        }
      })
      getRawUserGroupMessages(database, publicKey).then((resultGroupMessages) => {
        resultGroupMessages.forEach((groupMessage) => {
          relayPool.sendEvent(groupMessage, url)
        })
      })
      getRawUserGroups(database, publicKey).then((resultGroups) => {
        resultGroups.forEach((group) => {
          relayPool.sendEvent(group, url)
        })
      })
      getRawLists(database, publicKey).then((lists) => {
        lists.forEach((list) => {
          relayPool.sendEvent(list, url)
        })
      })
      getRawRelayMetadata(database, publicKey).then((lists) => {
        lists.forEach((list) => {
          relayPool.sendEvent(list, url)
        })
      })
      sendRelays(url)
    }
  }, [pushUserHistoric])

  React.useEffect(() => {
    if (relay) {
      setUri(relay.url)
    }
  }, [relay])

  React.useEffect(() => {
    if (uri && moreInfo) {
      const headers = {
        Accept: 'application/nostr+json',
      }
      axios
        .get('http://' + uri.replace('wss://', '').replace('ws://', ''), {
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

  const removeRelay: () => void = () => {
    if (relay) {
      removeRelayItem(relay)
      bottomSheetRef.current?.close()
    }
  }

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

  const paidRelay: () => void = () => {
    if (relay) {
      const newRelay = relay
      newRelay.paid = 1
      updateRelayItem(newRelay).then(() => {
        setShowNotification('paid')
      })
      setRelay(newRelay)
    }
  }

  const freeRelay: () => void = () => {
    if (relay) {
      const newRelay = relay
      newRelay.paid = 0
      updateRelayItem(newRelay).then(() => {
        setShowNotification('noPaid')
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

  const bottomSheetStyles = React.useMemo(() => {
    return {
      container: {
        backgroundColor: theme.colors.background,
        paddingTop: 16,
        paddingRight: 16,
        paddingBottom: 32,
        paddingLeft: 16,
        borderTopRightRadius: 28,
        borderTopLeftRadius: 28,
        height: 'auto',
      },
    }
  }, [])

  return relay ? (
    <View>
      <View style={styles.relayDescription}>
        <View style={styles.relayData}>
          <View style={styles.relayName}>
            <MaterialCommunityIcons
              style={styles.relayColor}
              name='circle'
              color={relayToColor(relay.url)}
            />
            <Text>{relay.url}</Text>
          </View>
          {relay.paid && relay.paid > 0 ? (
            <MaterialCommunityIcons
              name='wallet-outline'
              size={16}
              color={theme.colors.onPrimaryContainer}
            />
          ) : (
            <></>
          )}
        </View>
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
                  <Text variant='titleLarge'>{t('relayCard.obtainingInfo')}</Text>
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
        <List.Item
          title={t('relayCard.paid')}
          right={() => (
            <Switch
              value={relay.paid !== undefined && relay.paid > 0}
              onValueChange={() => (relay.paid ? freeRelay() : paidRelay())}
            />
          )}
        />
      </View>
      <Divider />
      <View style={styles.actions}>
        <View style={styles.actionButton}>
          <IconButton
            icon={'upload-multiple'}
            size={28}
            onPress={() => bottomSheetPushRelayRef.current?.open()}
          />
          <Text>{t('relayCard.pushRelay')}</Text>
        </View>
        <View style={styles.actionButton}>
          <IconButton
            icon='content-copy'
            size={28}
            onPress={() => {
              Clipboard.setString(relay.url)
              setShowNotification('urlCopied')
            }}
          />
          <Text>{t('relayCard.copy')}</Text>
        </View>
        <View style={styles.actionButton}>
          <IconButton icon={'trash-can-outline'} size={28} onPress={removeRelay} />
          <Text>{t('relayCard.remove')}</Text>
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
      <RBSheet
        ref={bottomSheetPushRelayRef}
        closeOnPressMask={!pushUserHistoric || pushDone}
        closeOnDragDown={true}
        customStyles={bottomSheetStyles}
        onClose={() => {
          setPushDone(false)
          setPushUserHistoric(false)
          setCheckedPush('unchecked')
        }}
      >
        <Text variant='titleLarge'>{t('relayCard.pushHistoricTitle')}</Text>
        <Text>{t('relayCard.pushHistoricDescription')}</Text>
        <View style={[styles.warning, { backgroundColor: '#683D00' }]}>
          <Text variant='titleSmall' style={[styles.warningTitle, { color: '#FFDCBB' }]}>
            {t('relayCard.pushHistoricAlertTitle')}
          </Text>
          <Text style={{ color: '#FFDCBB' }}>{t('relayCard.pushHistoricAlert')}</Text>
        </View>
        <View style={styles.row}>
          <Text>{t('relayCard.pushConsent')}</Text>
          <Checkbox
            status={checkedPush}
            onPress={() => setCheckedPush(checkedPush === 'checked' ? 'unchecked' : 'checked')}
          />
        </View>
        <Button
          style={styles.buttonSpacer}
          mode='contained'
          onPress={() => setPushUserHistoric(true)}
          disabled={pushUserHistoric || checkedPush !== 'checked'}
          loading={pushUserHistoric && !pushDone}
        >
          {pushDone ? t('relayCard.pushDone') : t('relayCard.pushHistoricTitle')}
        </Button>
        <Button
          mode='outlined'
          onPress={() => {
            bottomSheetPushRelayRef.current?.close()
          }}
          disabled={pushUserHistoric}
        >
          {t('relayCard.cancel')}
        </Button>
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
      </RBSheet>
    </View>
  ) : (
    <></>
  )
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 56,
    justifyContent: 'space-between',
  },
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
    flex: 1,
  },
  moreInfo: {
    paddingTop: 16,
  },
  moreInfoText: {
    textDecorationLine: 'underline',
  },
  relayData: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  buttonSpacer: {
    marginTop: 16,
    marginBottom: 16,
  },
  warning: {
    borderRadius: 4,
    padding: 16,
    marginTop: 16,
    marginBottom: 16,
  },
  warningTitle: {
    marginBottom: 8,
  },
})

export default RelayCard
