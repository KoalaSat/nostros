import { t } from 'i18next'
import * as React from 'react'
import { Dimensions, StyleSheet, View } from 'react-native'
import Clipboard from '@react-native-clipboard/clipboard'
import { IconButton, Snackbar, Text, TouchableRipple } from 'react-native-paper'
import Share from 'react-native-share'
import RBSheet from 'react-native-raw-bottom-sheet'
import QRCode from 'react-native-qrcode-svg'
import { useContext } from 'react'
import { AppContext } from '../../Contexts/AppContext'
import { getNoteRelays, Note } from '../../Functions/DatabaseFunctions/Notes'
import { getNevent } from '../../lib/nostr/Nip19'

interface NoteShareProps {
  note: Note
}

export const NoteShare: React.FC<NoteShareProps> = ({ note }) => {
  const { database } = useContext(AppContext)
  const bottomSheetShareRef = React.useRef<RBSheet>(null)
  const [qrCode, setQrCode] = React.useState<any>()
  const [showNotification, setShowNotification] = React.useState<undefined | string>()
  const [nEvent, setNevent] = React.useState<undefined | string>()

  React.useEffect(() => {
    if (database && note.id) {
      getNoteRelays(database, note.id).then((results) => {
        const urls = results.map((item) => item.relay_url)
        setNevent(getNevent(note.id, [...new Set(urls)]))
      })
    }
  }, [note, database])

  return (
    <View style={styles.mainLayout}>
      <View style={styles.qr}>
        <TouchableRipple
          onPress={() => {
            if (qrCode) {
              qrCode.toDataURL((base64: string) => {
                Share.open({
                  url: `data:image/png;base64,${base64}`,
                  filename: note?.id ?? 'nostrosshare',
                })
              })
            }
          }}
        >
          <QRCode
            quietZone={8}
            value={`nostr:${nEvent}`}
            size={Dimensions.get('window').width - 64}
            logoBorderRadius={50}
            logoSize={100}
            logo={{ uri: note?.picture }}
            getRef={setQrCode}
          />
        </TouchableRipple>
      </View>
      <View style={styles.shareActionButton}>
        <IconButton
          icon='key-outline'
          size={28}
          onPress={() => {
            setShowNotification('npubCopied')
            Clipboard.setString(nEvent ?? '')
            bottomSheetShareRef.current?.close()
          }}
        />
        <Text>{t('profileShare.copyNPub')}</Text>
      </View>
      {showNotification && (
        <Snackbar
          style={styles.snackbar}
          visible={showNotification !== undefined}
          duration={Snackbar.DURATION_SHORT}
          onIconPress={() => setShowNotification(undefined)}
          onDismiss={() => setShowNotification(undefined)}
        >
          {t(`profileShare.notifications.${showNotification}`)}
        </Snackbar>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  snackbar: {
    marginBottom: 85,
    width: '100%',
  },
  mainLayout: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  qr: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  shareActionButton: {
    justifyContent: 'center',
    alignItems: 'center',
    flexBasis: '100%',
    marginBottom: 4,
  },
})

export default NoteShare
