import React, { useEffect, useState } from 'react'
import { requestInvoice } from 'lnurl-pay'
import QRCode from 'react-native-qrcode-svg'
import { Event } from '../../lib/nostr/Events'
import { User } from '../../Functions/DatabaseFunctions/Users'
import { Clipboard, Linking, StyleSheet, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import RBSheet from 'react-native-raw-bottom-sheet'
import { Button, Card, IconButton, Text, TextInput, useTheme } from 'react-native-paper'

interface TextContentProps {
  open: boolean
  setOpen: (open: boolean) => void
  event?: Event
  user?: User
}

export const LnPayment: React.FC<TextContentProps> = ({ open, setOpen, event, user }) => {
  const theme = useTheme()
  const { t } = useTranslation('common')
  const bottomSheetLnPaymentRef = React.useRef<RBSheet>(null)
  const bottomSheetInvoiceRef = React.useRef<RBSheet>(null)
  const [monto, setMonto] = useState<string>('')
  const defaultComment = event?.id ? `Tip for Nostr event ${event?.id}` : ''
  const [comment, setComment] = useState<string>(defaultComment)
  const [invoice, setInvoice] = useState<string>()
  const [loading, setLoading] = useState<boolean>(false)

  useEffect(() => {
    setMonto('')
    if (open) {
      bottomSheetLnPaymentRef.current?.open()
    } else {
      bottomSheetLnPaymentRef.current?.close()
      bottomSheetInvoiceRef.current?.close()
    }
  }, [open])

  useEffect(() => {
    setComment(defaultComment)
  }, [event, open])

  const copyInvoice: () => void = () => {
    Clipboard.setString(invoice ?? '')
  }

  const openApp: () => void = () => {
    Linking.openURL(`lightning:${invoice}`)
  }

  const generateInvoice: () => void = async () => {
    if (user?.lnurl && monto !== '') {
      setLoading(true)
      requestInvoice({
        lnUrlOrAddress: user.lnurl,
        tokens: parseInt(monto, 10),
        comment,
      })
        .then((action) => {
          if (action.hasValidAmount && action.invoice) {
            setInvoice(action.invoice)
            bottomSheetInvoiceRef.current?.open()
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
        padding: 16,
        borderTopRightRadius: 28,
        borderTopLeftRadius: 28,
      },
    }
  }, [])

  return user?.lnurl ? (
    <>
      <RBSheet
        ref={bottomSheetLnPaymentRef}
        closeOnDragDown={true}
        height={330}
        customStyles={rbSheetCustomStyles}
        onClose={() => setOpen(false)}
      >
        <View>
          <View style={styles.montoSelection}>
            <Button style={styles.montoButton} mode='outlined' onPress={() => setMonto('1000')}>
              <>
                <Text style={styles.satoshi}>s</Text>
                <Text> 1k</Text>
              </>
            </Button>
            <Button style={styles.montoButton} mode='outlined' onPress={() => setMonto('5000')}>
              <>
                <Text style={styles.satoshi}>s</Text>
                <Text> 5k</Text>
              </>
            </Button>
            <Button style={styles.montoButton} mode='outlined' onPress={() => setMonto('10000')}>
              <>
                <Text style={styles.satoshi}>s</Text>
                <Text> 10k</Text>
              </>
            </Button>
          </View>
          <TextInput
            mode='outlined'
            label={t('lnPayment.monto') ?? ''}
            onChangeText={setMonto}
            value={monto}
          />
          <TextInput
            mode='outlined'
            label={t('lnPayment.comment') ?? ''}
            onChangeText={setComment}
            value={comment}
          />
          <Button
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
      <RBSheet
        ref={bottomSheetInvoiceRef}
        closeOnDragDown={true}
        height={630}
        customStyles={rbSheetCustomStyles}
        onClose={() => setOpen(false)}
      >
        <Card style={styles.qrContainer}>
          <Card.Content>
            <View>
              <QRCode value={invoice} size={350} />
            </View>
            <View style={styles.qrText}>
              <Text variant='titleMedium' style={styles.satoshi}>
                s
              </Text>
              <Text variant='titleMedium'>{monto}</Text>
            </View>
            {comment && (
              <View style={styles.qrText}>
                <Text>{comment}</Text>
              </View>
            )}
          </Card.Content>
        </Card>
        <View style={styles.cardActions}>
          <View style={styles.actionButton}>
            <IconButton icon='content-copy' size={28} onPress={copyInvoice} />
            <Text>{t('lnPayment.copy')}</Text>
          </View>
          <View style={styles.actionButton}>
            <IconButton icon='wallet' size={28} onPress={openApp} />
            <Text>{t('lnPayment.open')}</Text>
          </View>
        </View>
      </RBSheet>
    </>
  ) : (
    <></>
  )
}

const styles = StyleSheet.create({
  qrContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrText: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  rbsheetContainer: {
    padding: 16,
    borderTopRightRadius: 28,
    borderTopLeftRadius: 28,
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
})

export default LnPayment
