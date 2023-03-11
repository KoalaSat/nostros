import { t } from 'i18next'
import * as React from 'react'
import { StyleSheet, View, type ListRenderItem, Switch, FlatList } from 'react-native'
import { Button, IconButton, List, Snackbar, Text, useTheme } from 'react-native-paper'
import { AppContext } from '../../Contexts/AppContext'
import { RelayPoolContext } from '../../Contexts/RelayPoolContext'
import { UserContext } from '../../Contexts/UserContext'
import { getUser, type User } from '../../Functions/DatabaseFunctions/Users'
import { populatePets, username } from '../../Functions/RelayFunctions/Users'
import LnPayment from '../LnPayment'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import { navigate } from '../../lib/Navigation'
import RBSheet from 'react-native-raw-bottom-sheet'
import { getUserRelays, type NoteRelay } from '../../Functions/DatabaseFunctions/NotesRelays'
import { relayToColor } from '../../Functions/NativeFunctions'
import { type Relay } from '../../Functions/DatabaseFunctions/Relays'
import ProfileShare from '../ProfileShare'
import { ScrollView } from 'react-native-gesture-handler'
import { Kind } from 'nostr-tools'
import { getUnixTime } from 'date-fns'
import DatabaseModule from '../../lib/Native/DatabaseModule'
import { addMutedUsersList, removeMutedUsersList } from '../../Functions/RelayFunctions/Lists'

interface ProfileActionsProps {
  user: User
  setUser: (user: User) => void
  onActionDone?: () => void
}

