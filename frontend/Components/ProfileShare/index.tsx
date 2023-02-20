import { t } from 'i18next'
import * as React from 'react'
import { Dimensions, StyleSheet, View } from 'react-native'
import Clipboard from '@react-native-clipboard/clipboard'
import { IconButton, Snackbar, Text, TouchableRipple } from 'react-native-paper'
import { User } from '../../Functions/DatabaseFunctions/Users'
import Share from 'react-native-share'
import RBSheet from 'react-native-raw-bottom-sheet'
import { getNprofile } from '../../lib/nostr/Nip19'
import QRCode from 'react-native-qrcode-svg'
import { useContext } from 'react'
import { AppContext } from '../../Contexts/AppContext'
import { getUserRelays } from '../../Functions/DatabaseFunctions/NotesRelays'

interface ProfileShareProps {
  user: User
}

export const ProfileShare: React.FC<ProfileShareProps> = ({ user }) => {
  const { database } = useContext(AppContext)
  const bottomSheetShareRef = React.useRef<RBSheet>(null)
  const [qrCode, setQrCode] = React.useState<any>()
  const [showNotification, setShowNotification] = React.useState<undefined | string>()
  const [nProfile, setNProfile] = React.useState<string>()

  React.useEffect(() => {
    if (database && user.id) {
      getUserRelays(database, user.id).then((results) => {
        const urls = results.map((relay) => relay.relay_url)
        setNProfile(getNprofile(user.id, urls))
      })
    }
  }, [user])

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
            value={`nostr:${nProfile}`}
            size={Dimensions.get('window').width - 64}
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
            Clipboard.setString(nProfile ?? '')
            bottomSheetShareRef.current?.close()
          }}
        />
        <Text>{t('profileShare.copyNPub')}</Text>
      </View>
      <View style={styles.shareActionButton}>
        <IconButton
          icon='check-decagram-outline'
          size={28}
          onPress={() => {
            setShowNotification('nip05Copied')
            Clipboard.setString(user?.nip05 ?? '')
            bottomSheetShareRef.current?.close()
          }}
          disabled={!user.nip05}
        />
        <Text>{t('profileShare.copyNip05')}</Text>
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
    flexBasis: '50%',
    marginBottom: 4,
  },
})

export default ProfileShare
