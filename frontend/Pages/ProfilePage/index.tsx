import React, { useCallback, useContext, useEffect, useState } from 'react'
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native'
import { Surface, Text, ActivityIndicator, Snackbar, Divider } from 'react-native-paper'
import { FlashList, ListRenderItem } from '@shopify/flash-list'
import { AppContext } from '../../Contexts/AppContext'
import { UserContext } from '../../Contexts/UserContext'
import { RelayPoolContext } from '../../Contexts/RelayPoolContext'
import { getNotes, Note } from '../../Functions/DatabaseFunctions/Notes'
import { getUser, User } from '../../Functions/DatabaseFunctions/Users'
import { Kind } from 'nostr-tools'
import { useTranslation } from 'react-i18next'
import { RelayFilters } from '../../lib/nostr/RelayPool/intex'
import NoteCard from '../../Components/NoteCard'
import { handleInfinityScroll } from '../../Functions/NativeFunctions'
import { useFocusEffect } from '@react-navigation/native'
import ProfileData from '../../Components/ProfileData'
import ProfileActions from '../../Components/ProfileActions'

interface ProfilePageProps {
  route: { params: { pubKey: string } }
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ route }) => {
  const { database } = useContext(AppContext)
  const { publicKey } = useContext(UserContext)
  const { lastEventId, relayPool } = useContext(RelayPoolContext)
  const { t } = useTranslation('common')
  const initialPageSize = 10
  const [showNotification, setShowNotification] = useState<undefined | string>()
  const [notes, setNotes] = useState<Note[]>()
  const [user, setUser] = useState<User>()
  const [pageSize, setPageSize] = useState<number>(initialPageSize)
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
          `profile${route.params.pubKey}`,
          `profile-user${route.params.pubKey}`,
          `profile-answers${route.params.pubKey}`,
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
            relayPool?.subscribe(`profile-answers${route.params.pubKey.substring(0, 8)}`, [
              {
                kinds: [Kind.Reaction, Kind.Text, Kind.RecommendRelay, 9735],
                '#e': results.map((note) => note.id ?? ''),
              },
            ])
          }
        },
      )
    }
  }

  const subscribeProfile: () => Promise<void> = async () => {
    relayPool?.subscribe(`profile-user${route.params.pubKey.substring(0, 8)}`, [
      {
        kinds: [Kind.Metadata],
        authors: [route.params.pubKey],
      },
      {
        kinds: [Kind.Contacts],
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
    relayPool?.subscribe(`profile${route.params.pubKey.substring(0, 8)}`, [message])
  }

  const onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void = (event) => {
    if (handleInfinityScroll(event)) {
      setPageSize(pageSize + initialPageSize)
    }
  }

  const renderItem: ListRenderItem<Note> = ({ item }) => (
    <View style={styles.noteCard} key={item.id}>
      <NoteCard note={item} />
    </View>
  )

  return (
    <View>
      <ScrollView
        onScroll={onScroll}
        horizontal={false}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Surface style={styles.container} elevation={1}>
          <View style={styles.profileData}>
            <View style={styles.profilePicture}>
              <ProfileData
                username={user?.name}
                publicKey={route.params.pubKey}
                validNip05={user?.valid_nip05}
                nip05={user?.nip05}
                lnurl={user?.lnurl}
                lnAddress={user?.ln_address}
                picture={user?.picture}
              />
            </View>
            <View>
              <Text>{user?.follower && user.follower > 0 ? t('profilePage.isFollower') : ''}</Text>
            </View>
          </View>
          <View>
            <Text>{user?.about}</Text>
          </View>
          <Divider style={styles.divider} />
          <View style={styles.profileActions}>
            {user && <ProfileActions user={user} setUser={setUser} />}
          </View>
        </Surface>
        <View style={styles.list}>
          <FlashList
            estimatedItemSize={200}
            showsVerticalScrollIndicator={false}
            data={notes}
            renderItem={renderItem}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            onScroll={onScroll}
            refreshing={refreshing}
            horizontal={false}
            ListFooterComponent={
              notes && notes.length > 0 ? (
                <ActivityIndicator style={styles.loading} animating={true} />
              ) : (
                <></>
              )
            }
          />
        </View>
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
    </View>
  )
}

const styles = StyleSheet.create({
  loading: {
    paddingTop: 16,
  },
  container: {
    padding: 16,
  },
  snackbar: {
    margin: 16,
    bottom: 70,
    width: '100%',
  },
  profilePicture: {
    width: '80%',
  },
  list: {
    padding: 16,
  },
  divider: {
    marginTop: 16,
  },
  profileActions: {
    marginRight: 16,
    marginLeft: 16,
  },
  noteCard: {
    marginBottom: 16,
  },
  profileData: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 16,
  },
})

export default ProfilePage
