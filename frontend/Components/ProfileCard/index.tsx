import { t } from 'i18next'
import * as React from 'react'
import { StyleSheet, View } from 'react-native'
import Clipboard from '@react-native-clipboard/clipboard'
import { Card, IconButton, Snackbar, Text, useTheme } from 'react-native-paper'
import { AppContext } from '../../Contexts/AppContext'
import { RelayPoolContext } from '../../Contexts/RelayPoolContext'
import { UserContext } from '../../Contexts/UserContext'
import {
  addUser,
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
  userPubKey: string
  bottomSheetRef: React.RefObject<RBSheet>
  showImages: boolean
}

export const ProfileCard: React.FC<ProfileCardProps> = ({
  userPubKey,
  bottomSheetRef,
  showImages = true,
}) => {
  const theme = useTheme()
  const { database } = React.useContext(AppContext)
  const { publicKey } = React.useContext(UserContext)
  const { relayPool } = React.useContext(RelayPoolContext)
  const [user, setUser] = React.useState<User>()
  const [blocked, setBlocked] = React.useState<boolean>()
  const [openLn, setOpenLn] = React.useState<boolean>(false)
  const [isContact, setIsContact] = React.useState<boolean>()
  const [showNotification, setShowNotification] = React.useState<undefined | string>()
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
          setBlocked(result.blocked)
          setIsContact(result?.contact)
        } else {
          addUser(userPubKey, database).then(() => {
            setUser({ id: userPubKey })
            setBlocked(false)
          })
        }
      })
    }
  }

  const goToProfile: () => void = () => {
    bottomSheetRef.current?.close()
    push('Profile', { pubKey: userPubKey, title: username })
  }

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
            { user?.about &&
                <View style={styles.about}>
                  <Text>
                    {`${user?.about ? user?.about?.slice(0, 75) : ''}${
                        user?.about && user?.about?.length > 75 ? ' ...' : ''
                    }`}
                  </Text>
                </View>
            }
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
            icon={blocked ? 'account-cancel' : 'account-cancel-outline'}
            size={28}
            onPress={onChangeBlockUser}
          />
          <Text>{t(blocked ? 'profileCard.unblock' : 'profileCard.block')}</Text>
        </View>
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
            icon='content-copy'
            size={28}
            onPress={() => {
              setShowNotification('npubCopied')
              Clipboard.setString(nPub ?? '')
            }}
          />
          <Text>{t('profileCard.copyNPub')}</Text>
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
    flexBasis: '33.333333%',
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
