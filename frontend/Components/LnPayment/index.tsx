import React, { useEffect, useState } from 'react'
import { requestInvoice } from 'lnurl-pay'
import { Button, Card, Input, Layout, Modal, Text } from '@ui-kitten/components'
import { Event } from '../../lib/nostr/Events'
import { User } from '../../Functions/DatabaseFunctions/Users'
import { Clipboard, Linking, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { showMessage } from 'react-native-flash-message'

interface TextContentProps {
  open: boolean
  setOpen: (open: boolean) => void
  event?: Event
  user?: User
}

export const LnPayment: React.FC<TextContentProps> = ({ open, setOpen, event, user }) => {
  const { t } = useTranslation('common')
  const [monto, setMonto] = useState<string>('')
  const defaultComment = event?.id ? `Tip for Nostr event ${event?.id}` : ''
  const [comment, setComment] = useState<string>(defaultComment)
  const [loading, setLoading] = useState<boolean>(false)

  useEffect(() => {
    setMonto('')
  }, [open])

  useEffect(() => {
    setComment(defaultComment)
  }, [event, open])

  const styles = StyleSheet.create({
    modal: {
      paddingLeft: 32,
      paddingRight: 32,
      width: '100%',
    },
    backdrop: {
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    input: {
      marginTop: 31,
    },
    modalContainer: {
      marginBottom: 15,
    },
    buttonsContainer: {
      flexDirection: 'row',
      marginTop: 31,
    },
    buttonLeft: {
      flex: 3,
      paddingRight: 16,
    },
    buttonRight: {
      flex: 3,
      paddingLeft: 16,
    },
    buttonMonto: {
      flex: 2,
    },
    buttonMontoMiddle: {
      flex: 2,
      marginLeft: 10,
      marginRight: 10,
    },
    satoshi: {
      fontFamily: 'Satoshi-Symbol',
    },
  })

  const copyInvoice: (invoice: string) => void = (invoice) => {
    Clipboard.setString(invoice)
    showMessage({
      message: t('alerts.invoiceCopied'),
      type: 'success',
    })
  }

  const openApp: (invoice: string) => void = (invoice) => {
    Linking.openURL(`lightning:${invoice}`)
  }

  const generateInvoice: (copy: boolean) => void = async (copy) => {
    if (user?.lnurl && monto !== '') {
      setLoading(true)
      requestInvoice({
        lnUrlOrAddress: user.lnurl,
        tokens: parseInt(monto, 10),
        comment,
      })
        .then((action) => {
          if (action.hasValidAmount && action.invoice) {
            copy ? copyInvoice(action.invoice) : openApp(action.invoice)
          } else {
            showMessage({
              message: t('alerts.invoiceError'),
              type: 'danger',
            })
          }
          setLoading(false)
          setOpen(false)
          setMonto('')
          setComment('')
        })
        .catch(() => setLoading(false))
    }
  }

  return user?.lnurl ? (
    <Modal
      style={styles.modal}
      visible={open}
      backdropStyle={styles.backdrop}
      onBackdropPress={() => setOpen(false)}
    >
      <Card disabled={true}>
        <Layout style={styles.modalContainer}>
          <Layout style={styles.buttonsContainer}>
            <Button style={styles.buttonMonto} onPress={() => setMonto('1000')}>
              <>
                <Text style={styles.satoshi}>s</Text>
                <Text> 1k</Text>
              </>
            </Button>
            <Button style={styles.buttonMontoMiddle} onPress={() => setMonto('5000')}>
              <>
                <Text style={styles.satoshi}>s</Text>
                <Text> 5k</Text>
              </>
            </Button>
            <Button style={styles.buttonMonto} onPress={() => setMonto('10000')}>
              <>
                <Text style={styles.satoshi}>s</Text>
                <Text> 10k</Text>
              </>
            </Button>
          </Layout>
          <Layout style={styles.input}>
            <Input
              value={monto}
              onChangeText={(text) => {
                if (/^\d+$/.test(text)) {
                  setMonto(text)
                }
              }}
              size='large'
              placeholder={t('lnPayment.monto')}
              accessoryLeft={() => <Text style={styles.satoshi}>s</Text>}
            />
          </Layout>
          <Layout style={styles.input}>
            <Input
              value={comment}
              onChangeText={setComment}
              placeholder={t('lnPayment.comment')}
              size='large'
            />
          </Layout>
          <Layout style={styles.buttonsContainer}>
            <Layout style={styles.buttonLeft}>
              <Button
                onPress={() => generateInvoice(true)}
                appearance='ghost'
                disabled={loading || monto === ''}
              >
                {t('lnPayment.copy')}
              </Button>
            </Layout>
            <Layout style={styles.buttonRight}>
              <Button
                onPress={() => generateInvoice(false)}
                status='warning'
                disabled={loading || monto === ''}
              >
                {t('lnPayment.openApp')}
              </Button>
            </Layout>
          </Layout>
        </Layout>
      </Card>
    </Modal>
  ) : (
    <></>
  )
}

export default LnPayment
