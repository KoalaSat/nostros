import { t } from 'i18next'
import * as React from 'react'
import { StyleSheet, View } from 'react-native'
import { Divider, Snackbar, TouchableRipple, useTheme } from 'react-native-paper'
import { AppContext } from '../../Contexts/AppContext'
import { getUser, User } from '../../Functions/DatabaseFunctions/Users'
import { usernamePubKey } from '../../Functions/RelayFunctions/Users'
import LnPayment from '../LnPayment'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import { push } from '../../lib/Navigation'
import RBSheet from 'react-native-raw-bottom-sheet'
import { getNpub } from '../../lib/nostr/Nip19'
import ProfileData from '../ProfileData'
import ProfileActions from '../ProfileActions'

interface ProfileCardProps {
  bottomSheetRef: React.RefObject<RBSheet>
  showImages?: boolean
}

export const ProfileCard: React.FC<ProfileCardProps> = ({ bottomSheetRef, showImages = true }) => {
  const theme = useTheme()
  const { displayUserDrawer } = React.useContext(AppContext)
  const { database } = React.useContext(AppContext)
  const [user, setUser] = React.useState<User>()
  const [openLn, setOpenLn] = React.useState<boolean>(false)
  const [showNotification, setShowNotification] = React.useState<undefined | string>()
  const nPub = React.useMemo(() => getNpub(displayUserDrawer), [displayUserDrawer])
  const username = React.useMemo(() => usernamePubKey(user?.name ?? '', nPub), [nPub, user])

  React.useEffect(() => {
    loadUser()
  }, [])

  const loadUser: () => void = () => {
    if (database && displayUserDrawer) {
      getUser(displayUserDrawer, database).then((result) => {
        if (result) {
          setUser(result)
        } else {
          setUser({ id: displayUserDrawer })
        }
      })
    }
  }

  const goToProfile: () => void = () => {
    bottomSheetRef.current?.close()
    push('Profile', { pubKey: displayUserDrawer, title: username })
  }

  return (
    <View>
      <Divider />
      <TouchableRipple onPress={goToProfile}>
        <View style={styles.cardUser}>
          <View>
            <View style={styles.cardUserMain}>
              <ProfileData
                username={user?.name}
                publicKey={user?.id ?? displayUserDrawer}
                validNip05={user?.valid_nip05}
                nip05={user?.nip05}
                lud06={user?.lnurl}
                picture={showImages ? user?.picture : undefined}
                avatarSize={54}
              />
            </View>
          </View>
          <View style={styles.arrow}>
            <MaterialCommunityIcons
              name='menu-right'
              size={25}
              color={theme.colors.onPrimaryContainer}
            />
          </View>
        </View>
      </TouchableRipple>
      <Divider />
      {user && <ProfileActions user={user} setUser={setUser} />}
      {showNotification && (
        <Snackbar
          style={styles.snackbar}
          visible={showNotification !== undefined}
          duration={Snackbar.DURATION_SHORT}
          onIconPress={() => setShowNotification(undefined)}
          onDismiss={() => setShowNotification(undefined)}
        >
          {t(`profileCard.notifications.${showNotification}`)}
        </Snackbar>
      )}
      <LnPayment setOpen={setOpenLn} open={openLn} user={user} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  snackbar: {
    marginBottom: 85,
  },
  usernameData: {
    paddingLeft: 16,
  },
  username: {
    flexDirection: 'row',
  },
  contacts: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  mainLayout: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  about: {
    maxHeight: 50,
  },
  userName: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardUser: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardUserMain: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    justifyContent: 'center',
    alignItems: 'center',
    flexBasis: '25%',
    marginBottom: 4,
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
  list: {
    padding: 16,
  },
  verifyIcon: {
    paddingTop: 6,
    paddingLeft: 5,
  },
  dividerTop: {
    marginBottom: 16,
  },
  arrow: {
    alignContent: 'center',
    justifyContent: 'center',
    marginTop: -16,
  },
})

export default ProfileCard