export const ProfileActions: React.FC<ProfileActionsProps> = ({
  user,
  setUser,
  onActionDone = () => {},
}) => {
  const theme = useTheme()
  const { database } = React.useContext(AppContext)
  const { publicKey, privateKey, mutedUsers, reloadLists } = React.useContext(UserContext)
  const { relayPool, updateRelayItem, lastEventId, sendEvent } = React.useContext(RelayPoolContext)
  const [isContact, setIsContact] = React.useState<boolean>()
  const [isMuted, setIsMuted] = React.useState<boolean>()
  const [isGroupHidden, setIsGroupHidden] = React.useState<boolean>()
  const [showNotification, setShowNotification] = React.useState<undefined | string>()
  const [showNotificationRelay, setShowNotificationRelay] = React.useState<undefined | string>()
  const bottomSheetRelaysRef = React.useRef<RBSheet>(null)
  const bottomSheetShareRef = React.useRef<RBSheet>(null)
  const bottomSheetMuteRef = React.useRef<RBSheet>(null)
  const [userRelays, setUserRelays] = React.useState<NoteRelay[]>([])
  const [openLn, setOpenLn] = React.useState<boolean>(false)

  React.useEffect(() => {
    loadUser()
    loadRelays()
    if (publicKey) {
      relayPool?.subscribe('lists-muted-users', [
        {
          kinds: [10000],
          authors: [publicKey],
          limit: 1,
        },
      ])
    }
  }, [])

  React.useEffect(() => {
    reloadLists()
    loadUser()
  }, [lastEventId, isMuted])

  const hideGroupsUser: () => void = () => {
    if (publicKey && relayPool && database && user.id) {
      sendEvent({
        content: '',
        created_at: getUnixTime(new Date()),
        kind: Kind.ChannelMuteUser,
        pubkey: publicKey,
        tags: [['p', user.id]],
      }).then(() => {
        if (database) {
          DatabaseModule.updateUserMutesGroups(user.id, true, () => {
            setIsGroupHidden(true)
            bottomSheetMuteRef.current?.close()
          })
        }
      })
    }
  }

  const loadRelays: () => void = () => {
    if (database) {
      getUserRelays(database, user.id).then((results) => {
        if (results) {
          setUserRelays(results)
        }
      })
    }
  }

  const loadUser: () => void = () => {
    if (database) {
      getUser(user.id, database).then((result) => {
        if (result) {
          setUser(result)
          setIsContact(result.contact)
          setIsMuted(mutedUsers.find((e) => e === user.id) !== undefined)
          setIsGroupHidden(result.muted_groups !== undefined && result.muted_groups > 0)
        } else if (user.id === publicKey) {
          setUser({
            id: publicKey,
          })
        }
      })
    }
  }

  const onChangeMuteUser: () => void = () => {
    if (database && publicKey && privateKey && relayPool) {
      DatabaseModule.addUser(user.id, () => {
        if (isMuted) {
          removeMutedUsersList(sendEvent, database, publicKey, user.id)
          DatabaseModule.updateUserBlock(user.id, false, () => {})
        } else {
          addMutedUsersList(sendEvent, database, publicKey, user.id)
        }
        setIsMuted(!isMuted)
        reloadLists()
        loadUser()
        setShowNotificationRelay(isMuted ? 'userUnmuted' : 'userMuted')
      })
    }
  }

  const removeContact: () => void = () => {
    if (relayPool && database && publicKey) {
      DatabaseModule.updateUserContact(user.id, false, () => {
        populatePets(sendEvent, database, publicKey)
        setIsContact(false)
        setShowNotification('contactRemoved')
      })
    }
  }

  const addContact: () => void = () => {
    if (relayPool && database && publicKey) {
      DatabaseModule.updateUserContact(user.id, true, () => {
        populatePets(sendEvent, database, publicKey)
        setIsContact(true)
        setShowNotification('contactAdded')
      })
    }
  }

  const activeRelay: (relay: Relay) => void = (relay) => {
    relay.active = 1
    updateRelayItem(relay).then(() => {
      setShowNotificationRelay('active')
    })
  }

  const desactiveRelay: (relay: Relay) => void = (relay) => {
    relay.active = 0
    relay.global_feed = 0
    updateRelayItem(relay).then(() => {
      setShowNotificationRelay('desactive')
    })
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

  const renderRelayItem: ListRenderItem<NoteRelay> = ({ index, item }) => {
    return (
      <List.Item
        key={index}
        title={item.url}
        left={() => (
          <MaterialCommunityIcons
            style={styles.relayColor}
            name='circle'
            color={relayToColor(item.url)}
          />
        )}
        right={() => (
          <Switch
            style={styles.switch}
            value={item.active !== undefined && item.active > 0}
            onValueChange={() => (item.active ? desactiveRelay(item) : activeRelay(item))}
          />
        )}
      />
    )
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
            disabled={user.id === publicKey}
          />
          <Text>{isContact ? t('profileCard.unfollow') : t('profileCard.follow')}</Text>
        </View>
        <View style={styles.actionButton}>
          <IconButton
            icon='message-plus-outline'
            size={28}
            onPress={() => {
              onActionDone()
              navigate('Conversation', {
                pubKey: user.id,
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
            onPress={() => setOpenLn(true)}
            disabled={
              !user.lnurl && user.lnurl !== '' && !user?.ln_address && user.ln_address !== ''
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
            disabled={user.id === publicKey}
          />
          <Text style={isGroupHidden ? { color: theme.colors.error } : {}}>
            {t(isGroupHidden ? 'profileCard.hiddenChats' : 'profileCard.hideChats')}
          </Text>
        </View>
      </View>
      <RBSheet
        ref={bottomSheetRelaysRef}
        closeOnDragDown={true}
        customStyles={bottomSheetStyles}
        dragFromTopOnly={true}
        onClose={() => onActionDone()}
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
        onClose={() => onActionDone()}
      >
        <ProfileShare user={user} />
      </RBSheet>
      <RBSheet
        ref={bottomSheetMuteRef}
        closeOnDragDown={true}
        customStyles={bottomSheetStyles}
        onClose={() => onActionDone()}
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
      <LnPayment setOpen={setOpenLn} open={openLn} user={user} />
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

export default ProfileActions
