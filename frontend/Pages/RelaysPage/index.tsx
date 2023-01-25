import React, { useContext, useState } from 'react'
import { FlatList, ListRenderItem, ScrollView, StyleSheet, View } from 'react-native'
import Clipboard from '@react-native-clipboard/clipboard'
import { useTranslation } from 'react-i18next'
import { RelayPoolContext } from '../../Contexts/RelayPoolContext'
import { Relay } from '../../Functions/DatabaseFunctions/Relays'
import { defaultRelays, REGEX_SOCKET_LINK } from '../../Constants/Relay'
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

export const RelaysPage: React.FC = () => {
  const defaultRelayInput = React.useMemo(() => 'wss://', [])
  const { activeRelayItem, desactiveRelayItem, addRelayItem, removeRelayItem, relays } =
    useContext(RelayPoolContext)
  const { t } = useTranslation('common')
  const theme = useTheme()
  const bottomSheetAddRef = React.useRef<RBSheet>(null)
  const bottomSheetEditRef = React.useRef<RBSheet>(null)
  const [selectedRelay, setSelectedRelay] = useState<Relay>()
  const [addRelayInput, setAddRelayInput] = useState<string>(defaultRelayInput)
  const [showNotification, setShowNotification] = useState<string>()

  const addRelay: (url: string) => void = (url) => {
    addRelayItem({
      url,
      active: true,
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
    activeRelayItem(relay).then(() => {
      setShowNotification('active')
    })
  }

  const desactiveRelay: (relay: Relay) => void = (relay) => {
    desactiveRelayItem(relay).then(() => {
      setShowNotification('desactive')
    })
  }

  const onPressAddRelay: () => void = () => {
    if (REGEX_SOCKET_LINK.test(addRelayInput)) {
      bottomSheetAddRef.current?.close()
      addRelay(addRelayInput)
      setAddRelayInput(defaultRelayInput)
    } else {
      bottomSheetAddRef.current?.close()
      setShowNotification('badFormat')
    }
  }

  const relayToggle: (relay: Relay) => JSX.Element = (relay) => {
    return (
      <Switch
        value={relay.active}
        onValueChange={() => (relay.active ? desactiveRelay(relay) : activeRelay(relay))}
      />
    )
  }

  const renderItem: ListRenderItem<Relay> = ({ index, item }) => (
    <List.Item
      key={index}
      title={item.url.split('wss://')[1]?.split('/')[0]}
      right={() => relayToggle(item)}
      onPress={() => {
        setSelectedRelay(item)
        bottomSheetEditRef.current?.open()
      }}
    />
  )

  const rbSheetCustomStyles = React.useMemo(() => {
    return {
      container: {
        backgroundColor: theme.colors.background,
        padding: 16,
        borderTopRightRadius: 28,
        borderTopLeftRadius: 28,
      },
    }
  }, [])

  const myRelays = relays.filter((relay) => !defaultRelays.includes(relay.url))

  return (
    <View style={styles.container}>
      <ScrollView horizontal={false}>
        {myRelays && (
          <>
            <Text style={styles.title} variant='titleMedium'>
              {t('relaysPage.myList')}
            </Text>
            <FlatList style={styles.list} data={myRelays} renderItem={renderItem} />
          </>
        )}
        <Text style={styles.title} variant='titleMedium'>
          {t('relaysPage.recommended')}
        </Text>
        <FlatList
          style={styles.list}
          data={defaultRelays.map((url) => {
            return {
              url,
              active: relays.find((relay) => relay.url === url) !== undefined,
            }
          })}
          renderItem={renderItem}
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
        ref={bottomSheetAddRef}
        closeOnDragDown={true}
        height={260}
        customStyles={rbSheetCustomStyles}
      >
        <View style={styles.addRelay}>
          <TextInput
            mode='outlined'
            label={t('relaysPage.labelAdd') ?? ''}
            onChangeText={setAddRelayInput}
            value={addRelayInput}
          />
          <Button mode='contained' onPress={onPressAddRelay}>
            {t('relaysPage.add')}
          </Button>
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
      <RBSheet
        ref={bottomSheetEditRef}
        closeOnDragDown={true}
        height={260}
        customStyles={rbSheetCustomStyles}
      >
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
  title: {
    paddingLeft: 16,
  },
  container: {
    padding: 0,
    paddingBottom: 32,
  },
  list: {
    padding: 0,
    paddingBottom: 45,
  },
  snackbar: {
    margin: 16,
    bottom: 70,
  },
  fab: {
    bottom: 16,
    right: 16,
    position: 'absolute',
  },
  addRelay: {
    alignContent: 'center',
    height: '80%',
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
})

export default RelaysPage
