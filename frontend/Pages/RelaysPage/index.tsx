import React, { useContext, useState } from 'react'
import { FlatList, ListRenderItem, ScrollView, StyleSheet, View } from 'react-native'
import Clipboard from '@react-native-clipboard/clipboard'
import { useTranslation } from 'react-i18next'
import { RelayPoolContext } from '../../Contexts/RelayPoolContext'
import { Relay } from '../../Functions/DatabaseFunctions/Relays'
import { REGEX_SOCKET_LINK } from '../../Constants/Relay'
import {
  List,
  Switch,
  AnimatedFAB,
  useTheme,
  Text,
  Button,
  TextInput,
  IconButton,
  Divider,
  Snackbar,
} from 'react-native-paper'
import RBSheet from 'react-native-raw-bottom-sheet'
import { relayToColor } from '../../Functions/NativeFunctions'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import { useFocusEffect } from '@react-navigation/native'

export const defaultRelays = [
  'wss://brb.io',
  'wss://damus.io',
  'wss://nostr-pub.wellorder.net',
  'wss://nostr.swiss-enigma.ch',
  'wss://nostr.onsats.org',
  'wss://nostr-pub.semisol.dev',
  'wss://nostr.openchain.fr',
  'wss://relay.nostr.info',
  'wss://nostr.oxtr.dev',
  'wss://nostr.ono.re',
  'wss://relay.grunch.dev',
  'wss://nostr.developer.li',
]

