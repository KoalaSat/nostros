import React, { useCallback, useContext, useEffect, useState } from 'react'
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native'
import Clipboard from '@react-native-clipboard/clipboard'
import {
  Surface,
  Text,
  IconButton,
  ActivityIndicator,
  useTheme,
  Snackbar,
} from 'react-native-paper'
import { AppContext } from '../../Contexts/AppContext'
import { UserContext } from '../../Contexts/UserContext'
import { RelayPoolContext } from '../../Contexts/RelayPoolContext'
import { getNotes, Note } from '../../Functions/DatabaseFunctions/Notes'
import { getUser, updateUserContact, User } from '../../Functions/DatabaseFunctions/Users'
import { Kind } from 'nostr-tools'
import { populatePets, username } from '../../Functions/RelayFunctions/Users'
import { useTranslation } from 'react-i18next'
import { RelayFilters } from '../../lib/nostr/RelayPool/intex'
import NoteCard from '../../Components/NoteCard'
import LnPayment from '../../Components/LnPayment'
import { handleInfinityScroll } from '../../Functions/NativeFunctions'
import RBSheet from 'react-native-raw-bottom-sheet'
import ProfileCard from '../../Components/ProfileCard'
import { navigate } from '../../lib/Navigation'
import { useFocusEffect } from '@react-navigation/native'
import { getNpub } from '../../lib/nostr/Nip19'
import ProfileData from '../../Components/ProfileData'

