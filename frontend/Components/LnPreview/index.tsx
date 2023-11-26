import React, { useEffect, useState } from 'react'
import QRCode from 'react-native-qrcode-svg'
import { Dimensions, Linking, StyleSheet, View } from 'react-native'
import Clipboard from '@react-native-clipboard/clipboard'
import { useTranslation } from 'react-i18next'
import RBSheet from 'react-native-raw-bottom-sheet'
import { Card, Chip, IconButton, Text, useTheme } from 'react-native-paper'
import { AppContext } from '../../Contexts/AppContext'
import { decode, type PaymentRequestObject, type TagsObject } from 'bolt11'
import { WalletContext } from '../../Contexts/WalletContext'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'

interface LnPreviewProps {
  invoices: string[]
  setInvoices: (invoices: string[]) => void
}

export const LnPreview: React.FC<LnPreviewProps> = ({
  invoices,
  setInvoices
}) => {
  const theme = useTheme()
  const { t } = useTranslation('common')
  const { type, payInvoice } = React.useContext(WalletContext)
  const { getSatoshiSymbol } = React.useContext(AppContext)
  const bottomSheetInvoiceRef = React.useRef<RBSheet>(null)
  const [decodedLnUrl, setDecodedLnUrl] = useState<
    PaymentRequestObject & { tagsObject: TagsObject }
  >()
  const [invoice, setInvoice] = useState<string>(invoices[0])
  const [index, setIndex] = useState<number>(0)
  const [paymentDone, setPaymentDone] = useState<boolean>()

  useEffect(() => {
    setPaymentDone(false)
    setInvoice(invoices[index])
  }, [index])

  useEffect(() => {
    if (invoice) {
      setDecodedLnUrl(decode(invoice))
    }
  }, [invoice])

  useEffect(() => {
    if (decodedLnUrl) {
      bottomSheetInvoiceRef.current?.open()
    }
  }, [decodedLnUrl])

  const copyInvoice: () => void = () => {
    Clipboard.setString(invoice ?? '')
  }

  const payWithWallet: () => void = () => {
    if (invoice) {
      payInvoice(invoice).then(setPaymentDone)
    }
  }

  const openApp: () => void = () => {
    Linking.openURL(`lightning:${invoice}`)
  }

  const rbSheetQrCustomStyles = React.useMemo(() => {
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
    <RBSheet
      ref={bottomSheetInvoiceRef}
      closeOnDragDown={true}
      // height={630}
      customStyles={rbSheetQrCustomStyles}
      onClose={() => setInvoices([])}
    >
      <Card style={styles.qrContainer}>
        <Card.Content>
          <View style={styles.qr}>
            {!paymentDone ? (
              <QRCode value={invoice} quietZone={8} size={Dimensions.get('window').width - 64} />
            ) : (
              <>
                <MaterialCommunityIcons
                  name={paymentDone ? 'check-circle-outline' : 'close-circle-outline'}
                  size={120}
                  color={paymentDone ? '#7ADC70' : theme.colors.error}
                />
                {index < invoices.length - 1 && (
                  <Chip
                    compact
                    style={{ ...styles.chip, backgroundColor: theme.colors.secondaryContainer }}
                    mode='outlined'
                    onPress={() => setIndex(prev => prev + 1)}
                  >
                    {t('lnPayment.nextInvoice')}
                  </Chip>
                )}
              </>
            )}
          </View>
          <View style={styles.qrText}>
            <Text>{decodedLnUrl?.satoshis} </Text>
            {getSatoshiSymbol(23)}
          </View>
        </Card.Content>
      </Card>
      {invoices.length > 1 && (
        <View style={styles.counter}>
          <Text>
            {`${t('lnPayment.invoice')}: ${index + 1} / ${invoices.length}`}
          </Text>
        </View>
      )}
      <View style={styles.cardActions}>
        <View style={styles.actionButton}>
          <IconButton icon='content-copy' size={28} onPress={copyInvoice} />
          <Text>{t('lnPayment.copy')}</Text>
        </View>
        {type && (
          <View style={styles.actionButton}>
            <IconButton icon='wallet' size={28} onPress={payWithWallet} />
            <Text>{t('lnPayment.pay')}</Text>
          </View>
        )}
        <View style={styles.actionButton}>
          <IconButton icon='exit-to-app' size={28} onPress={openApp} />
          <Text>{t('lnPayment.open')}</Text>
        </View>
      </View>
    </RBSheet>
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
  chip: {
    height: 40,
    marginTop: 16
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
  counter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 16
  },
  qr: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
})

export default LnPreview
