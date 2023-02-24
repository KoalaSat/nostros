import React, { useCallback, useContext, useEffect, useState } from 'react'
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native'
import { Surface, Text, Snackbar } from 'react-native-paper'
import { AppContext } from '../../Contexts/AppContext'
import { UserContext } from '../../Contexts/UserContext'
import { RelayPoolContext } from '../../Contexts/RelayPoolContext'
import { getUser, User } from '../../Functions/DatabaseFunctions/Users'
import { Kind } from 'nostr-tools'
import { useTranslation } from 'react-i18next'
import { handleInfinityScroll } from '../../Functions/NativeFunctions'
import { useFocusEffect } from '@react-navigation/native'
import ProfileData from '../../Components/ProfileData'
import TextContent from '../../Components/TextContent'
import Tabs from '../../Components/Tabs'
import NotesFeed from './NotesFeed'
import RepliesFeed from './RepliesFeed'
import ZapsFeed from './ZapsFeed'
import { getUnixTime } from 'date-fns'

interface ProfilePageProps {
  route: { params: { pubKey: string } }
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ route }) => {
  const { database } = useContext(AppContext)
  const { publicKey } = useContext(UserContext)
  const { lastEventId, relayPool } = useContext(RelayPoolContext)
  const { t } = useTranslation('common')
  const initialPageSize = 20
  const [showNotification, setShowNotification] = useState<undefined | string>()
  const [user, setUser] = useState<User>()
  const [pageSize, setPageSize] = useState<number>(initialPageSize)
  const [refreshing, setRefreshing] = useState<boolean>(false)
  const [firstLoad, setFirstLoad] = useState<boolean>(true)
  const [activeTab, setActiveTab] = React.useState('notes')

  useFocusEffect(
    React.useCallback(() => {
      subscribeProfile()
      loadUser()
      setFirstLoad(false)

      return () =>
        relayPool?.unsubscribe([
          `profile-user${route.params.pubKey.substring(0, 8)}`,
          `profile-zaps${route.params.pubKey.substring(0, 8)}`,
          `profile-zap-notes${route.params.pubKey.substring(0, 8)}`,
          `profile-replies-answers${route.params.pubKey.substring(0, 8)}`,
          `profile-notes-answers${route.params.pubKey.substring(0, 8)}`,
        ])
    }, []),
  )

  useEffect(() => {
    if (!firstLoad && pageSize > initialPageSize) {
      subscribeProfile()
    }
  }, [pageSize])

  useEffect(() => {
    if (!firstLoad) {
      loadUser()
    }
  }, [pageSize, lastEventId, activeTab])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    loadUser()
    subscribeProfile()
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
      {
        kinds: [Kind.Text, Kind.RecommendRelay],
        authors: [route.params.pubKey],
        limit: pageSize,
      },
      {
        kinds: [9735],
        "#p": [route.params.pubKey],
        since: getUnixTime(new Date()) - 604800
      },
    ])
  }

  const onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void = (event) => {
    if (handleInfinityScroll(event)) {
      setPageSize(pageSize + initialPageSize)
    }
  }

  const renderScene: Record<string, JSX.Element> = {
    notes: (
      <NotesFeed
        publicKey={route.params.pubKey}
        pageSize={pageSize}
        setRefreshing={setRefreshing}
        refreshing={refreshing}
      />
    ),
    replies: (
      <RepliesFeed
        publicKey={route.params.pubKey}
        pageSize={pageSize}
        setRefreshing={setRefreshing}
        refreshing={refreshing}
      />
    ),
    zaps: (
      <ZapsFeed
        publicKey={route.params.pubKey}
        pageSize={pageSize}
        setRefreshing={setRefreshing}
        refreshing={refreshing}
      />
    ),
  }

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
            <TextContent content={user?.about} showPreview={false} numberOfLines={10} />
          </View>
          {/* <Divider style={styles.divider} />
          <View style={styles.profileActions}>
            {user && <ProfileActions user={user} setUser={setUser} />}
          </View> */}
        </Surface>
        <Tabs
          tabs={['notes', 'replies', 'zaps']}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
        <View style={styles.list}>{renderScene[activeTab]}</View>
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