interface ProfilePageProps {
  route: { params: { pubKey: string } }
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ route }) => {
  const { database } = useContext(AppContext)
  const { publicKey } = useContext(UserContext)
  const { lastEventId, relayPool } = useContext(RelayPoolContext)
  const { t } = useTranslation('common')
  const bottomSheetProfileRef = React.useRef<RBSheet>(null)
  const theme = useTheme()
  const initialPageSize = 10
  const [showNotification, setShowNotification] = useState<undefined | string>()
  const [notes, setNotes] = useState<Note[]>()
  const [user, setUser] = useState<User>()
  const [openLn, setOpenLn] = React.useState<boolean>(false)
  const [pageSize, setPageSize] = useState<number>(initialPageSize)
  const [isContact, setIsContact] = useState<boolean>()
  const [refreshing, setRefreshing] = useState(false)
  const [firstLoad, setFirstLoad] = useState(true)

  useFocusEffect(
    React.useCallback(() => {
      subscribeProfile()
      subscribeNotes()
      loadUser()
      loadNotes()
      setFirstLoad(false)

      return () =>
        relayPool?.unsubscribe([
          `main-profile${route.params.pubKey}`,
          `user-profile${route.params.pubKey}`,
          `answers-profile${route.params.pubKey}`,
        ])
    }, []),
  )

  useEffect(() => {
    if (!firstLoad) {
      if (pageSize > initialPageSize) {
        subscribeNotes(true)
      }
      loadUser()
      loadNotes()
    }
  }, [pageSize, lastEventId])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    loadUser()
    loadNotes()
    subscribeProfile()
    subscribeNotes()
  }, [])

  const loadUser: () => void = () => {
    if (database) {
      getUser(route.params.pubKey, database).then((result) => {
        if (result) {
          setUser(result)
          setIsContact(result?.contact)
        } else if (route.params.pubKey === publicKey) {
          setUser({
            id: publicKey,
          })
        }
      })
    }
  }

  const loadNotes: (past?: boolean) => void = () => {
    if (database) {
      getNotes(database, { filters: { pubkey: route.params.pubKey }, limit: pageSize }).then(
        (results) => {
          setNotes(results)
          setRefreshing(false)
          if (results.length > 0) {
            relayPool?.subscribe(`answers-profile${route.params.pubKey}`, [
              {
                kinds: [Kind.Reaction, Kind.Text, Kind.RecommendRelay],
                '#e': results.map((note) => note.id ?? ''),
              },
            ])
          }
        },
      )
    }
  }

  const subscribeProfile: () => Promise<void> = async () => {
    relayPool?.subscribe(`user-profile${route.params.pubKey}`, [
      {
        kinds: [Kind.Metadata, Kind.Contacts],
        authors: [route.params.pubKey],
      },
    ])
  }

  const subscribeNotes: (past?: boolean) => void = (past) => {
    if (!database) return

    const message: RelayFilters = {
      kinds: [Kind.Text, Kind.RecommendRelay],
      authors: [route.params.pubKey],
      limit: pageSize,
    }
    relayPool?.subscribe(`main-profile${route.params.pubKey}`, [message])
  }

  const removeContact: () => void = () => {
    if (relayPool && database && publicKey) {
      updateUserContact(route.params.pubKey, database, false).then(() => {
        populatePets(relayPool, database, publicKey)
        setIsContact(false)
        setShowNotification('contactRemoved')
      })
    }
  }

  const addContact: () => void = () => {
    if (relayPool && database && publicKey) {
      updateUserContact(route.params.pubKey, database, true).then(() => {
        populatePets(relayPool, database, publicKey)
        setIsContact(true)
        setShowNotification('contactAdded')
      })
    }
  }

  const onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void = (event) => {
    if (handleInfinityScroll(event)) {
      setPageSize(pageSize + initialPageSize)
    }
  }

  const renderItem: (note: Note) => JSX.Element = (note) => (
    <View style={styles.noteCard} key={note.id}>
      <NoteCard note={note} onPressUser={() => bottomSheetProfileRef.current?.open()} />
    </View>
  )

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
      <ScrollView
        onScroll={onScroll}
        horizontal={false}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Surface style={styles.container} elevation={1}>
          <ProfileData
            username={user?.name}
            publicKey={route.params.pubKey}
            validNip05={user?.valid_nip05}
            nip05={user?.nip05}
            lud06={user?.lnurl}
            picture={user?.picture}
            avatarSize={54}
          />
          <View>
            <Text>{user?.about}</Text>
          </View>
          <View style={styles.mainLayout}>
            {route.params.pubKey !== publicKey && (
              <View style={styles.actionButton}>
                <IconButton
                  icon={
                    isContact ? 'account-multiple-remove-outline' : 'account-multiple-plus-outline'
                  }
                  size={28}
                  onPress={() => {
                    isContact ? removeContact() : addContact()
                  }}
                  disabled={route.params.pubKey === publicKey}
                />
                <Text>{isContact ? t('profilePage.unfollow') : t('profilePage.follow')}</Text>
              </View>
            )}
            <View style={styles.actionButton}>
              <IconButton
                icon='message-plus-outline'
                size={28}
                onPress={() => {
                  navigate('Conversation', {
                    pubKey: route.params.pubKey,
                    title: user ? username(user) : route.params.pubKey,
                  })
                  bottomSheetProfileRef.current?.close()
                }}
              />
              <Text>{t('profilePage.message')}</Text>
            </View>
            <View style={styles.actionButton}>
              <IconButton
                icon='content-copy'
                size={28}
                onPress={() => {
                  setShowNotification('copyNPub')
                  const profileNPud = getNpub(route.params.pubKey)
                  Clipboard.setString(profileNPud ?? '')
                }}
              />
              <Text>{t('profilePage.copyNPub')}</Text>
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
                  <Text>{t('profilePage.invoice')}</Text>
                </>
              )}
            </View>
          </View>
        </Surface>
        {notes && notes.length > 0 && (
          <View style={styles.list}>
            {notes.map((note) => renderItem(note))}
            {notes.length >= 10 && <ActivityIndicator animating={true} />}
          </View>
        )}
      </ScrollView>
      {showNotification && (
        <Snackbar
          style={styles.snackbar}
          visible={showNotification !== undefined}
          duration={Snackbar.DURATION_SHORT}
          onIconPress={() => setShowNotification(undefined)}
          onDismiss={() => setShowNotification(undefined)}
        >
          {t(`profilePage.${showNotification}`)}
        </Snackbar>
      )}
      <LnPayment setOpen={setOpenLn} open={openLn} user={user} />
      <RBSheet ref={bottomSheetProfileRef} closeOnDragDown={true} customStyles={bottomSheetStyles}>
        <ProfileCard
          userPubKey={route.params.pubKey ?? ''}
          bottomSheetRef={bottomSheetProfileRef}
        />
      </RBSheet>
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
  },
  userData: {
    paddingLeft: 16,
  },
  userName: {
    flexDirection: 'row',
  },
  actionButton: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 100,
  },
  snackbar: {
    margin: 16,
    bottom: 70,
  },
  list: {
    padding: 16,
  },
  noteCard: {
    marginBottom: 16,
  },
  verifyIcon: {
    paddingTop: 6,
    paddingLeft: 5,
  },
})

export default ProfilePage
