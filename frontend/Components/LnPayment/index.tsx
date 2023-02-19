import React, { useEffect, useMemo, useState } from 'react'
import { User } from '../../Functions/DatabaseFunctions/Users'
import { ListRenderItem, StyleSheet, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import RBSheet from 'react-native-raw-bottom-sheet'
import { Button, Divider, Text, TextInput, TouchableRipple, useTheme } from 'react-native-paper'
import { AppContext } from '../../Contexts/AppContext'
import LnPreview from '../LnPreview'
import { Note } from '../../Functions/DatabaseFunctions/Notes'
import { getNpub } from '../../lib/nostr/Nip19'
import { formatPubKey } from '../../Functions/RelayFunctions/Users'
import { getZaps, Zap } from '../../Functions/DatabaseFunctions/Zaps'
import { FlatList, ScrollView } from 'react-native-gesture-handler'
import ProfileData from '../ProfileData'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import { RelayPoolContext } from '../../Contexts/RelayPoolContext'
import { Kind } from 'nostr-tools'
import { getUnixTime } from 'date-fns'
import { Event, signEvent } from '../../lib/nostr/Events'
import { getRelays, Relay } from '../../Functions/DatabaseFunctions/Relays'
import { UserContext } from '../../Contexts/UserContext'
import { requestInvoiceWithServiceParams, requestPayServiceParams } from 'lnurl-pay'
import axios from 'axios'

interface LnPaymentProps {
  open: boolean
  setOpen: (open: boolean) => void
  note?: Note
  user?: User
}

export const LnPayment: React.FC<LnPaymentProps> = ({ open, setOpen, note, user }) => {
  const theme = useTheme()
  const { t } = useTranslation('common')
  const { getSatoshiSymbol, database, setDisplayUserDrawer } = React.useContext(AppContext)
  const { relayPool, lastEventId } = React.useContext(RelayPoolContext)
  const { publicKey, privateKey } = React.useContext(UserContext)
  const bottomSheetLnPaymentRef = React.useRef<RBSheet>(null)
  const [monto, setMonto] = useState<string>('')
  const defaultComment = note?.id ? `Nostr: ${formatPubKey(getNpub(note?.id))}` : ''
  const [comment, setComment] = useState<string>(defaultComment)
  const [invoice, setInvoice] = useState<string>()
  const [loading, setLoading] = useState<boolean>(false)
  const [isZap, setIsZap] = useState<boolean>(false)
  const [zapsUpdated, setZapsUpdated] = useState<number>(0)
  const [zaps, setZaps] = useState<Zap[]>([])
  const lnurl = useMemo(() => user?.lnurl ?? note?.lnurl, [open])
  const lnAddress = useMemo(() => user?.ln_address ?? note?.ln_address, [open])
  const userId = user?.id ?? note?.pubkey
  const zapPubkey = user?.zap_pubkey ?? note?.zap_pubkey

  useEffect(() => {
    setMonto('')
    if (open) {
      if (database && note?.id) {
        getZaps(database, note?.id).then((results) => {
          relayPool?.subscribe('zappers-meta', [
            {
              kinds: [Kind.Metadata],
              authors: results.filter((zap) => !zap.name).map((zap) => zap.zapper_user_id),
            },
          ])
          setZaps(results)
        })
      }
      bottomSheetLnPaymentRef.current?.open()
    } else {
      bottomSheetLnPaymentRef.current?.close()
    }
  }, [open])

  useEffect(() => {
    if (database && note?.id) {
      getZaps(database, note?.id).then((results) => {
        setZaps(results)
        setZapsUpdated(getUnixTime(new Date()))
      })
    }
  }, [lastEventId])

  useEffect(() => {
    bottomSheetLnPaymentRef.current?.forceUpdate()
  }, [zapsUpdated])

  const generateInvoice: (zap: boolean) => void = async (zap) => {
    setIsZap(zap)
    const lud = lnAddress && lnAddress !== '' ? lnAddress : lnurl

    if (lud && lud !== '' && monto !== '') {
      setLoading(true)

      const tokens: number = parseInt(monto, 10) ?? 0
      let nostr: string

      if (zap && database && privateKey && publicKey && zapPubkey && userId) {
        const relays: Relay[] = await getRelays(database)
        const tags = [
          ['p', userId],
          ['amount', (tokens * 1000).toString()],
          ['relays', ...relays.map((relay) => relay.url)],
        ]
        if (note?.id) tags.push(['e', note.id])

        const event: Event = {
          content: comment,
          created_at: getUnixTime(new Date()),
          kind: 9734,
          pubkey: publicKey,
          tags,
        }
        const signedEvent = await signEvent(event, privateKey)
        nostr = JSON.stringify(signedEvent)
      }

      const serviceParams = await requestPayServiceParams({ lnUrlOrAddress: lud })

      requestInvoiceWithServiceParams({
        params: serviceParams,
        lnUrlOrAddress: lud,
        tokens,
        comment,
        fetchGet: async ({ url, params }) => {
          if (params && nostr && serviceParams.rawData.allowsNostr) {
            params.nostr = nostr
          }
          const response = await axios.get(url, {
            params,
          })
          console.log(response)
          return response.data
        },
      })
        .then((action) => {
          if (action.hasValidAmount && action.invoice) {
            setInvoice(action.invoice)
          }
          setLoading(false)
        })
        .catch((e) => {
          setLoading(false)
        })
    }
  }

  const renderZapperItem: ListRenderItem<Zap> = ({ item }) => {
    return (
      <TouchableRipple onPress={() => setDisplayUserDrawer(item.user_id)}>
        <View key={item.id} style={styles.zapperRow}>
          <View style={styles.zapperData}>
            <ProfileData
              username={item?.name}
              publicKey={getNpub(item.id)}
              validNip05={item?.valid_nip05}
              nip05={item?.nip05}
              lnurl={item?.lnurl}
              lnAddress={item?.ln_address}
              picture={item?.picture}
            />
          </View>
          <View style={styles.zapperAmount}>
            <MaterialCommunityIcons
              style={styles.zapperAmountIcon}
              name='lightning-bolt'
              size={15}
              color={'#F5D112'}
            />
            <Text>
              {item.amount} {getSatoshiSymbol(15)}
            </Text>
          </View>
        </View>
      </TouchableRipple>
    )
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

  return (
    <>
      <RBSheet
        ref={bottomSheetLnPaymentRef}
        closeOnDragDown={true}
        customStyles={rbSheetCustomStyles}
        onClose={() => {
          relayPool?.unsubscribe(['zappers-meta'])
          setOpen(false)
        }}
      >
        <View style={styles.drawerBottom}>
          {zaps.length > 0 && (
            <View style={styles.zappers}>
              <View style={styles.zappersList}>
                <ScrollView>
                  <FlatList data={zaps} renderItem={renderZapperItem} />
                </ScrollView>
              </View>
              <Divider />
            </View>
          )}
          <View style={[styles.montoSelection, styles.spacer]}>
            <Button style={styles.montoButton} mode='outlined' onPress={() => setMonto('1000')}>
              <Text>1k {getSatoshiSymbol(15)}</Text>
            </Button>
            <Button style={styles.montoButton} mode='outlined' onPress={() => setMonto('5000')}>
              <Text>5k {getSatoshiSymbol(15)}</Text>
            </Button>
            <Button style={styles.montoButton} mode='outlined' onPress={() => setMonto('10000')}>
              <Text>10k {getSatoshiSymbol(15)}</Text>
            </Button>
          </View>
          <TextInput
            style={styles.spacer}
            mode='outlined'
            label={t('lnPayment.monto') ?? ''}
            onChangeText={setMonto}
            value={monto}
            keyboardType='decimal-pad'
          />
          <TextInput
            style={styles.spacer}
            mode='outlined'
            label={t('lnPayment.comment') ?? ''}
            onChangeText={setComment}
            value={comment}
          />
          <Button
            style={styles.spacer}
            mode='contained'
            disabled={loading || monto === ''}
            onPress={() => generateInvoice(false)}
            loading={loading && !isZap}
          >
            {t('lnPayment.anonTip')}
          </Button>
          <Button
            style={styles.spacer}
            mode='contained'
            disabled={loading || monto === ''}
            onPress={() => generateInvoice(true)}
            loading={loading && isZap}
          >
            {t('lnPayment.zap')}
          </Button>
          <Button mode='outlined' onPress={() => setOpen(false)}>
            {t('lnPayment.cancel')}
          </Button>
        </View>
      </RBSheet>
      <LnPreview invoice={invoice} setInvoice={setInvoice} setOpen={setOpen} />
    </>
  )
}

const styles = StyleSheet.create({
  drawerBottom: {
    justifyContent: 'space-between',
  },
  spacer: {
    marginBottom: 16,
  },
  qrContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrText: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  satoshi: {
    fontFamily: 'Satoshi-Symbol',
    fontSize: 20,
  },
  zappersList: {
    maxHeight: 200,
    marginBottom: 16,
  },
  zappers: {
    marginBottom: 16,
  },
  montoSelection: {
    flexDirection: 'row',
  },
  montoButton: {
    flex: 2,
  },
  actionButton: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  qr: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  zapperRow: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  zapperData: {
    flex: 1,
  },
  zapperAmount: {
    flexDirection: 'row',
  },
  zapperAmountIcon: {
    paddingTop: 3,
  },
})

export default LnPayment
