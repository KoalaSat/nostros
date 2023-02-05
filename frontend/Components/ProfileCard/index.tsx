import { t } from 'i18next'
import * as React from 'react'
import { StyleSheet, View } from 'react-native'
import { Card, IconButton, Snackbar, Text, useTheme } from 'react-native-paper'
import { AppContext } from '../../Contexts/AppContext'
import { RelayPoolContext } from '../../Contexts/RelayPoolContext'
import { UserContext } from '../../Contexts/UserContext'
import {
  getUser,
  updateUserBlock,
  updateUserContact,
  User,
} from '../../Functions/DatabaseFunctions/Users'
import { populatePets, usernamePubKey } from '../../Functions/RelayFunctions/Users'
import LnPayment from '../LnPayment'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import { navigate, push } from '../../lib/Navigation'
import RBSheet from 'react-native-raw-bottom-sheet'
import { getNpub } from '../../lib/nostr/Nip19'
import ProfileData from '../ProfileData'

interface ProfileCardProps {
  bottomSheetRef: React.RefObject<RBSheet>
  showImages?: boolean
}

export const ProfileCard: React.FC<ProfileCardProps> = ({ bottomSheetRef, showImages = true }) => {
  const theme = useTheme()
  const { displayUserDrawer } = React.useContext(AppContext)
  const { database, setDisplayUserShareDrawer } = React.useContext(AppContext)
  const { publicKey } = React.useContext(UserContext)
  const { relayPool } = React.useContext(RelayPoolContext)
  const [user, setUser] = React.useState<User>()
  const [blocked, setBlocked] = React.useState<number>()
  const [openLn, setOpenLn] = React.useState<boolean>(false)
  const [isContact, setIsContact] = React.useState<boolean>()
  const [showNotification, setShowNotification] = React.useState<undefined | string>()
  const nPub = React.useMemo(() => getNpub(displayUserDrawer), [displayUserDrawer])
  const username = React.useMemo(() => usernamePubKey(user?.name ?? '', nPub), [nPub, user])

  React.useEffect(() => {
    loadUser()
  }, [])

  const onChangeBlockUser: () => void = () => {
    if (database && blocked !== undefined && displayUserDrawer) {
      updateUserBlock(displayUserDrawer, database, !blocked).then(() => {
        setBlocked(blocked === 0 ? 1 : 0)
        loadUser()
      })
    }
  }

  const removeContact: () => void = () => {
    if (relayPool && database && publicKey && displayUserDrawer) {
      updateUserContact(displayUserDrawer, database, false).then(() => {
        populatePets(relayPool, database, publicKey)
        setIsContact(false)
        setShowNotification('contactRemoved')
      })
    }
  }

  const addContact: () => void = () => {
    if (relayPool && database && publicKey && displayUserDrawer) {
      updateUserContact(displayUserDrawer, database, true).then(() => {
        populatePets(relayPool, database, publicKey)
        setIsContact(true)
        setShowNotification('contactAdded')
      })
    }
  }

  const loadUser: () => void = () => {
    if (database && displayUserDrawer) {
      getUser(displayUserDrawer, database).then((result) => {
        if (result) {
          setUser(result)
          setBlocked(result.blocked)
          setIsContact(result?.contact)
        } else {
          setUser({ id: displayUserDrawer })
          setBlocked(0)
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
      <Card onPress={goToProfile}>
        <Card.Content style={styles.card}>
          <View style={styles.cardUser}>
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
            {user?.about && (
              <View style={styles.about}>
                <Text>
                  {`${user?.about ? user?.about?.slice(0, 75) : ''}${
                    user?.about && user?.about?.length > 75 ? ' ...' : ''
                  }`}
                </Text>
              </View>
            )}
          </View>
          <View>
            <MaterialCommunityIcons
              name='menu-right'
              size={25}
              color={theme.colors.onPrimaryContainer}
            />
          </View>
        </Card.Content>
      </Card>
      <View style={styles.mainLayout}>
        {displayUserDrawer !== publicKey && (
          <View style={styles.actionButton}>
            <IconButton
              icon={isContact ? 'account-multiple-remove-outline' : 'account-multiple-plus-outline'}
              size={28}
              onPress={() => {
                isContact ? removeContact() : addContact()
              }}
            />
            <Text>{isContact ? t('profileCard.unfollow') : t('profileCard.follow')}</Text>
          </View>
        )}
        <View style={styles.actionButton}>
          <IconButton
            icon='message-plus-outline'
            size={28}
            onPress={() => {
              navigate('Conversation', { pubKey: displayUserDrawer, title: username })
              bottomSheetRef.current?.close()
            }}
          />
          <Text>{t('profileCard.message')}</Text>
        </View>
        <View style={styles.actionButton}>
          <IconButton
            icon='share-variant-outline'
            size={28}
            onPress={() => {
              setDisplayUserShareDrawer(user?.id)
            }}
          />
          <Text>{t('profileCard.share')}</Text>
        </View>
        {user?.lnurl && (
          <View style={styles.actionButton}>
            <>
              <IconButton
                icon='lightning-bolt'
                size={28}
                onPress={() => setOpenLn(true)}
                iconColor='#F5D112'
              />
              <Text>{t('profileCard.invoice')}</Text>
            </>
          </View>
        )}
        <View style={styles.actionButton}>
          <IconButton
            icon={blocked && blocked > 0 ? 'account-cancel' : 'account-cancel-outline'}
            size={28}
            onPress={onChangeBlockUser}
          />
          <Text>{t(blocked && blocked > 0 ? 'profileCard.unblock' : 'profileCard.block')}</Text>
        </View>
      </View>
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
  cardUser: {
    flex: 1,
  },
  verifyIcon: {
    paddingTop: 6,
    paddingLeft: 5,
  },
})

export default ProfileCard
