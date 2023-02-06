import React, { useEffect, useMemo, useState } from 'react'
import { requestInvoice } from 'lnurl-pay'
import { User } from '../../Functions/DatabaseFunctions/Users'
import { StyleSheet, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import RBSheet from 'react-native-raw-bottom-sheet'
import { Button, Text, TextInput, useTheme } from 'react-native-paper'
import { AppContext } from '../../Contexts/AppContext'
import LnPreview from '../LnPreview'
import { Note } from '../../Functions/DatabaseFunctions/Notes'
import { getNpub } from '../../lib/nostr/Nip19'

interface LnPaymentProps {
  open: boolean
  setOpen: (open: boolean) => void
  note?: Note
  user?: User
}

export const LnPayment: React.FC<LnPaymentProps> = ({ open, setOpen, note, user }) => {
  const theme = useTheme()
  const { t } = useTranslation('common')
  const { getSatoshiSymbol } = React.useContext(AppContext)
  const bottomSheetLnPaymentRef = React.useRef<RBSheet>(null)
  const [monto, setMonto] = useState<string>('')
  const defaultComment = note?.id ? `Tip for Nostr event nostr:${getNpub(note?.id)}` : ''
  const [comment, setComment] = useState<string>(defaultComment)
  const [invoice, setInvoice] = useState<string>()
  const [loading, setLoading] = useState<boolean>(false)
  const lnurl = useMemo(() => user?.lnurl ?? note?.lnurl, [open])

  useEffect(() => {
    setMonto('')
    if (open) {
      bottomSheetLnPaymentRef.current?.open()
    } else {
      bottomSheetLnPaymentRef.current?.close()
    }
  }, [open])

  useEffect(() => {
    setComment(defaultComment)
  }, [note, open])

  const generateInvoice: () => void = async () => {
    if (lnurl && monto !== '') {
      setLoading(true)
      requestInvoice({
        lnUrlOrAddress: lnurl,
        tokens: parseInt(monto, 10) ?? 0,
        comment,
      })
        .then((action) => {
          if (action.hasValidAmount && action.invoice) {
            setInvoice(action.invoice)
          }
          setLoading(false)
        })
        .catch(() => setLoading(false))
    }
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

  return lnurl ? (
    <>
      <RBSheet
        ref={bottomSheetLnPaymentRef}
        closeOnDragDown={true}
        customStyles={rbSheetCustomStyles}
        onClose={() => setOpen(false)}
      >
        <View style={styles.drawerBottom}>
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
            onPress={() => generateInvoice()}
          >
            {t('lnPayment.generateInvoice')}
          </Button>
          <Button mode='outlined' onPress={() => setOpen(false)}>
            {t('lnPayment.cancel')}
          </Button>
        </View>
      </RBSheet>
      {invoice && <LnPreview invoice={invoice} setInvoice={setInvoice} />}
    </>
  ) : (
    <></>
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
})

export default LnPayment
