import { t } from 'i18next'
import * as React from 'react'
import { Clipboard, StyleSheet, View } from 'react-native'
import { Card, IconButton, Snackbar, Text } from 'react-native-paper'
import { AppContext } from '../../Contexts/AppContext'
import { RelayPoolContext } from '../../Contexts/RelayPoolContext'
import { UserContext } from '../../Contexts/UserContext'
import { getUser, updateUserContact, User } from '../../Functions/DatabaseFunctions/Users'
import { populatePets, usernamePubKey } from '../../Functions/RelayFunctions/Users'
import NostrosAvatar from '../NostrosAvatar'
import LnPayment from '../LnPayment'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import { navigate, push } from '../../lib/Navigation'
import RBSheet from 'react-native-raw-bottom-sheet'
import { getNpub } from '../../lib/nostr/Nip19'

interface ProfileCardProps {
  userPubKey: string
  bottomSheetRef: React.RefObject<RBSheet>
}

export const ProfileCard: React.FC<ProfileCardProps> = ({ userPubKey, bottomSheetRef }) => {
  const { database } = React.useContext(AppContext)
  const { publicKey } = React.useContext(UserContext)
  const { relayPool } = React.useContext(RelayPoolContext)
  const [user, setUser] = React.useState<User>()
  const [openLn, setOpenLn] = React.useState<boolean>(false)
  const [isContact, setIsContact] = React.useState<boolean>()
  const [showNotification, setShowNotification] = React.useState<undefined | string>()
  const nPub = React.useMemo(() => getNpub(userPubKey), [userPubKey])
  const username = React.useMemo(() => usernamePubKey(user?.name ?? '', nPub), [nPub, user])

  React.useEffect(() => {
    loadUser()
  }, [])

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
          setIsContact(result?.contact)
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
              <View>
                <NostrosAvatar
                  name={user?.name}
                  pubKey={nPub}
                  src={user?.picture}
                  lud06={user?.lnurl}
                  size={54}
                />
              </View>
              <View>
                <View style={styles.username}>
                  <Text variant='titleMedium'>{username}</Text>
                  {/* <MaterialCommunityIcons name="check-decagram-outline" size={16} /> */}
                  <Text>{user?.nip05}</Text>
                </View>
              </View>
            </View>
            <View style={styles.about}>
              <Text>
                {`${user?.about ? user?.about?.slice(0, 75) : ''}${
                  user?.about && user?.about?.length > 75 ? ' ...' : ''
                }`}
              </Text>
            </View>
          </View>
          <View>
            <MaterialCommunityIcons name='menu-right' size={25} />
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
            icon='content-copy'
            size={28}
            onPress={() => {
              setShowNotification('npubCopied')
              Clipboard.setString(nPub ?? '')
            }}
          />
          <Text>{t('profileCard.copyNPub')}</Text>
        </View>
        <View style={styles.actionButton}>
          {user?.lnurl && (
            <>
              <IconButton
                icon='lightning-bolt'
                size={28}
                onPress={() => setOpenLn(true)}
                iconColor='#F5D112'
              />
              <Text>{t('profileCard.invoice')}</Text>
            </>
          )}
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
    margin: 16,
    width: '100%',
  },
  username: {
    paddingLeft: 16,
  },
  contacts: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  mainLayout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
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
    minWidth: 58,
  },
  list: {
    padding: 16,
  },
  cardUser: {
    flex: 1,
  },
})

export default ProfileCard
