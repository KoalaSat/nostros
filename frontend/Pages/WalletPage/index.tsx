import Clipboard from '@react-native-clipboard/clipboard'
import { useFocusEffect } from '@react-navigation/native'
import { differenceInDays, format, fromUnixTime, isSameDay } from 'date-fns'
import { t } from 'i18next'
import React, { useEffect, useMemo } from 'react'
import { type ListRenderItem, StyleSheet, View } from 'react-native'
import { FlatList } from 'react-native-gesture-handler'
import {
  Avatar,
  Button,
  Snackbar,
  Text,
  TextInput,
  TouchableRipple,
  useTheme,
} from 'react-native-paper'
import RBSheet from 'react-native-raw-bottom-sheet'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import Logo from '../../Components/Logo'
import NostrosAvatar from '../../Components/NostrosAvatar'
import { AppContext } from '../../Contexts/AppContext'
import { RelayPoolContext } from '../../Contexts/RelayPoolContext'
import { UserContext } from '../../Contexts/UserContext'
import { WalletContext } from '../../Contexts/WalletContext'
import { getZaps, type Zap } from '../../Functions/DatabaseFunctions/Zaps'
import type WalletAction from '../../lib/Lightning'
import { navigate } from '../../lib/Navigation'

export const WalletPage: React.FC = () => {
  const theme = useTheme()
  const { getSatoshiSymbol, database, setDisplayUserDrawer, online } = React.useContext(AppContext)
  const { publicKey } = React.useContext(UserContext)
  const { relayPool, lastEventId } = React.useContext(RelayPoolContext)
  const { refreshWallet, updateWallet, type, balance, transactions, invoices, updatedAt } =
    React.useContext(WalletContext)
  const [lnHubAddress, setLndHubAddress] = React.useState<string>()
  const [lnBitsAddress, setLnBitsAddress] = React.useState<string>()
  const [lnBitsInvoiceKey, setLnBitsInvoiceKey] = React.useState<string>()
  const [lnBitsAdminKey, setLnBitsAdminKey] = React.useState<string>()
  const [showNotification, setShowNotification] = React.useState<undefined | string>()
  const [actions, setActions] = React.useState<WalletAction[]>([])
  const [zaps, setZaps] = React.useState<Record<string, Zap>>({})
  const bottomLndHubRef = React.useRef<RBSheet>(null)
  const bottomLndBitsRef = React.useRef<RBSheet>(null)

  useFocusEffect(
    React.useCallback(() => {
      updateWallet()
      return () => {
        if (publicKey) relayPool?.unsubscribe([`profile-zaps${publicKey.substring(0, 8)}`])
      }
    }, []),
  )

  useEffect(() => {
    if (database && publicKey) {
      const preimages: string[] = actions.filter((item) => item.id !== '').map((item) => item.id)

      getZaps(database, { preimages }).then((results) => {
        if (results) {
          const map: Record<string, Zap> = {}
          results.forEach((zap) => {
            if (!zap.preimage || zap.preimage === '') return
            map[zap.preimage] = zap
          })
          setZaps(map)
        }
      })
      relayPool?.subscribe(`profile-zaps${publicKey.substring(0, 8)}`, [
        {
          kinds: [9735],
          '#preimage': preimages,
        },
      ])
    }
  }, [lastEventId, online])

  useEffect(() => {
    const array = [...transactions, ...invoices]
      .filter((item) => item.id !== '')
      .sort((item1, item2) => item2.timestamp - item1.timestamp)
    setActions(array)
  }, [updatedAt])

  const paste: (setFunction: (value: string) => void) => void = (setFunction) => {
    Clipboard.getString().then((value) => {
      setFunction(value ?? '')
    })
  }

  const connectLndHub: () => void = () => {
    const lnHubRegExp = /^lndhub:\/\/(\S*):(\S*)@(\S*)$/gi
    if (lnHubAddress) {
      const match = [...lnHubAddress.matchAll(lnHubRegExp)]
      if (match.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        let [_full, login, password, uri] = match[0]
        if (uri[uri.length - 1] === '/') {
          uri = uri.substring(0, uri.length - 1)
        }
        refreshWallet({ login, password, uri }, 'lndHub')
        setLndHubAddress(undefined)
        bottomLndHubRef.current?.close()
      }
    }
  }

  const connectLnBits: () => void = () => {
    if (lnBitsAddress && lnBitsAdminKey && lnBitsInvoiceKey) {
      let uri = lnBitsAddress
      if (uri[uri.length - 1] === '/') {
        uri = uri.substring(0, uri.length - 1)
      }
      refreshWallet({ lnBitsAddress, lnBitsAdminKey, lnBitsInvoiceKey }, 'lnBits')
      setLnBitsAddress(undefined)
      setLnBitsAdminKey(undefined)
      setLnBitsInvoiceKey(undefined)
      bottomLndBitsRef.current?.close()
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

  const login = useMemo(
    () => (
      <View style={styles.center}>
        <Button mode='contained' onPress={() => bottomLndHubRef.current?.open()}>
          {t('walletPage.addLnhub')}
        </Button>
        <Button
          mode='contained'
          style={styles.button}
          onPress={() => bottomLndBitsRef.current?.open()}
        >
          {t('walletPage.addLnBits')}
        </Button>
      </View>
    ),
    [],
  )

  const renderAction: ListRenderItem<WalletAction> = ({ item, index }) => {
    const date = fromUnixTime(item.timestamp)
    const prevDate = index > 0 ? fromUnixTime(actions[index - 1].timestamp) : new Date()

    const formatPattern = differenceInDays(new Date(), date) < 7 ? 'EEEE' : 'MM-dd-yy'

    const zap = item.id !== '' ? zaps[item.id] : undefined

    return (
      <View>
        {(index === 0 || !isSameDay(date, prevDate)) && (
          <Text variant='titleMedium'>{format(date, formatPattern)}</Text>
        )}
        <TouchableRipple
          onPress={() => {
            if (zap) {
              if (zap.zapped_event_id) {
                navigate('Note', { noteId: zap.zapped_event_id })
              } else if (zap.zapper_user_id) {
                setDisplayUserDrawer(zap.zapper_user_id)
              }
            }
          }}
          disabled={!zap}
        >
          <View style={styles.listItem}>
            <View style={styles.listAvatar}>
              {zap ? (
                <NostrosAvatar
                  name={zap.name}
                  pubKey={zap.user_id}
                  src={zap.picture}
                  lnurl={zap.lnurl}
                  lnAddress={zap.ln_address}
                  size={36}
                />
              ) : (
                <Avatar.Text size={36} label='?' />
              )}
            </View>
            <View style={styles.listItemSection}>
              <View style={styles.row}>
                <View style={styles.listData}>
                  <View style={styles.row}>
                    <Text>
                      {item.type === 'transaction' && '-'}
                      {`${item.monto} `}
                    </Text>
                    <Text style={styles.listItemSymbol}>{getSatoshiSymbol()}</Text>
                  </View>
                  <View style={styles.row}>
                    <Text>{format(date, 'HH:mm')}</Text>
                  </View>
                </View>
              </View>
              <View style={styles.row}>
                <Text style={{ color: theme.colors.onSurfaceVariant }}>{item.description}</Text>
              </View>
            </View>
            <View style={styles.listIcon}>
              {item.type === 'transaction' ? (
                <MaterialCommunityIcons
                  name='arrow-top-right'
                  size={25}
                  color={theme.colors.error}
                />
              ) : (
                <MaterialCommunityIcons name='arrow-bottom-left' size={25} color='#7ADC70' />
              )}
            </View>
          </View>
        </TouchableRipple>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {type ? (
        balance !== undefined ? (
          <View>
            <View style={[styles.balance, { backgroundColor: theme.colors.onSecondary }]}>
              <View style={styles.balanceNumber}>
                <Text variant='displayMedium'>{`${balance} `}</Text>
                <Text style={styles.balanceSymbol} variant='headlineSmall'>
                  {getSatoshiSymbol()}
                </Text>
              </View>
            </View>
            <FlatList
              data={actions}
              renderItem={renderAction}
              style={styles.list}
              keyExtractor={(item) => item.id + item.timestamp}
            />
          </View>
        ) : (
          <View style={styles.center}>
            <View style={styles.centerItem}>
              <Logo onlyIcon size='large' />
            </View>
            <Text style={styles.centerItem}>{t('walletPage.connectingWallet')}</Text>
          </View>
        )
      ) : (
        login
      )}
      {showNotification && (
        <Snackbar
          style={styles.snackbar}
          visible={showNotification !== undefined}
          duration={Snackbar.DURATION_SHORT}
          onIconPress={() => setShowNotification(undefined)}
          onDismiss={() => setShowNotification(undefined)}
        >
          {t(`walletPage.notifications.${showNotification}`)}
        </Snackbar>
      )}
      <RBSheet ref={bottomLndHubRef} closeOnDragDown={true} customStyles={bottomSheetStyles}>
        <View>
          <Text variant='headlineSmall' style={styles.drawerParagraph}>
            {t('walletPage.addLnhub')}
          </Text>
          <TextInput
            style={styles.drawerParagraph}
            mode='outlined'
            multiline
            label={t('walletPage.lnHub') ?? ''}
            onChangeText={setLndHubAddress}
            value={lnHubAddress}
            right={
              <TextInput.Icon
                icon='content-paste'
                onPress={() => paste(setLndHubAddress)}
                forceTextInputFocus={false}
              />
            }
          />
          <Button mode='contained' onPress={connectLndHub} disabled={lnHubAddress === undefined}>
            {t('walletPage.connect')}
          </Button>
        </View>
      </RBSheet>
      <RBSheet ref={bottomLndBitsRef} closeOnDragDown={true} customStyles={bottomSheetStyles}>
        <View>
          <Text variant='headlineSmall' style={styles.drawerParagraph}>
            {t('walletPage.addLnBits')}
          </Text>
          <TextInput
            style={styles.drawerParagraph}
            mode='outlined'
            multiline
            label={t('walletPage.address') ?? ''}
            onChangeText={setLnBitsAddress}
            value={lnBitsAddress}
            right={
              <TextInput.Icon
                icon='content-paste'
                onPress={() => paste(setLnBitsAddress)}
                forceTextInputFocus={false}
              />
            }
          />
          <TextInput
            style={styles.drawerParagraph}
            mode='outlined'
            multiline
            label={t('walletPage.adminKey') ?? ''}
            onChangeText={setLnBitsAdminKey}
            value={lnBitsAdminKey}
            right={
              <TextInput.Icon
                icon='content-paste'
                onPress={() => paste(setLnBitsAdminKey)}
                forceTextInputFocus={false}
              />
            }
          />
          <TextInput
            style={styles.drawerParagraph}
            mode='outlined'
            multiline
            label={t('walletPage.invoiceReadKey') ?? ''}
            onChangeText={setLnBitsInvoiceKey}
            value={lnBitsInvoiceKey}
            right={
              <TextInput.Icon
                icon='content-paste'
                onPress={() => paste(setLnBitsInvoiceKey)}
                forceTextInputFocus={false}
              />
            }
          />
          <Button
            mode='contained'
            onPress={connectLnBits}
            disabled={
              lnBitsAddress === undefined ||
              lnBitsAdminKey === undefined ||
              lnBitsInvoiceKey === undefined
            }
          >
            {t('walletPage.connect')}
          </Button>
        </View>
      </RBSheet>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'space-between',
    alignContent: 'center',
  },
  center: {
    justifyContent: 'center',
    height: '100%',
    padding: 16,
  },
  centerItem: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    textAlign: 'center',
  },
  button: {
    marginTop: 16,
  },
  drawerParagraph: {
    marginBottom: 16,
  },
  snackbar: {
    marginBottom: 85,
    flex: 1,
  },
  balance: {
    height: 180,
    justifyContent: 'center',
  },
  balanceNumber: {
    justifyContent: 'center',
    flexDirection: 'row',
  },
  balanceSymbol: {
    paddingTop: 18,
  },
  list: {
    paddingLeft: 16,
    paddingTop: 16,
  },
  listItem: {
    paddingTop: 16,
    paddingBottom: 16,
    flexDirection: 'row',
  },
  row: {
    flexDirection: 'row',
  },
  listAvatar: {
    width: '15%',
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  listIcon: {
    width: '10%',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  listItemSection: {
    width: '70%',
    justifyContent: 'space-between',
    paddingLeft: 16,
    paddingRight: 16,
  },
  listItemSymbol: {
    paddingTop: 5,
  },
  listData: {
    justifyContent: 'space-between',
    flexDirection: 'row',
    width: '100%',
  },
})

export default WalletPage
