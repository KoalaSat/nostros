import React, { useEffect, useMemo, useState } from 'react'
import { type Note } from '../../Functions/DatabaseFunctions/Notes'
import { Button, Text, TextInput, TouchableRipple, useTheme } from 'react-native-paper'
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
import { getUsers, type User } from '../../Functions/DatabaseFunctions/Users'
import LnPreview from '../../Components/LnPreview'
import { FlatList, type ListRenderItem, ScrollView, StyleSheet, View, Dimensions } from 'react-native'
import { goBack } from '../../lib/Navigation'
import { getZapTag } from '../../Functions/RelayFunctions/Events'

interface ZapPageProps {
  route: { params: { note: Note, user: User } }
}

export const ZapPage: React.FC<ZapPageProps> = ({ route: { params: { note, user } } }) => {
  const { t } = useTranslation('common')
  const theme = useTheme()
  const lnurl = useMemo(() => user?.lnurl ?? note?.lnurl, [open])
  const lnAddress = useMemo(() => user?.ln_address ?? note?.ln_address, [open])
  const userId = user?.id ?? note?.pubkey
  const zapPubkey = user?.zap_pubkey ?? note?.zap_pubkey
  const zapSplitTags = getZapTag(note)
  const { getSatoshiSymbol, database, setDisplayUserDrawer } = React.useContext(AppContext)
  const { relayPool, lastEventId } = React.useContext(RelayPoolContext)
  const { publicKey, privateKey } = React.useContext(UserContext)
  const bottomSheetLnPaymentRef = React.useRef<RBSheet>(null)
  const [monto, setMonto] = useState<string>('')
  const defaultComment = note?.id ? `Nostr: ${formatPubKey(getNpub(note?.id))}` : ''
  const [comment, setComment] = useState<string>(defaultComment)
  const [invoices, setInvoices] = useState<string[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [isZap, setIsZap] = useState<boolean>(false)
  const [zapsUpdated, setZapsUpdated] = useState<number>(0)
  const [zaps, setZaps] = useState<Zap[]>([])
  const [users, setUsers] = useState<User[]>()
  const [zapAmounts, setZapAmounts] = useState<Record<string, number>>({})
  const [tabKey, setTabKey] = React.useState(zapSplitTags.length > 0 ? 'split' : 'zappers')

  useEffect(() => {
    setMonto('')
    if (database && note?.id) {
      getZaps(database, { eventId: note?.id }).then((results) => {
        relayPool?.subscribe('zappers-meta', [
          {
            kinds: [Kind.Metadata],
            authors: [
              ...results.filter((zap) => !zap.name).map((zap) => zap.zapper_user_id),
              ...zapSplitTags.map(t => t[1])
            ],
          },
        ])
        setZaps(results)
      })
      getUsers(database, {}).then(setUsers)
    }
  }, [])

  useEffect(() => {
    if (database && note?.id) {
      getZaps(database, { eventId: note?.id }).then((results) => {
        const newZaps: Zap[] = []
        const newAmounts: Record<string, number> = {}
        results.forEach((zap) => {
          const amount: number = newAmounts[zap.zapper_user_id] ?? 0
          newAmounts[zap.zapper_user_id] = amount + zap.amount
          if (!newZaps.find((o) => o.zapper_user_id === zap.zapper_user_id)) {
            newZaps.push(zap)
          }
        })
        setZaps(newZaps)
        setZapAmounts(newAmounts)
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

      let zapSplits: string[][] = zapSplitTags
      if (zapSplits.length < 1) zapSplits = [['zap', userId, '', '1']]
      const totalWeight = zapSplits.reduce((acc, tag) => acc + parseInt(tag[3] ?? '0', 10), 0)

      if (totalWeight > 0) {
        zapSplits.forEach((tag) => {
          const weight = parseInt(tag[3] ?? '0')
          if (weight > 0) {
            const weightedMonto = (parseInt(monto, 10) * weight) / totalWeight
            lightningInvoice(
              database,
              lud,
              weightedMonto,
              privateKey,
              publicKey,
              tag[1],
              zap,
              comment,
              note?.id,
            )
              .then((invoice) => {
                if (invoice) setInvoices((prev) => [...prev, invoice])
                setLoading(false)
              })
              .catch((e) => {
                setLoading(false)
              })
          }
        })
      }
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
              {zapAmounts[item.zapper_user_id]} {getSatoshiSymbol(15)}
            </Text>
          </View>
        </View>
      </TouchableRipple>
    )
  }

  const renderSplitItem: ListRenderItem<string> = ({ item }) => {
    const user = users?.find(u => u.id === item)
    const allocationTag = zapSplitTags.find(t => t[1] === item)
    const totalWeight = zapSplitTags.reduce((acc, tag) => acc + parseInt(tag[3] ?? '0', 10), 0)
    const weightedAllocation = allocationTag ? (parseInt(allocationTag[3] ?? '0', 10) * 100) / totalWeight : 0
    return (
      <TouchableRipple onPress={() => setDisplayUserDrawer(item)}>
        <View key={item} style={styles.zapperRow}>
          <View style={styles.zapperData}>
            <ProfileData
              username={user?.name}
              publicKey={getNpub(item)}
              validNip05={user?.valid_nip05}
              nip05={user?.nip05}
              lnurl={user?.lnurl}
              lnAddress={user?.ln_address}
              picture={user?.picture}
            />
          </View>
          <View style={styles.zapperAmount}>
            <Text>
              {`${weightedAllocation}%`}
            </Text>
          </View>
        </View>
      </TouchableRipple>
    )
  }

  return (
    <View style={styles.main}>
      <View>
        <View style={styles.tabsNavigator}>
          <View
            style={[
              styles.tab,
              tabKey === 'zappers'
                ? { ...styles.tabActive, borderBottomColor: theme.colors.primary }
                : {},
            ]}
          >
            <TouchableRipple style={styles.textWrapper} onPress={() => setTabKey('zappers')}>
              <Text style={styles.tabText}>
                {t('lnPayment.zappers')}
              </Text>
            </TouchableRipple>
          </View>
          {zapSplitTags.length ? (
            <View
              style={[
                styles.tab,
                tabKey === 'split'
                  ? { ...styles.tabActive, borderBottomColor: theme.colors.primary }
                  : {},
              ]}
            >
              <TouchableRipple style={styles.textWrapper} onPress={() => setTabKey('split')}>
                <Text style={styles.tabText}>
                  {t('lnPayment.split', { count: zapSplitTags.length })}
                </Text>
              </TouchableRipple>
            </View>
          ) : <></>}
        </View>
        <View style={{
          ...styles.zappers,
          maxHeight: Dimensions.get('window').height - 550
        }}>
          <ScrollView>
            {tabKey === 'zappers' ? (
              <FlatList data={zaps} renderItem={renderZapperItem} />
            ) : tabKey === 'split' ? (
              <FlatList data={zapSplitTags.map(t => t[1])} renderItem={renderSplitItem} />
            ) : <></>}
          </ScrollView>
        </View>
      </View>
      <View>
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
        {invoices.length > 0 && (
          <LnPreview 
              invoices={invoices.map((e) => {
                return { invoice: e }
              })} 
              setInvoices={(invoices) => setInvoices(invoices.map(i => i.invoice))} 
            />
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  main: {
    flex: 1,
    padding: 16,
    justifyContent: "space-between"
  },
  tabsNavigator: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
  },
  tab: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignContent: 'center',
  },
  tabText: {
    textAlign: 'center',
  },
  tabActive: {
    borderBottomWidth: 3,
  },
  textWrapper: {
    justifyContent: 'center',
    height: '100%',
    textAlign: 'center',
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
