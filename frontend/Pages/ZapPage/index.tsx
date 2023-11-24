import React, { useEffect, useMemo, useState } from 'react'
import { type Note } from '../../Functions/DatabaseFunctions/Notes'
import { Button, Text, TextInput, TouchableRipple } from 'react-native-paper'
import { useTranslation } from 'react-i18next'
import { open } from 'react-native-quick-sqlite'
import type RBSheet from 'react-native-raw-bottom-sheet'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import ProfileData from '../../Components/ProfileData'
import { AppContext } from '../../Contexts/AppContext'
import { RelayPoolContext } from '../../Contexts/RelayPoolContext'
import { UserContext } from '../../Contexts/UserContext'
import { type Zap, getZaps } from '../../Functions/DatabaseFunctions/Zaps'
import { formatPubKey } from '../../Functions/RelayFunctions/Users'
import { lightningInvoice } from '../../Functions/ServicesFunctions/ZapInvoice'
import { getNpub } from '../../lib/nostr/Nip19'
import { getUnixTime } from 'date-fns'
import { Kind } from 'nostr-tools'
import { type User } from '../../Functions/DatabaseFunctions/Users'
import LnPreview from '../../Components/LnPreview'
import { FlatList, type ListRenderItem, ScrollView, StyleSheet, View } from 'react-native'
import { goBack } from '../../lib/Navigation'

interface ZapPageProps {
  route: { params: { note: Note, user: User } }
}

export const ZapPage: React.FC<ZapPageProps> = ({ route: { params: { note, user } } }) => {
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
    if (database && note?.id) {
      getZaps(database, { eventId: note?.id }).then((results) => {
        relayPool?.subscribe('zappers-meta', [
          {
            kinds: [Kind.Metadata],
            authors: results.filter((zap) => !zap.name).map((zap) => zap.zapper_user_id),
          },
        ])
        setZaps(results)
      })
    }
  }, [])

  useEffect(() => {
    if (database && note?.id) {
      getZaps(database, { eventId: note?.id }).then((results) => {
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

    if (lud && lud !== '' && monto !== '' && database && privateKey && publicKey && userId) {
      setLoading(true)

      lightningInvoice(
        database,
        lud,
        parseInt(monto, 10),
        privateKey,
        publicKey,
        userId,
        zap,
        zapPubkey,
        comment,
        note?.id,
      )
        .then((invoice) => {
          if (invoice) setInvoice(invoice)
          setLoading(false)
        })
        .catch((e) => {
          setLoading(false)
        })
    }
  }

  const renderZapperItem: ListRenderItem<Zap> = ({ item }) => {
    const zapDescription = item.tags?.find((tag) => tag[0] === 'description')
    const content = zapDescription ? JSON.parse(zapDescription[1])?.content : undefined
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
            {content && <Text style={styles.zapComment}>{content}</Text>}
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

  return (
    <View style={styles.main}>
      <View>
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
        {zaps.length > 0 && (
          <View style={styles.zappers}>
            <ScrollView>
              <FlatList data={zaps} renderItem={renderZapperItem} />
            </ScrollView>
          </View>
        )}
      </View>
      <View>
        <Button
          style={styles.spacer}
          mode='contained'
          disabled={loading || monto === ''}
          onPress={() => generateInvoice(false)}
          loading={loading && !isZap}
        >
          {t('lnPayment.anonTip')}
        </Button>
        {zapPubkey && (
          <Button
            style={styles.spacer}
            mode='contained'
            disabled={loading || monto === ''}
            onPress={() => generateInvoice(true)}
            loading={loading && isZap}
          >
            {t('lnPayment.zap')}
          </Button>
        )}
        <Button mode='outlined' onPress={() => goBack()}>
          {t('lnPayment.cancel')}
        </Button>
      </View>
      {invoice && <LnPreview invoice={invoice} setInvoice={setInvoice} />}
    </View>
  )
}

const styles = StyleSheet.create({
  main: {
    flex: 1,
    padding: 16,
    justifyContent: "space-between"
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
  zappers: {
    marginBottom: 16,
    marginTop: 16,
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
  zapComment: {
    marginLeft: 54,
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

export default ZapPage
