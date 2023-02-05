import { t } from 'i18next'
import * as React from 'react'
import { StyleSheet, View } from 'react-native'
import Clipboard from '@react-native-clipboard/clipboard'
import { IconButton, Snackbar, Text, TouchableRipple } from 'react-native-paper'
import { AppContext } from '../../Contexts/AppContext'
import {
  getUser,
  User,
} from '../../Functions/DatabaseFunctions/Users'
import Share from 'react-native-share'
import RBSheet from 'react-native-raw-bottom-sheet'
import { getNpub } from '../../lib/nostr/Nip19'
import QRCode from 'react-native-qrcode-svg'

export const ProfileShare: React.FC = () => {
  const { displayUserShareDrawer } = React.useContext(AppContext)
  const bottomSheetShareRef = React.useRef<RBSheet>(null)
  const { database } = React.useContext(AppContext)
  const [user, setUser] = React.useState<User>()
  const [qrCode, setQrCode] = React.useState<any>()
  const [showNotification, setShowNotification] = React.useState<undefined | string>()
  const nPub = React.useMemo(() => getNpub(displayUserShareDrawer), [displayUserShareDrawer])

  React.useEffect(() => {
    loadUser()
  }, [])

  const loadUser: () => void = () => {
    if (database && displayUserShareDrawer) {
      getUser(displayUserShareDrawer, database).then((result) => {
        if (result) {
          console.log(result)
          setUser(result)
        } else {
          setUser({ id: displayUserShareDrawer })
        }
      })
    }
  }

  return (
    <View style={styles.mainLayout}>
      <View style={styles.qr}>
        <TouchableRipple
          onPress={() => {
            if (qrCode) {
              qrCode.toDataURL((base64: string) => {
                Share.open({
                  url: `data:image/png;base64,${base64}`,
                  filename: user?.id ?? 'nostrosshare',
                })
              })
            }
          }}
        >
          <QRCode
            quietZone={8}
            value={`nostr:${nPub}`}
            size={350}
            logoBorderRadius={50}
            logoSize={100}
            logo={{ uri: user?.picture }}
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
            Clipboard.setString(nPub ?? '')
            bottomSheetShareRef.current?.close()
          }}
        />
        <Text>{t('profileShare.copyNPub')}</Text>
      </View>
      {user?.nip05 && (
        <View style={styles.shareActionButton}>
          <IconButton
            icon='check-decagram-outline'
            size={28}
            onPress={() => {
              setShowNotification('npubCopied')
              Clipboard.setString(user?.nip05 ?? '')
              bottomSheetShareRef.current?.close()
            }}
          />
          <Text>{t('profileShare.copyNip05')}</Text>
        </View>
      )}
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
    flexBasis: '50%',
    marginBottom: 4,
  },
})

export default ProfileShare
