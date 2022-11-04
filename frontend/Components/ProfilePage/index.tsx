import {
  Card,
  Layout,
  Spinner,
  Text,
  TopNavigation,
  TopNavigationAction,
  useTheme,
} from '@ui-kitten/components'
import React, { useCallback, useContext, useEffect, useState } from 'react'
import {
  Clipboard,
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native'
import { AppContext } from '../../Contexts/AppContext'
import UserAvatar from 'react-native-user-avatar'
import { getNotes, Note } from '../../Functions/DatabaseFunctions/Notes'
import NoteCard from '../NoteCard'
import { RelayPoolContext } from '../../Contexts/RelayPoolContext'
import { getUser, removeContact, addContact, User } from '../../Functions/DatabaseFunctions/Users'
import { EventKind, Event } from '../../lib/nostr/Events'
import Relay, { RelayFilters } from '../../lib/nostr/Relay'
import Icon from 'react-native-vector-icons/FontAwesome5'
import { populatePets, tagToUser } from '../../Functions/RelayFunctions/Users'
import { getReplyEventId } from '../../Functions/RelayFunctions/Events'
import Loading from '../Loading'
import { storeEvent } from '../../Functions/DatabaseFunctions/Events'
import { handleInfinityScroll } from '../../Functions/NativeFunctions'

export const ProfilePage: React.FC = () => {
  const { database, page, goToPage, goBack } = useContext(AppContext)
  const { publicKey, privateKey, lastEventId, relayPool } = useContext(RelayPoolContext)
  const theme = useTheme()
  const initialPageSize = 10
  const [notes, setNotes] = useState<Note[]>()
  const [user, setUser] = useState<User>()
  const [pageSize, setPageSize] = useState<number>(initialPageSize)
  const [contactsIds, setContactsIds] = useState<string[]>()
  const [isContact, setIsContact] = useState<boolean>()
  const [refreshing, setRefreshing] = useState(false)
  const breadcrump = page.split('%')
  const userId = breadcrump[breadcrump.length - 1].split('#')[1] ?? publicKey
  const username = user?.name === '' ? user?.id : user?.name

  useEffect(() => {
    setRefreshing(true)
    relayPool?.unsubscribeAll()
    setContactsIds(undefined)
    setNotes(undefined)
    setUser(undefined)

    loadUser()
    loadNotes()
    subscribeNotes()
  }, [page])

  const loadUser: () => void = () => {
    if (database) {
      getUser(userId, database).then((result) => {
        if (result) {
          subscribeProfile()
          setUser(result)
          setIsContact(result?.contact)
        }
      })
    }
  }

  const loadNotes: (past?: boolean) => void = (past) => {
    if (database) {
      getNotes(database, { filters: { pubkey: userId }, limit: pageSize }).then((results) => {
        setNotes(results)
        setRefreshing(false)
      })
    }
  }

  const subscribeNotes: (past?: boolean) => void = (past) => {
    if (!database) return
    const limit = past ? pageSize : 1
    getNotes(database, { filters: { pubkey: userId }, limit }).then((results) => {
      const message: RelayFilters = {
        kinds: [EventKind.textNote, EventKind.recommendServer],
        authors: [userId],
        limit: initialPageSize,
      }
      if (past) {
        message.until = results[results.length - 1]?.created_at
      } else {
        message.since = results[0]?.created_at
      }

      relayPool?.subscribe('main-channel', message)
    })
  }

  const subscribeProfile: () => Promise<void> = async () => {
    relayPool?.subscribe('main-channel', {
      kinds: [EventKind.meta, EventKind.petNames],
      authors: [userId],
    })
    relayPool?.on('event', 'profile', (_relay: Relay, _subId?: string, event?: Event) => {
      console.log('PROFILE EVENT =======>', event)
      if (database) {
        if (event?.id && event.pubkey === userId) {
          if (event.kind === EventKind.petNames) {
            const ids = event.tags.map((tag) => tagToUser(tag).id)
            setContactsIds(ids)
          } else if (event.kind === EventKind.meta) {
            storeEvent(event, database).then(() => setRefreshing(false))
          }
        }
      }
    })
  }

  useEffect(() => {
    if (notes) {
      loadUser()
      loadNotes()
    }
  }, [lastEventId])

  useEffect(() => {
    if (pageSize > initialPageSize && notes) {
      loadUser()
      loadNotes()
      subscribeNotes(true)
    }
  }, [pageSize])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    relayPool?.unsubscribeAll()
    loadNotes(true)
  }, [])

  const removeAuthor: () => void = () => {
    if (relayPool && database && publicKey) {
      removeContact(userId, database).then(() => {
        populatePets(relayPool, database, publicKey)
        setIsContact(false)
      })
    }
  }

  const addAuthor: () => void = () => {
    if (relayPool && database && publicKey) {
      addContact(userId, database).then(() => {
        populatePets(relayPool, database, publicKey)
        setIsContact(true)
      })
    }
  }

  const renderOptions: () => JSX.Element = () => {
    if (publicKey === userId) {
      return (
        <TopNavigationAction
          icon={<Icon name='cog' size={16} color={theme['text-basic-color']} solid />}
          onPress={() => goToPage('config')}
        />
      )
    } else {
      if (user) {
        if (isContact) {
          return (
            <TopNavigationAction
              icon={<Icon name='user-minus' size={16} color={theme['color-danger-500']} solid />}
              onPress={removeAuthor}
            />
          )
        } else {
          return (
            <TopNavigationAction
              icon={<Icon name='user-plus' size={16} color={theme['color-success-500']} solid />}
              onPress={addAuthor}
            />
          )
        }
      } else {
        return <Spinner size='small' />
      }
    }
  }

  const onPressBack: () => void = () => {
    relayPool?.removeOn('event', 'profile')
    relayPool?.unsubscribeAll()
    goBack()
  }

  const renderBackAction = (): JSX.Element => {
    if (publicKey === userId) {
      return <></>
    } else {
      return (
        <TopNavigationAction
          icon={<Icon name='arrow-left' size={16} color={theme['text-basic-color']} />}
          onPress={onPressBack}
        />
      )
    }
  }

  const styles = StyleSheet.create({
    list: {
      flex: 1,
    },
    icon: {
      width: 32,
      height: 32,
    },
    settingsIcon: {
      width: 48,
      height: 48,
    },
    avatar: {
      width: 130,
      marginBottom: 16,
    },
    profile: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 2,
      paddingLeft: 32,
      paddingRight: 32,
    },
    loading: {
      maxHeight: 160,
    },
    about: {
      flex: 4,
      maxHeight: 200,
    },
    stats: {
      flex: 1,
    },
    statsItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 5,
    },
    description: {
      marginTop: 16,
      flexDirection: 'row',
    },
    loadingBottom: {
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      flexWrap: 'wrap',
      padding: 12,
    },
  })

  const itemCard: (note: Note) => JSX.Element = (note) => {
    return (
      <Card onPress={() => onPressNote(note)} key={note.id ?? ''}>
        <NoteCard note={note} />
      </Card>
    )
  }

  const onPressNote: (note: Note) => void = (note) => {
    if (note.kind !== EventKind.recommendServer) {
      const mainEventId = getReplyEventId(note)
      if (mainEventId) {
        goToPage(`note#${mainEventId}`)
      } else if (note.id) {
        goToPage(`note#${note.id}`)
      }
    }
  }

  const onPressId: () => void = () => {
    Clipboard.setString(user?.id ?? '')
  }

  const isFollowingUser: () => boolean = () => {
    if (contactsIds !== undefined && publicKey) {
      return contactsIds?.includes(publicKey)
    }
    return false
  }

  const onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void = (event) => {
    if (handleInfinityScroll(event)) {
      const newSize: number = notes?.length === pageSize ? pageSize + initialPageSize : pageSize
      setPageSize(newSize)
    }
  }

  const stats: () => JSX.Element = () => {
    if (contactsIds === undefined) {
      return (
        <Layout style={styles.stats} level='3'>
          <Spinner size='small' />
        </Layout>
      )
    }

    return (
      <Layout style={styles.stats} level='3'>
        <Layout style={styles.statsItem} level='3'>
          <Icon name='address-book' size={16} color={theme['text-basic-color']} solid />
          <Text>{` ${contactsIds?.length}`}</Text>
        </Layout>
        {publicKey !== userId && (
          <Layout style={styles.statsItem} level='3'>
            <Text>
              <Icon
                name='people-arrows'
                size={16}
                color={theme[isFollowingUser() ? 'text-basic-color' : 'color-primary-disabled']}
                solid
              />
            </Text>
          </Layout>
        )}
      </Layout>
    )
  }

  const profile: JSX.Element = (
    <Layout style={styles.profile} level='3'>
      <Layout style={styles.avatar} level='3'>
        {user ? (
          <>
            <UserAvatar
              name={username ?? user.id}
              src={user?.picture}
              size={130}
              textColor={theme['text-basic-color']}
            />
          </>
        ) : (
          <></>
        )}
      </Layout>
      <TouchableOpacity onPress={onPressId}>
        <Text appearance='hint'>{user?.id}</Text>
      </TouchableOpacity>
      <Layout style={styles.description} level='3'>
        {user && (
          <>
            {stats()}
            <Layout style={styles.about} level='3'>
              <Text numberOfLines={5} ellipsizeMode='tail'>
                {user?.about}
              </Text>
            </Layout>
          </>
        )}
      </Layout>
    </Layout>
  )

  return (
    <>
      <TopNavigation
        alignment='center'
        title={username}
        accessoryLeft={renderBackAction}
        accessoryRight={renderOptions}
      />
      {profile}
      <Layout style={styles.list} level='3'>
        {notes && notes.length > 0 ? (
          <ScrollView
            onScroll={onScroll}
            horizontal={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          >
            {notes.map((note) => itemCard(note))}
            {notes.length >= initialPageSize && (
              <View style={styles.loadingBottom}>
                <Spinner size='tiny' />
              </View>
            )}
          </ScrollView>
        ) : (
          <Loading />
        )}
      </Layout>
      {privateKey && publicKey === userId && (
        <TouchableOpacity
          style={{
            borderWidth: 1,
            borderColor: 'rgba(0,0,0,0.2)',
            alignItems: 'center',
            justifyContent: 'center',
            width: 65,
            position: 'absolute',
            bottom: 20,
            right: 20,
            height: 65,
            backgroundColor: theme['color-warning-500'],
            borderRadius: 100,
          }}
          onPress={() => goToPage('send')}
        >
          <Icon name='paper-plane' size={30} color={theme['text-basic-color']} solid />
        </TouchableOpacity>
      )}
    </>
  )
}

export default ProfilePage
