import React, { useCallback, useContext, useEffect, useState } from 'react'
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native'
import { AppContext } from '../../Contexts/AppContext'
import { getMentionNotes, Note } from '../../Functions/DatabaseFunctions/Notes'
import NoteCard from '../../Components/NoteCard'
import { RelayPoolContext } from '../../Contexts/RelayPoolContext'
import { EventKind } from '../../lib/nostr/Events'
import { handleInfinityScroll } from '../../Functions/NativeFunctions'
import { UserContext } from '../../Contexts/UserContext'
import RBSheet from 'react-native-raw-bottom-sheet'
import { ActivityIndicator, Button, Text, useTheme } from 'react-native-paper'
import ProfileCard from '../../Components/ProfileCard'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import { useTranslation } from 'react-i18next'
import { navigate } from '../../lib/Navigation'

export const NotificationsFeed: React.FC = () => {
  const theme = useTheme()
  const { t } = useTranslation('common')
  const { database } = useContext(AppContext)
  const { publicKey } = useContext(UserContext)
  const initialPageSize = 10
  const { lastEventId, relayPool } = useContext(RelayPoolContext)
  const [pageSize, setPageSize] = useState<number>(initialPageSize)
  const [notes, setNotes] = useState<Note[]>([])
  const bottomSheetProfileRef = React.useRef<RBSheet>(null)
  const [refreshing, setRefreshing] = useState(true)
  const [profileCardPubkey, setProfileCardPubKey] = useState<string>()

  useEffect(() => {
    if (relayPool && publicKey) {
      calculateInitialNotes().then(() => loadNotes())
    }
  }, [publicKey, relayPool])

  useEffect(() => {
    loadNotes()
  }, [lastEventId])

  useEffect(() => {
    if (pageSize > initialPageSize) {
      subscribeNotes()
      loadNotes()
    }
  }, [pageSize])

  const calculateInitialNotes: () => Promise<void> = async () => {
    if (database && publicKey) {
      subscribeNotes()
    }
  }

  const subscribeNotes: () => void = async () => {
    if (!database || !publicKey) return

    relayPool?.subscribe('mentions-user', [
      {
        kinds: [EventKind.textNote],
        '#p': [publicKey],
        limit: pageSize,
      },
      {
        kinds: [EventKind.textNote],
        '#e': [publicKey],
        limit: pageSize,
      },
    ])
  }

  const loadNotes: () => void = () => {
    if (database && publicKey) {
      getMentionNotes(database, publicKey, pageSize).then((notes) => {
        setNotes(notes)
        setRefreshing(false)
        if (notes.length > 0) {
          const missingDataNotes = notes.map((note) => note.pubkey)
          relayPool?.subscribe('mentions-answers', [
            {
              kinds: [EventKind.reaction, EventKind.textNote, EventKind.recommendServer],
              '#e': notes.map((note) => note.id ?? ''),
            },
            {
              kinds: [EventKind.meta],
              authors: missingDataNotes,
            },
          ])
        }
      })
    }
  }

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    if (relayPool && publicKey) {
      calculateInitialNotes().then(() => loadNotes())
    }
  }, [])

  const renderItem: (note: Note) => JSX.Element = (note) => {
    return (
      <View style={styles.noteCard} key={note.id}>
        <NoteCard
          note={note}
          onPressOptions={() => {
            setProfileCardPubKey(note.pubkey)
            bottomSheetProfileRef.current?.open()
          }}
        />
      </View>
    )
  }

  const onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void = (event) => {
    if (handleInfinityScroll(event)) {
      setPageSize(pageSize + initialPageSize)
    }
  }

  const bottomSheetStyles = React.useMemo(() => {
    return {
      container: {
        backgroundColor: theme.colors.background,
        padding: 16,
        borderTopRightRadius: 28,
        borderTopLeftRadius: 28,
      },
      draggableIcon: {
        backgroundColor: '#000',
      },
    }
  }, [])

  return (
    <View style={styles.container}>
      {notes && notes.length > 0 ? (
        <ScrollView
          onScroll={onScroll}
          horizontal={false}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {notes.map((note) => renderItem(note))}
          {notes.length >= 10 && <ActivityIndicator animating={true} />}
        </ScrollView>
      ) : (
        <View style={styles.blank}>
          <MaterialCommunityIcons name='message-outline' size={64} style={styles.center} />
          <Text variant='headlineSmall' style={styles.center}>
            {t('notificationsFeed.emptyTitle')}
          </Text>
          <Text variant='bodyMedium' style={styles.center}>
            {t('notificationsFeed.emptyDescription')}
          </Text>
          <Button mode='contained' compact onPress={() => navigate('Send')}>
            {t('notificationsFeed.emptyButton')}
          </Button>
        </View>
      )}
      <RBSheet
        ref={bottomSheetProfileRef}
        closeOnDragDown={true}
        height={280}
        customStyles={bottomSheetStyles}
      >
        <ProfileCard userPubKey={profileCardPubkey ?? ''} bottomSheetRef={bottomSheetProfileRef} />
      </RBSheet>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  noteCard: {
    marginBottom: 16,
  },
  center: {
    alignContent: 'center',
    textAlign: 'center',
  },
  blank: {
    justifyContent: 'space-between',
    height: 200,
    marginTop: 60,
  },
})

export default NotificationsFeed
