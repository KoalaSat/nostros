import React, { useEffect, useState } from 'react'
import QRCode from 'react-native-qrcode-svg'
import { Dimensions, Linking, StyleSheet, View } from 'react-native'
import Clipboard from '@react-native-clipboard/clipboard'
import { useTranslation } from 'react-i18next'
import RBSheet from 'react-native-raw-bottom-sheet'
import { Card, IconButton, Text, useTheme } from 'react-native-paper'
import { AppContext } from '../../Contexts/AppContext'
import { decode, PaymentRequestObject, TagsObject } from 'bolt11'

interface LnPreviewProps {
  setOpen?: (open: boolean) => void
  invoice?: string
  setInvoice: (invoice: string | undefined) => void
}

export const LnPreview: React.FC<LnPreviewProps> = ({
  invoice,
  setInvoice,
  setOpen = () => {},
}) => {
  const theme = useTheme()
  const { t } = useTranslation('common')
  const { getSatoshiSymbol } = React.useContext(AppContext)
  const bottomSheetInvoiceRef = React.useRef<RBSheet>(null)
  const [decodedLnUrl, setDecodedLnUrl] = useState<
    PaymentRequestObject & { tagsObject: TagsObject }
  >()

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
      onClose={() => {
        setInvoice(undefined)
        setOpen(false)
      }}
    >
      <Card style={styles.qrContainer}>
        <Card.Content>
          <View style={styles.qr}>
            <QRCode value={invoice} quietZone={8} size={Dimensions.get('window').width - 64} />
          </View>
          <View style={styles.qrText}>
            <Text>{decodedLnUrl?.satoshis} </Text>
            {getSatoshiSymbol(23)}
          </View>
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

export default LnPreview
