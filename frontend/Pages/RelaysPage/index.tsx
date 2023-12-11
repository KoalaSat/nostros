import React, { useContext, useState } from 'react'
import {
  Clipboard,
  FlatList,
  type ListRenderItem,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { RelayPoolContext } from '../../Contexts/RelayPoolContext'
import { type Relay } from '../../Functions/DatabaseFunctions/Relays'
import { REGEX_SOCKET_LINK } from '../../Constants/Relay'
import {
  Chip,
  List,
  AnimatedFAB,
  useTheme,
  Text,
  Button,
  TextInput,
  IconButton,
  Divider,
  Snackbar,
  Switch,
} from 'react-native-paper'
import RBSheet from 'react-native-raw-bottom-sheet'
import { relayToColor } from '../../Functions/NativeFunctions'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import { useFocusEffect } from '@react-navigation/native'
import { UserContext } from '../../Contexts/UserContext'
import { type Event } from '../../lib/nostr/Events'
import { getUnixTime } from 'date-fns'
import { getAllRelayMetadata } from '../../Functions/DatabaseFunctions/RelayMetadatas'
import { getContactsRelays } from '../../Functions/RelayFunctions/Metadata'
import { AppContext } from '../../Contexts/AppContext'
import { getUsers, type User } from '../../Functions/DatabaseFunctions/Users'

export const RelaysPage: React.FC = () => {
  const defaultRelayInput = React.useMemo(() => 'wss://', [])
  const {
    updateRelayItem,
    addRelayItem,
    relayPool,
    sendEvent,
    setDisplayrelayDrawer,
    relays,
    lastEventId,
    loadRelays,
    removeRelayItem,
  } = useContext(RelayPoolContext)
  const { publicKey } = useContext(UserContext)
  const { database, online } = useContext(AppContext)
  const { t } = useTranslation('common')
  const theme = useTheme()
  const bottomSheetAddRef = React.useRef<RBSheet>(null)
  const bottomSheetPushRef = React.useRef<RBSheet>(null)
  const bottomSheetContactsRef = React.useRef<RBSheet>(null)
  const [addRelayInput, setAddRelayInput] = useState<string>(defaultRelayInput)
  const [addRelayPaid, setAddRelayPaid] = useState<boolean>(false)
  const [showNotification, setShowNotification] = useState<string>()
  const [asignation, setAsignation] = useState<string[]>()
  const [showPaidRelays, setShowPaidRelays] = useState<boolean>(true)
  const [showFreeRelays, setShowFreeRelays] = useState<boolean>(true)

  useFocusEffect(
    React.useCallback(() => {
      relayPool?.unsubscribeAll()
      if (publicKey && database) {
        getUsers(database, {}).then((results) => {
          if (results.length > 0) {
            const authors = [...results.map((user: User) => user.id), publicKey]
            relayPool?.subscribe('relays-contacts', [
              {
                kinds: [10002],
                authors,
              },
            ])
          }
        })
      }

      return () => relayPool?.unsubscribe(['relays-contacts'])
    }, []),
  )

  React.useEffect(() => {}, [relays])

  React.useEffect(() => {
    loadRelays()
  }, [lastEventId, online])

  const addRelay: (url: string) => void = (url) => {
    if (!relayList.find((relay) => relay.url === url)) {
      addRelayItem({
        url,
        active: 1,
        global_feed: 1,
      }).then(() => {
        setShowNotification('add')
      })
    }
  }

  const activeRelay: (relay: Relay) => void = (relay) => {
    relay.active = 1
    updateRelayItem(relay).then(() => {
      setShowNotification('active')
    })
  }

  const desactiveRelay: (relay: Relay) => void = (relay) => {
    relay.active = 0
    relay.global_feed = 0
    updateRelayItem(relay).then(() => {
      setShowNotification('desactive')
    })
  }

  const activeGlobalFeedRelay: (relay: Relay) => void = (relay) => {
    relay.active = 1
    relay.global_feed = 1
    updateRelayItem(relay).then(() => {
      setShowNotification('globalFeedActive')
    })
  }

  const desactiveGlobalFeedRelay: (relay: Relay) => void = (relay) => {
    relay.global_feed = 0
    updateRelayItem(relay).then(() => {
      setShowNotification('globalFeedActiveUnactive')
    })
  }

  const onPressAddRelay: () => void = () => {
    if (REGEX_SOCKET_LINK.test(addRelayInput)) {
      if (relays.find((relay) => relay.url === addRelayInput)) {
        setShowNotification('alreadyExists')
      } else {
        addRelay(addRelayInput)
        setAddRelayInput(defaultRelayInput)
      }
    } else {
      setShowNotification('badFormat')
    }
    bottomSheetAddRef.current?.close()
  }

  const onPressPushRelay: () => void = () => {
    if (publicKey) {
      const activeRelays = relays.filter(
        (relay) => relay?.active && (!relay.resilient || relay.resilient < 0),
      )
      const tags: string[][] = activeRelays.map((relay) => ['r', relay.url ?? '', relay.mode ?? ''])
      const event: Event = {
        content: '',
        created_at: getUnixTime(new Date()),
        kind: 10002,
        pubkey: publicKey,
        tags,
      }
      sendEvent(event)
    }
    bottomSheetPushRef.current?.close()
    setShowNotification('listPushed')
  }

  const rbSheetCustomStyles = React.useMemo(() => {
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

  const relayList = relays.sort((a, b) => {
    if (a.url > b.url) return 1
    if (a.url < b.url) return -1
    return 0
  })

  const calculateContactsRelays: () => void = () => {
    if (database) {
      getAllRelayMetadata(database).then((relayMetadata) => {
        const userRelays = relays.filter((relay) => !relay.resilient || relay.resilient < 1)
        getContactsRelays(userRelays, relayMetadata).then(setAsignation)
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
            const icons: string[] = []
            if (item?.paid) icons.push('wallet-outline')
            return icons.map((icon) => (
              <MaterialCommunityIcons
                key={icon}
                name={icon}
                size={16}
                color={theme.colors.onPrimaryContainer}
              />
            ))
          }}
          left={() => (
            <MaterialCommunityIcons
              style={styles.relayColor}
              name='circle'
              color={relayToColor(item.url)}
            />
          )}
        />
        <View style={styles.relayButtons}>
          <View style={styles.relayActionButtons}>
            <Chip
              compact
              mode={item.active !== undefined && item.active > 0 ? 'flat' : 'outlined'}
              style={styles.relayButton}
              onPress={() => (item.active ? desactiveRelay(item) : activeRelay(item))}
            >
              {t('relaysPage.active')}
            </Chip>
            <Chip
              compact
              mode={item.global_feed !== undefined && item.global_feed > 0 ? 'flat' : 'outlined'}
              style={styles.relayButton}
              onPress={() => {
                item.global_feed ? desactiveGlobalFeedRelay(item) : activeGlobalFeedRelay(item)
              }}
            >
              {t('relaysPage.globalFeed')}
            </Chip>
          </View>
          <IconButton
            icon='dots-vertical'
            size={28}
            onPress={() => setDisplayrelayDrawer(item.url)}
            style={styles.relayOptionButton}
          />
        </View>
      </View>
    )
  }

  const renderContactRelayItem: ListRenderItem<string> = ({ item, index }) => {
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

  const pasteUrl: () => void = () => {
    Clipboard.getString().then((value) => {
      setAddRelayInput(value ?? '')
    })
  }

  const onPressAddContactRelay: () => void = () => {
    relays
      .filter((relay) => relay.resilient && relay.resilient > 0)
      .forEach((relay) => {
        removeRelayItem(relay)
      })
    if (asignation) {
      asignation.forEach(async (url) => await addRelayItem({ url, resilient: 1, global_feed: 0 }))
    }
    bottomSheetContactsRef.current?.close()
  }

  return (
    <View style={styles.container}>
      <View style={styles.relayFilters}>
        <Button
          mode={showFreeRelays ? 'contained' : 'outlined'}
          style={styles.relayFilterButton}
          onPress={() => setShowFreeRelays((prev) => !prev)}
        >
          {t('relaysPage.freeAccess')}
        </Button>
        <Button
          mode={showPaidRelays ? 'contained' : 'outlined'}
          style={styles.relayFilterButton}
          onPress={() => setShowPaidRelays((prev) => !prev)}
        >
          {t('relaysPage.paid')}
        </Button>
      </View>
      <ScrollView horizontal={false}>
        <View style={styles.titleWrapper}>
          <Text style={styles.title} variant='titleMedium'>
            {t('relaysPage.myList')}
          </Text>
          <Divider />
        </View>
        <FlatList
          showsVerticalScrollIndicator={false}
          data={relays
            .filter((relay) => !relay.resilient || relay.resilient < 1)
            .filter((relay) => {
              return (
                ((relay.paid === undefined || relay.paid < 1) && showFreeRelays) ||
                (relay.paid !== undefined && relay.paid > 0 && showPaidRelays)
              )
            })}
          renderItem={renderItem}
          ItemSeparatorComponent={Divider}
        />
        <View style={styles.titleWrapper}>
          <Text style={styles.title} variant='titleMedium'>
            {t('relaysPage.contactsList')}
          </Text>
          <Divider />
        </View>
        <FlatList
          showsVerticalScrollIndicator={false}
          style={styles.relayList}
          data={relays
            .filter((relay) => relay.resilient && relay.resilient > 0)
            .filter((relay) => {
              return (
                (relay.resilient &&
                  (relay.paid === undefined || relay.paid < 1) &&
                  showFreeRelays) ??
                (relay.resilient && relay.paid !== undefined && relay.paid > 0 && showPaidRelays)
              )
            })}
          renderItem={renderItem}
          ItemSeparatorComponent={Divider}
        />
      </ScrollView>
      {online && (
        <>
          <AnimatedFAB
            style={styles.fabContacts}
            icon='cached'
            label='push'
            onPress={() => {
              calculateContactsRelays()
              bottomSheetContactsRef.current?.open()
            }}
            animateFrom='right'
            iconMode='static'
            extended={false}
          />
          <AnimatedFAB
            style={styles.fabPush}
            icon='upload-multiple'
            label='push'
            onPress={() => bottomSheetPushRef.current?.open()}
            animateFrom='right'
            iconMode='static'
            extended={false}
          />
        </>
      )}
      <AnimatedFAB
        style={styles.fabAdd}
        icon='plus'
        label='Add'
        onPress={() => bottomSheetAddRef.current?.open()}
        animateFrom='right'
        iconMode='static'
        extended={false}
      />
      {showNotification && (
        <Snackbar
          style={styles.snackbar}
          visible={showNotification !== undefined}
          duration={Snackbar.DURATION_SHORT}
          onIconPress={() => setShowNotification(undefined)}
          onDismiss={() => setShowNotification(undefined)}
        >
          {t(`relaysPage.notifications.${showNotification}`)}
        </Snackbar>
      )}
      <RBSheet ref={bottomSheetPushRef} closeOnDragDown={true} customStyles={rbSheetCustomStyles}>
        <View style={styles.addRelay}>
          <View style={styles.bottomDrawerButton}>
            <Text variant='titleLarge'>{t('relaysPage.pushListTitle')}</Text>
            <Text variant='bodyMedium'>{t('relaysPage.pushListDescription')}</Text>
          </View>
          <View style={styles.bottomDrawerButton}>
            <Button mode='contained' onPress={onPressPushRelay}>
              {t('relaysPage.pushList')}
            </Button>
          </View>
          <Button
            mode='outlined'
            onPress={() => {
              bottomSheetPushRef.current?.close()
            }}
          >
            {t('relaysPage.cancel')}
          </Button>
        </View>
      </RBSheet>
      <RBSheet
        ref={bottomSheetContactsRef}
        closeOnDragDown={true}
        customStyles={rbSheetCustomStyles}
      >
        <FlatList
          showsVerticalScrollIndicator={false}
          data={asignation}
          renderItem={renderContactRelayItem}
          ItemSeparatorComponent={Divider}
          style={styles.conteactRelaysList}
        />
        <View style={styles.bottomDrawerButton}>
          <Button mode='contained' onPress={onPressAddContactRelay}>
            {t('relaysPage.connectContactRelays')}
          </Button>
        </View>
        <Button mode='outlined' onPress={() => bottomSheetContactsRef.current?.close()}>
          {t('relaysPage.cancel')}
        </Button>
      </RBSheet>
      <RBSheet ref={bottomSheetAddRef} closeOnDragDown={true} customStyles={rbSheetCustomStyles}>
        <View style={styles.addRelay}>
          <View style={styles.bottomDrawerButton}>
            <TextInput
              mode='outlined'
              label={t('relaysPage.labelAdd') ?? ''}
              onChangeText={setAddRelayInput}
              value={addRelayInput}
              right={
                <TextInput.Icon
                  icon='content-paste'
                  onPress={pasteUrl}
                  forceTextInputFocus={false}
                />
              }
            />
          </View>
          <View style={styles.switchWrapper}>
            <Text>{t('relaysPage.paidRelay')}</Text>
            <Switch value={addRelayPaid} onValueChange={setAddRelayPaid} />
          </View>
          <View style={styles.bottomDrawerButton}>
            <Button mode='contained' onPress={onPressAddRelay}>
              {t('relaysPage.add')}
            </Button>
          </View>
          <Button
            mode='outlined'
            onPress={() => {
              bottomSheetAddRef.current?.close()
              setAddRelayInput(defaultRelayInput)
            }}
          >
            {t('relaysPage.cancel')}
          </Button>
        </View>
      </RBSheet>
    </View>
  )
}

const styles = StyleSheet.create({
  relayFilters: {
    paddingLeft: 16,
    flexDirection: 'row',
    paddingBottom: 16,
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
  titleAction: {
    marginTop: -5,
    marginBottom: -10,
  },
  bottomDrawerButton: {
    paddingTop: 16,
    paddingBottom: 16,
  },
  relayOptionButton: {
    margin: 0,
    marginRight: 10,
  },
  conteactRelaysList: {
    maxHeight: 400,
  },
  container: {
    padding: 0,
  },
  list: {
    paddingBottom: 130,
  },
  snackbar: {
    padding: 16,
    bottom: 70,
    flex: 1,
  },
  relayColor: {
    paddingTop: 9,
  },
  switch: {
    marginLeft: 32,
  },
  relayList: {
    paddingBottom: 260,
  },
  fabContacts: {
    bottom: 212,
    right: 16,
    position: 'absolute',
  },
  fabPush: {
    bottom: 142,
    right: 16,
    position: 'absolute',
  },
  fabAdd: {
    bottom: 72,
    right: 16,
    position: 'absolute',
  },
  addRelay: {
    alignContent: 'center',
    justifyContent: 'space-between',
  },
  relayActions: {
    flexDirection: 'row',
  },
  actionButton: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
  },
  switchWrapper: {
    justifyContent: 'space-between',
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  divider: {
    marginBottom: 26,
    marginTop: 26,
  },
  centralizedRelay: {
    paddingRight: 10,
  },
  smallRelay: {
    paddingRight: 10,
  },
  resilienceDrawer: {
    height: 630,
    justifyContent: 'space-between',
  },
  relayButtons: {
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  relayButton: {
    marginRight: 12,
  },
  relayFilterButton: {
    borderRadius: 8,
    marginRight: 16,
  },
  relayItem: {
    paddingLeft: 16,
    paddingRight: 16,
  },
  relayActionButtons: {
    flexDirection: 'row',
  },
})

export default RelaysPage
