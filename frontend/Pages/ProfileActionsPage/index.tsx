import React from 'react'
import { AppContext } from '../../Contexts/AppContext'
import { RelayPoolContext } from '../../Contexts/RelayPoolContext'
import { FlatList, type ListRenderItem, ScrollView, StyleSheet, View } from 'react-native'
import { Button, IconButton, List, Snackbar, Text, useTheme } from 'react-native-paper'
import { UserContext } from '../../Contexts/UserContext'
import { goBack, navigate } from '../../lib/Navigation'
import { populatePets, username } from '../../Functions/RelayFunctions/Users'
import RBSheet from 'react-native-raw-bottom-sheet'
import { addMutedUsersList, removeMutedUsersList } from '../../Functions/RelayFunctions/Lists'
import { t } from 'i18next'
import { relayToColor } from '../../Functions/NativeFunctions'
import { type User, getUser } from '../../Functions/DatabaseFunctions/Users'
import { getUnixTime } from 'date-fns'
import { Kind } from 'nostr-tools'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import LnPreview from '../../Components/LnPreview'
import ProfileShare from '../../Components/ProfileShare'
import { getUserRelays } from '../../Functions/DatabaseFunctions/NotesRelays'
import { getRelayMetadata } from '../../Functions/DatabaseFunctions/RelayMetadatas'
import { lightningInvoice } from '../../Functions/ServicesFunctions/ZapInvoice'
import DatabaseModule from '../../lib/Native/DatabaseModule'

interface ProfileActionsProps {
  route: { params: { userId: string } }
}

