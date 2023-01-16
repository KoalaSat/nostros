import { t } from 'i18next'
import { npubEncode } from 'nostr-tools/nip19'
import * as React from 'react'
import { Clipboard, StyleSheet, View } from 'react-native'
import { Card, IconButton, Text } from 'react-native-paper'
import { AppContext } from '../../Contexts/AppContext'
import { RelayPoolContext } from '../../Contexts/RelayPoolContext'
import { UserContext } from '../../Contexts/UserContext'
import { getUser, updateUserContact, User } from '../../Functions/DatabaseFunctions/Users'
import { populatePets } from '../../Functions/RelayFunctions/Users'
import NostrosAvatar from '../NostrosAvatar'
import NostrosNotification from '../NostrosNotification'
import LnPayment from '../LnPayment'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import { navigate, push } from '../../lib/Navigation'
import RBSheet from 'react-native-raw-bottom-sheet'

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
    push('Profile', { pubKey: userPubKey })
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
                  pubKey={userPubKey}
                  src={user?.picture}
                  lud06={user?.lnurl}
                  size={54}
                />
              </View>
              <View>
                <View style={styles.userName}>
                  <Text variant='titleMedium'>{user?.name}</Text>
                  {/* <MaterialCommunityIcons name="check-decagram-outline" size={16} /> */}
                </View>
                <Text>{user?.nip05}</Text>
              </View>
            </View>
            <View>
              <Text>{`${user?.about?.slice(0, 75)}${
                user?.about && user?.about?.length > 75 && ' ...'
              }`}</Text>
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
              navigate('Conversation', { pubKey: userPubKey })
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
              const profileNPud = npubEncode(userPubKey)
              Clipboard.setString(profileNPud ?? '')
            }}
          />
          <Text>{t('profileCard.copyNPub')}</Text>
        </View>
        <View style={styles.actionButton}>
          <IconButton
            icon='lightning-bolt'
            size={28}
            onPress={() => setOpenLn(true)}
            iconColor='#F5D112'
          />
          <Text>{t('profileCard.invoice')}</Text>
        </View>
      </View>
      <NostrosNotification
        showNotification={showNotification}
        setShowNotification={setShowNotification}
      >
        <Text>{t(`profileCard.notifications.${showNotification}`)}</Text>
      </NostrosNotification>
      <LnPayment setOpen={setOpenLn} open={openLn} user={user} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
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
  },
  list: {
    padding: 16,
  },
  cardUser: {
    flex: 1,
  },
})

export default ProfileCard
