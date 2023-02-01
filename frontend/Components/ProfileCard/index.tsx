import { t } from 'i18next'
import * as React from 'react'
import { StyleSheet, View } from 'react-native'
import Clipboard from '@react-native-clipboard/clipboard'
import { Card, IconButton, Snackbar, Text, TouchableRipple, useTheme } from 'react-native-paper'
import { AppContext } from '../../Contexts/AppContext'
import { RelayPoolContext } from '../../Contexts/RelayPoolContext'
import { UserContext } from '../../Contexts/UserContext'
import {
  getUser,
  updateUserBlock,
  updateUserContact,
  User,
} from '../../Functions/DatabaseFunctions/Users'
import Share from 'react-native-share'
import { populatePets, usernamePubKey } from '../../Functions/RelayFunctions/Users'
import LnPayment from '../LnPayment'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import { navigate, push } from '../../lib/Navigation'
import RBSheet from 'react-native-raw-bottom-sheet'
import { getNpub } from '../../lib/nostr/Nip19'
import ProfileData from '../ProfileData'
import QRCode from 'react-native-qrcode-svg'

interface ProfileCardProps {
  userPubKey: string
  bottomSheetRef: React.RefObject<RBSheet>
  showImages?: boolean
}

export const ProfileCard: React.FC<ProfileCardProps> = ({
  userPubKey,
  bottomSheetRef,
  showImages = true,
}) => {
  const theme = useTheme()
  const bottomSheetShareRef = React.useRef<RBSheet>(null)
  const { database } = React.useContext(AppContext)
  const { publicKey } = React.useContext(UserContext)
  const { relayPool } = React.useContext(RelayPoolContext)
  const [user, setUser] = React.useState<User>()
  const [blocked, setBlocked] = React.useState<boolean>()
  const [openLn, setOpenLn] = React.useState<boolean>(false)
  const [isContact, setIsContact] = React.useState<boolean>()
  const [showNotification, setShowNotification] = React.useState<undefined | string>()
  const [qrCode, setQrCode] = React.useState<any>()
  const nPub = React.useMemo(() => getNpub(userPubKey), [userPubKey])
  const username = React.useMemo(() => usernamePubKey(user?.name ?? '', nPub), [nPub, user])

  React.useEffect(() => {
    loadUser()
  }, [])

  const onChangeBlockUser: () => void = () => {
    if (database && blocked !== undefined) {
      updateUserBlock(userPubKey, database, !blocked).then(() => {
        setBlocked(!blocked)
        loadUser()
      })
    }
  }

  const removeContact: () => void = () => {
    if (relayPool && database && publicKey) {
      updateUserContact(userPubKey, database, false).then(() => {
        populatePets(relayPool, database, publicKey)
        setIsContact(false)
        setShowNotification('contactRemoved')
      })
    }
  }

  const addContact: () => void = () => {
    if (relayPool && database && publicKey) {
      updateUserContact(userPubKey, database, true).then(() => {
        populatePets(relayPool, database, publicKey)
        setIsContact(true)
        setShowNotification('contactAdded')
      })
    }
  }

  const loadUser: () => void = () => {
    if (database) {
      getUser(userPubKey, database).then((result) => {
        if (result) {
          setUser(result)
          setBlocked(result.blocked !== undefined && result.blocked)
          setIsContact(result?.contact)
        } else {
          setUser({ id: userPubKey })
          setBlocked(false)
        }
      })
    }
  }

  const goToProfile: () => void = () => {
    bottomSheetRef.current?.close()
    push('Profile', { pubKey: userPubKey, title: username })
  }

  const bottomSheetStyles = React.useMemo(() => {
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
    <View>
      <Card onPress={goToProfile}>
        <Card.Content style={styles.card}>
          <View style={styles.cardUser}>
            <View style={styles.cardUserMain}>
              <ProfileData
                username={user?.name}
                publicKey={user?.id ?? userPubKey}
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
        {userPubKey !== publicKey && (
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
              navigate('Conversation', { pubKey: userPubKey, title: username })
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
              bottomSheetShareRef.current?.open()
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
            icon={blocked ? 'account-cancel' : 'account-cancel-outline'}
            size={28}
            onPress={onChangeBlockUser}
          />
          <Text>{t(blocked ? 'profileCard.unblock' : 'profileCard.block')}</Text>
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
      <RBSheet ref={bottomSheetShareRef} closeOnDragDown={true} customStyles={bottomSheetStyles}>
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
            <Text>{t('profileCard.copyNPub')}</Text>
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
              <Text>{t('profileCard.copyNip05')}</Text>
            </View>
          )}
        </View>
      </RBSheet>
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
