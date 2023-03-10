import React, { useContext, useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { Surface, Text, Snackbar } from 'react-native-paper'
import { AppContext } from '../../Contexts/AppContext'
import { UserContext } from '../../Contexts/UserContext'
import { RelayPoolContext } from '../../Contexts/RelayPoolContext'
import { getUser, User } from '../../Functions/DatabaseFunctions/Users'
import { Kind } from 'nostr-tools'
import { useTranslation } from 'react-i18next'
import { useFocusEffect } from '@react-navigation/native'
import ProfileData from '../../Components/ProfileData'
import TextContent from '../../Components/TextContent'
import Tabs from '../../Components/Tabs'
import NotesFeed from './NotesFeed'
import RepliesFeed from './RepliesFeed'
import ZapsFeed from './ZapsFeed'
import BookmarksFeed from './BookmarksFeed'

interface ProfilePageProps {
  route: { params: { pubKey: string } }
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ route }) => {
  const { database } = useContext(AppContext)
  const { publicKey } = useContext(UserContext)
  const { lastEventId, relayPool } = useContext(RelayPoolContext)
  const { t } = useTranslation('common')
  const [showNotification, setShowNotification] = useState<undefined | string>()
  const [user, setUser] = useState<User>()
  const [refreshing, setRefreshing] = useState<boolean>(false)
  const [firstLoad, setFirstLoad] = useState<boolean>(true)
  const [activeTab, setActiveTab] = React.useState('notes')

  useFocusEffect(
    React.useCallback(() => {
      subscribeProfile()
      loadUser()
      setFirstLoad(false)

      return () => relayPool?.unsubscribe([`profile-user${route.params.pubKey.substring(0, 8)}`])
    }, []),
  )

  useEffect(() => {
    if (activeTab !== 'zaps') {
      relayPool?.unsubscribe([
        `profile-zaps${route.params.pubKey.substring(0, 8)}`,
        `profile-zaps-notes${route.params.pubKey.substring(0, 8)}`,
        `profile-zaps-answers${route.params.pubKey.substring(0, 8)}`,
      ])
    }
    if (activeTab !== 'notes') {
      relayPool?.unsubscribe([
        `profile-notes-main${route.params.pubKey.substring(0, 8)}`,
        `profile-notes-answers${route.params.pubKey.substring(0, 8)}`,
      ])
    }
    if (activeTab !== 'replies') {
      relayPool?.unsubscribe([
        `profile-replies-main${route.params.pubKey.substring(0, 8)}`,
        `profile-replies-answers${route.params.pubKey.substring(0, 8)}`,
      ])
    }
    if (activeTab !== 'bookmarks') {
      relayPool?.unsubscribe([
        `profile-bookmarks${route.params.pubKey.substring(0, 8)}`,
        `profile-bookmarks-answers${route.params.pubKey.substring(0, 8)}`,
      ])
    }
  }, [activeTab, database, relayPool])

  useEffect(() => {
    if (!firstLoad && !user?.name) {
      loadUser()
    }
  }, [lastEventId])

  useEffect(() => {
    if (refreshing) {
      subscribeProfile()
    }
  }, [refreshing])

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
        limit: 1,
      },
      {
        kinds: [Kind.Contacts],
        authors: [route.params.pubKey],
        limit: 1,
      },
      {
        kinds: [10001],
        authors: [route.params.pubKey],
        limit: 1,
      },
    ])
  }

  const renderScene: Record<string, JSX.Element> = {
    notes: (
      <NotesFeed
        activeTab={activeTab}
        publicKey={route.params.pubKey}
        setRefreshing={setRefreshing}
        refreshing={refreshing}
      />
    ),
    replies: (
      <RepliesFeed
        activeTab={activeTab}
        publicKey={route.params.pubKey}
        setRefreshing={setRefreshing}
        refreshing={refreshing}
      />
    ),
    zaps: (
      <ZapsFeed
        activeTab={activeTab}
        publicKey={route.params.pubKey}
        setRefreshing={setRefreshing}
        refreshing={refreshing}
      />
    ),
    bookmarks: (
      <BookmarksFeed
        activeTab={activeTab}
        publicKey={route.params.pubKey}
        setRefreshing={setRefreshing}
        refreshing={refreshing}
      />
    ),
  }

  return (
    <View>
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
      </Surface>
      <Tabs tabs={['notes', 'replies', 'zaps', 'bookmarks']} setActiveTab={setActiveTab} />
      <View style={styles.list}>{renderScene[activeTab]}</View>
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
    flex: 1,
  },
  profilePicture: {
    width: '80%',
  },
  list: {
    paddingRight: 16,
    paddingLeft: 16,
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