export const ProfileActionsPage: React.FC<ProfileActionsProps> = ({ route: { params: { userId } } }) => {
  const theme = useTheme()
  const { database, longPressZap } = React.useContext(AppContext)
  const { publicKey, privateKey, mutedUsers } = React.useContext(UserContext)
  const { relayPool, addRelayItem, lastEventId, sendEvent, relays } =
    React.useContext(RelayPoolContext)
  const [user, setUser] = React.useState<User>()
  const [isContact, setIsContact] = React.useState<boolean>()
  const [isMuted, setIsMuted] = React.useState<boolean>()
  const [isGroupHidden, setIsGroupHidden] = React.useState<boolean>()
  const [showNotification, setShowNotification] = React.useState<undefined | string>()
  const [showNotificationRelay, setShowNotificationRelay] = React.useState<undefined | string>()
  const bottomSheetRelaysRef = React.useRef<RBSheet>(null)
  const bottomSheetShareRef = React.useRef<RBSheet>(null)
  const bottomSheetMuteRef = React.useRef<RBSheet>(null)
  const [userRelays, setUserRelays] = React.useState<string[]>()
  const [zapInvoice, setZapInvoice] = React.useState<string>()

  React.useEffect(() => {
    loadUser()
    loadRelays()
    if (publicKey && userId) {
      relayPool?.subscribe(`card-user-${userId.substring(0, 6)}`, [
        {
          kinds: [10002],
          limit: 1,
          authors: [userId],
        },
      ])
    }
  }, [])

  React.useEffect(() => {
    loadUser()
    loadRelays()
  }, [lastEventId, isMuted])

  const hideGroupsUser: () => void = () => {
    if (publicKey && relayPool && database && userId) {
      sendEvent({
        content: '',
        created_at: getUnixTime(new Date()),
        kind: Kind.ChannelMuteUser,
        pubkey: publicKey,
        tags: [['p', userId]],
      }).then(() => {
        if (database) {
          DatabaseModule.updateUserMutesGroups(userId, true, () => {
            setIsGroupHidden(true)
            bottomSheetMuteRef.current?.close()
          })
        }
      })
    }
  }

  const loadRelays: () => void = () => {
    if (database) {
      getRelayMetadata(database, userId).then((resultMeta) => {
        if (resultMeta) {
          setUserRelays(resultMeta.tags.map((relayMeta) => relayMeta[1]))
        } else {
          getUserRelays(database, userId).then((resultRelays) => {
            setUserRelays(resultRelays.map((relay) => relay.url))
          })
        }
      })
    }
  }

  const loadUser: () => void = () => {
    if (database) {
      getUser(userId, database).then((result) => {
        if (result) {
          setUser(result)
          setIsContact(result.contact)
          setIsMuted(mutedUsers.find((e) => e === userId) !== undefined)
          setIsGroupHidden(result.muted_groups !== undefined && result.muted_groups > 0)
        } else if (userId === publicKey) {
          setUser({
            id: publicKey,
          })
        }
      })
    }
  }

  const onChangeMuteUser: () => void = () => {
    if (database && publicKey && privateKey && relayPool) {
      DatabaseModule.addUser(userId, () => {
        if (isMuted) {
          removeMutedUsersList(sendEvent, database, publicKey, userId)
          DatabaseModule.updateUserBlock(userId, false, () => {})
        } else {
          addMutedUsersList(sendEvent, database, publicKey, userId)
        }
        setIsMuted(!isMuted)
        loadUser()
        setShowNotificationRelay(isMuted ? 'userUnmuted' : 'userMuted')
      })
    }
  }

  const removeContact: () => void = () => {
    if (relayPool && database && publicKey) {
      DatabaseModule.updateUserContact(userId, false, () => {
        populatePets(sendEvent, database, publicKey)
        setIsContact(false)
        setShowNotification('contactRemoved')
      })
    }
  }

  const addContact: () => void = () => {
    if (relayPool && database && publicKey) {
      DatabaseModule.updateUserContact(userId, true, () => {
        populatePets(sendEvent, database, publicKey)
        setIsContact(true)
        setShowNotification('contactAdded')
      })
    }
  }

  const bottomSheetStyles = React.useMemo(() => {
    return {
      container: {
        backgroundColor: theme.colors.background,
        paddingTop: 16,
        paddingBottom: 32,
        paddingLeft: 16,
        borderTopRightRadius: 28,
        borderTopLeftRadius: 28,
        height: 'auto',
      },
    }
  }, [])

  const onPressAddRelay: (url: string) => void = (url) => {
    addRelayItem({ url })
  }

  const renderRelayItem: ListRenderItem<string> = ({ index, item }) => {
    const userRelayUrls = relays.map((relay) => relay.url)
    return (
      <List.Item
        key={index}
        title={item}
        left={() => (
          <MaterialCommunityIcons
            style={styles.relayColor}
            name='circle'
            color={relayToColor(item)}
          />
        )}
        right={() => {
          if (userRelayUrls.includes(item)) {
            return <></>
          } else {
            return (
              <Button mode='text' onPress={() => onPressAddRelay(item)}>
                {t('profileCard.addRelay')}
              </Button>
            )
          }
        }}
      />
    )
  }

  const generateZapInvoice: () => void = () => {
    const lud = user?.ln_address && user?.ln_address !== '' ? user?.ln_address : user?.lnurl

    if (lud && lud !== '' && longPressZap && database && privateKey && publicKey && user?.id) {
      lightningInvoice(
        database,
        lud,
        longPressZap,
        privateKey,
        publicKey,
        user?.id,
        true,
        user?.zap_pubkey,
      ).then((invoice) => {
        if (invoice) setZapInvoice(invoice)
      })
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.mainLayout}>
        <View style={styles.actionButton}>
          <IconButton
            icon={isContact ? 'account-multiple-remove-outline' : 'account-multiple-plus-outline'}
            size={28}
            onPress={() => {
              isContact ? removeContact() : addContact()
            }}
            disabled={userId === publicKey}
          />
          <Text>{isContact ? t('profileCard.unfollow') : t('profileCard.follow')}</Text>
        </View>
        <View style={styles.actionButton}>
          <IconButton
            icon='message-plus-outline'
            size={28}
            onPress={() => {
              navigate('Conversation', {
                pubKey: userId,
                title: username(user),
              })
            }}
          />
          <Text>{t('profileCard.message')}</Text>
        </View>
        <View style={styles.actionButton}>
          <IconButton
            icon='lightning-bolt'
            size={28}
            onPress={() => navigate('Zap', { user })}
            onLongPress={longPressZap ? generateZapInvoice : undefined}
            disabled={
              !user?.lnurl && user?.lnurl !== '' && !user?.ln_address && user?.ln_address !== ''
            }
            iconColor='#F5D112'
          />
          <Text>{t('profileCard.invoice')}</Text>
        </View>
      </View>
      <View style={styles.mainLayout}>
        <View style={styles.actionButton}>
          <IconButton
            icon={isMuted ? 'volume-off' : 'volume-high'}
            iconColor={isMuted ? theme.colors.error : theme.colors.onSecondaryContainer}
            size={28}
            onPress={onChangeMuteUser}
          />
          <Text style={isMuted ? { color: theme.colors.error } : {}}>
            {t(isMuted ? 'profileCard.muted' : 'profileCard.mute')}
          </Text>
        </View>
        <View style={styles.actionButton}>
          <IconButton
            icon='share-variant-outline'
            size={28}
            onPress={() => bottomSheetShareRef.current?.open()}
          />
          <Text>{t('profileCard.share')}</Text>
        </View>
        <View style={styles.actionButton}>
          <IconButton
            icon='chart-timeline-variant'
            size={28}
            onPress={() => bottomSheetRelaysRef.current?.open()}
          />
          <Text>{t('profileCard.relaysTitle')}</Text>
        </View>
      </View>
      <View style={styles.mainLayout}>
        <View style={styles.actionButton}>
          <IconButton
            icon='account-cancel-outline'
            iconColor={isGroupHidden ? theme.colors.error : theme.colors.onSecondaryContainer}
            size={28}
            onPress={() => !isGroupHidden && bottomSheetMuteRef.current?.open()}
            disabled={userId === publicKey}
          />
          <Text style={isGroupHidden ? { color: theme.colors.error } : {}}>
            {t(isGroupHidden ? 'profileCard.hiddenChats' : 'profileCard.hideChats')}
          </Text>
        </View>
        <View style={styles.actionButton}>
          <IconButton
            icon='eye'
            size={28}
            onPress={() => {
              navigate('Profile', { pubKey: userId })
            }}
          />
          <Text>{t('profileCard.view')}</Text>
        </View>
      </View>
      <RBSheet
        ref={bottomSheetRelaysRef}
        closeOnDragDown={true}
        customStyles={bottomSheetStyles}
        dragFromTopOnly={true}
      >
        <View>
          <Text variant='titleLarge'>{t('profileCard.relaysTitle')}</Text>
          <Text variant='bodyMedium'>
            {t('profilePage.relaysDescription', { username: username(user) })}
          </Text>
          <List.Item
            title={t('relaysPage.relayName')}
            right={() => (
              <>
                <Text style={styles.listHeader}>{t('relaysPage.active')}</Text>
              </>
            )}
          />
          <View style={styles.relaysList}>
            <ScrollView>
              <FlatList data={userRelays} renderItem={renderRelayItem} />
            </ScrollView>
          </View>
        </View>
        {showNotificationRelay && (
          <Snackbar
            style={styles.snackbar}
            visible={showNotificationRelay !== undefined}
            duration={Snackbar.DURATION_SHORT}
            onIconPress={() => setShowNotificationRelay(undefined)}
            onDismiss={() => setShowNotificationRelay(undefined)}
          >
            {t(`profileCard.notifications.${showNotificationRelay}`)}
          </Snackbar>
        )}
      </RBSheet>
      <RBSheet
        ref={bottomSheetShareRef}
        closeOnDragDown={true}
        customStyles={bottomSheetStyles}
        onClose={() => goBack()}
      >
        {user && <ProfileShare user={user} />}
      </RBSheet>
      <RBSheet
        ref={bottomSheetMuteRef}
        closeOnDragDown={true}
        customStyles={bottomSheetStyles}
        onClose={() => goBack()}
      >
        <View style={styles.muteContainer}>
          <Text variant='titleLarge'>
            {t('profileCard.hideChats', { username: username(user) })}
          </Text>
          <View style={[styles.warning, { backgroundColor: '#683D00' }]}>
            <Text variant='titleSmall' style={[styles.warningTitle, { color: '#FFDCBB' }]}>
              {t('profileCard.hideWarningTitle')}
            </Text>
            <Text style={{ color: '#FFDCBB' }}>{t('profileCard.hideWarning')}</Text>
          </View>
          <Button style={styles.buttonSpacer} mode='contained' onPress={hideGroupsUser}>
            {t('profileCard.hideChatsForever', { username: username(user) })}
          </Button>
          <Button
            mode='outlined'
            onPress={() => {
              bottomSheetMuteRef.current?.close()
            }}
          >
            {t('profileCard.cancel')}
          </Button>
        </View>
      </RBSheet>
      {zapInvoice && (
        <LnPreview 
          invoices={[{ invoice: zapInvoice }]} 
          setInvoices={(arr) => setZapInvoice(arr[0]?.invoice)}
        />
      )}
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
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingRight: 16,
    paddingLeft: 16,
  },
  relayColor: {
    paddingTop: 9,
  },
  mainLayout: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    alignItems: 'center',
  },
  snackbar: {
    marginLeft: 16,
    bottom: 16,
    flex: 1,
  },
  switch: {
    marginLeft: 32,
  },
  listHeader: {
    paddingRight: 5,
    paddingLeft: 16,
    textAlign: 'center',
  },
  warning: {
    borderRadius: 4,
    padding: 16,
    marginTop: 16,
    marginBottom: 16,
  },
  warningTitle: {
    marginBottom: 8,
  },
  buttonSpacer: {
    marginTop: 16,
    marginBottom: 16,
  },
  muteContainer: {
    paddingRight: 16,
  },
  relaysList: {
    maxHeight: '90%',
  },
})

export default ProfileActionsPage