export const RelaysPage: React.FC = () => {
  const defaultRelayInput = React.useMemo(() => 'wss://', [])
  const { updateRelayItem, addRelayItem, removeRelayItem, relays, relayPool } =
    useContext(RelayPoolContext)
  const { t } = useTranslation('common')
  const theme = useTheme()
  const bottomSheetAddRef = React.useRef<RBSheet>(null)
  const bottomSheetEditRef = React.useRef<RBSheet>(null)
  const bottomSheetResilenseRef = React.useRef<RBSheet>(null)
  const [selectedRelay, setSelectedRelay] = useState<Relay>()
  const [addRelayInput, setAddRelayInput] = useState<string>(defaultRelayInput)
  const [showNotification, setShowNotification] = useState<string>()

  useFocusEffect(
    React.useCallback(() => {
      relayPool?.unsubscribeAll()

      return () => {}
    }, []),
  )

  const addRelay: (url: string) => void = (url) => {
    addRelayItem({
      url,
      active: 1,
      global_feed: 1,
    }).then(() => {
      setShowNotification('add')
    })
  }

  const removeRelay: (url: string) => void = (url) => {
    removeRelayItem({
      url,
    }).then(() => {
      setShowNotification('remove')
    })
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

  const myRelays = relayList.filter((relay) => !defaultRelays.includes(relay.url))

  const renderItem: ListRenderItem<Relay> = ({ item, index }) => {
    return (
      <List.Item
        key={index}
        title={item.url.split('wss://')[1]?.split('/')[0]}
        right={() => (
          <>
            <Switch
              value={item.global_feed !== undefined && item.global_feed > 0}
              onValueChange={() =>
                item.global_feed ? desactiveGlobalFeedRelay(item) : activeGlobalFeedRelay(item)
              }
            />
            <Switch
              style={styles.switch}
              value={item.active !== undefined && item.active > 0}
              onValueChange={() => (item.active ? desactiveRelay(item) : activeRelay(item))}
            />
          </>
        )}
        left={() => (
          <MaterialCommunityIcons
            style={styles.relayColor}
            name='circle'
            color={relayToColor(item.url)}
          />
        )}
        onPress={() => {
          setSelectedRelay(item)
          bottomSheetEditRef.current?.open()
        }}
      />
    )
  }

  const renderResilienceItem: (item: string, index: number, type?: string) => JSX.Element = (
    item,
    index,
    type,
  ) => {
    return (
      <List.Item
        key={index}
        title={item.split('wss://')[1]?.split('/')[0]}
        left={() => (
          <MaterialCommunityIcons
            style={styles.relayColor}
            name='circle'
            color={relayToColor(item)}
          />
        )}
        right={() => (
          <>
            {type === 'centralized' && (
              <Text style={[styles.smallRelay, { color: theme.colors.errorContainer }]}>
                {relayPool?.resilientAssignation.centralizedRelays[item] &&
                  t('relaysPage.centralized')}
              </Text>
            )}
            {type === 'small' && (
              <Text style={[styles.smallRelay, { color: theme.colors.error }]}>
                {relayPool?.resilientAssignation.smallRelays[item] && t('relaysPage.small')}
              </Text>
            )}
            <Text>
              {type === undefined && relayPool?.resilientAssignation.resilientRelays[item]?.length}
              {type === 'small' && relayPool?.resilientAssignation.smallRelays[item]?.length}
              {type === 'centralized' &&
                relayPool?.resilientAssignation.centralizedRelays[item]?.length}
            </Text>
          </>
        )}
      />
    )
  }

  return (
    <View style={styles.container}>
      <ScrollView horizontal={false}>
        <View style={styles.titleWrapper}>
          <View style={styles.title}>
            <Text style={styles.title} variant='titleMedium'>
              {t('relaysPage.resilienceMode')}
            </Text>
            <IconButton
              style={styles.titleAction}
              icon='question'
              size={20}
              onPress={() => bottomSheetResilenseRef.current?.open()}
            />
          </View>
          <Divider />
        </View>
        <List.Item
          title={t('relaysPage.relayName')}
          right={() => <Text style={styles.listHeader}>{t('relaysPage.contacts')}</Text>}
        />
        <FlatList
          showsVerticalScrollIndicator={false}
          data={Object.keys(relayPool?.resilientAssignation.resilientRelays ?? {})}
          renderItem={(data) => renderResilienceItem(data.item, data.index)}
        />
        <View style={styles.titleWrapper}>
          <Divider />
        </View>
        <FlatList
          showsVerticalScrollIndicator={false}
          data={Object.keys(relayPool?.resilientAssignation.centralizedRelays ?? {})}
          renderItem={(data) => renderResilienceItem(data.item, data.index, 'centralized')}
        />
        <FlatList
          showsVerticalScrollIndicator={false}
          data={Object.keys(relayPool?.resilientAssignation.smallRelays ?? {})}
          renderItem={(data) => renderResilienceItem(data.item, data.index, 'small')}
        />
        {myRelays.length > 0 && (
          <>
            <View style={styles.titleWrapper}>
              <Text style={styles.title} variant='titleMedium'>
                {t('relaysPage.myList')}
              </Text>
              <Divider />
            </View>
            <List.Item
              title={t('relaysPage.relayName')}
              right={() => (
                <>
                  <Text style={styles.listHeader}>{t('relaysPage.globalFeed')}</Text>
                  <Text style={styles.listHeader}>{t('relaysPage.active')}</Text>
                </>
              )}
            />
            <FlatList
              showsVerticalScrollIndicator={false}
              data={myRelays}
              renderItem={renderItem}
            />
          </>
        )}
        <View style={styles.titleWrapper}>
          <Text style={styles.title} variant='titleMedium'>
            {t('relaysPage.recommended')}
          </Text>
          <Divider />
        </View>
        <List.Item
          title={t('relaysPage.relayName')}
          right={() => (
            <>
              <Text style={styles.listHeader}>{t('relaysPage.globalFeed')}</Text>
              <Text style={styles.listHeader}>{t('relaysPage.active')}</Text>
            </>
          )}
        />
        <FlatList
          showsVerticalScrollIndicator={false}
          data={defaultRelays.map(
            (url) =>
              relays.find((relay) => relay.url === url && relay.active && relay.active > 0) ?? {
                url,
              },
          )}
          renderItem={renderItem}
          style={styles.list}
        />
      </ScrollView>
      <AnimatedFAB
        style={styles.fab}
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
      <RBSheet
        ref={bottomSheetResilenseRef}
        closeOnDragDown={true}
        customStyles={rbSheetCustomStyles}
      >
        <View style={styles.resilienceDrawer}>
          <Text variant='headlineSmall'>{t('relaysPage.resilienceTitle')}</Text>
          <Text variant='bodyMedium'>{t('relaysPage.resilienceDescription')}</Text>
          <Text variant='titleMedium'>{t('relaysPage.resilienceCategories')}</Text>
          <Text variant='bodyMedium'>{t('relaysPage.resilienceCategoriesDescription')}</Text>
        </View>
      </RBSheet>
      <RBSheet ref={bottomSheetAddRef} closeOnDragDown={true} customStyles={rbSheetCustomStyles}>
        <View style={styles.addRelay}>
          <View style={styles.bottomDrawerButton}>
            <TextInput
              mode='outlined'
              label={t('relaysPage.labelAdd') ?? ''}
              onChangeText={setAddRelayInput}
              value={addRelayInput}
            />
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
      <RBSheet ref={bottomSheetEditRef} closeOnDragDown={true} customStyles={rbSheetCustomStyles}>
        <View>
          <View style={styles.relayActions}>
            <View style={styles.actionButton}>
              <IconButton
                icon='trash-can-outline'
                size={28}
                onPress={() => {
                  if (selectedRelay) removeRelay(selectedRelay.url)
                  bottomSheetEditRef.current?.close()
                }}
              />
              <Text>{t('relaysPage.removeRelay')}</Text>
            </View>
            <View style={styles.actionButton}>
              <IconButton
                icon='content-copy'
                size={28}
                onPress={() => {
                  if (selectedRelay) Clipboard.setString(selectedRelay.url)
                }}
              />
              <Text>{t('relaysPage.copyRelay')}</Text>
            </View>
          </View>
          <Divider style={styles.divider} />
          <Text variant='titleLarge'>{selectedRelay?.url.split('wss://')[1]?.split('/')[0]}</Text>
        </View>
      </RBSheet>
    </View>
  )
}

const styles = StyleSheet.create({
  titleWrapper: {
    marginBottom: 4,
    marginTop: 24,
    paddingRight: 16,
  },
  title: {
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  titleAction: {
    marginTop: -5,
    marginBottom: -10,
  },
  bottomDrawerButton: {
    paddingBottom: 16,
  },
  container: {
    padding: 0,
    paddingLeft: 16,
  },
  list: {
    paddingBottom: 130,
  },
  snackbar: {
    margin: 16,
    bottom: 70,
  },
  relayColor: {
    paddingTop: 9,
  },
  switch: {
    marginLeft: 32,
  },
  listHeader: {
    paddingRight: 5,
    paddingLeft: 16,
    textAlign: 'center',
  },
  fab: {
    bottom: 65,
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
    height: 600,
    justifyContent: 'space-between',
  },
})

export default RelaysPage
