import React, { useContext, useState, useEffect } from 'react'
import { StyleSheet, View } from 'react-native'
import { AppContext } from '../../../Contexts/AppContext'
import { getReplyNotes, Note } from '../../../Functions/DatabaseFunctions/Notes'
import { RelayPoolContext } from '../../../Contexts/RelayPoolContext'
import { Kind } from 'nostr-tools'
import { ActivityIndicator, Text, useTheme } from 'react-native-paper'
import NoteCard from '../../../Components/NoteCard'
import { FlashList, ListRenderItem } from '@shopify/flash-list'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import { useTranslation } from 'react-i18next'

interface RepliesFeedProps {
  publicKey: string
  setRefreshing: (refreshing: boolean) => void
  pageSize: number
  refreshing: boolean
}

export const RepliesFeed: React.FC<RepliesFeedProps> = ({
  publicKey,
  pageSize,
  refreshing,
  setRefreshing,
}) => {
  const theme = useTheme()
  const { t } = useTranslation('common')
  const { database } = useContext(AppContext)
  const { lastEventId, relayPool } = useContext(RelayPoolContext)
  const [notes, setNotes] = useState<Note[]>([])
  const flashListRef = React.useRef<FlashList<Note>>(null)

  useEffect(() => {
    if (refreshing) loadNotes()
  }, [refreshing])

  useEffect(() => {
    loadNotes()
  }, [pageSize, lastEventId])

  const loadNotes: (main?: boolean) => void = () => {
    if (database) {
      getReplyNotes(database, publicKey, pageSize).then((results) => {
        setNotes(results)
        setRefreshing(false)
        if (results.length > 0) {
          relayPool?.subscribe(`profile-replies-answers${publicKey.substring(0, 8)}`, [
            {
              kinds: [Kind.Reaction, Kind.Text, Kind.RecommendRelay, 9735],
              '#e': results.map((note) => note.id ?? ''),
            },
          ])
        }
      })
    }
  }

  const renderItem: ListRenderItem<Note> = ({ item }) => {
    return (
      <View style={styles.noteCard} key={item.id}>
        <NoteCard note={item} />
      </View>
    )
  }



  const ListEmptyComponent = React.useMemo(
    () => (
      <View style={styles.blank}>
        <MaterialCommunityIcons
          name='lightning-bolt'
          size={64}
          style={styles.center}
          color={theme.colors.onPrimaryContainer}
        />
        <Text variant='headlineSmall' style={styles.center}>
          {t('profilePage.repliesFeed.emptyTitle')}
        </Text>
      </View>
    ),
    [],
  )

  return (
    <View style={styles.list}>
      <FlashList
        estimatedItemSize={210}
        showsVerticalScrollIndicator={false}
        data={notes}
        renderItem={renderItem}
        horizontal={false}
        ListFooterComponent={
          notes.length > 0 ? <ActivityIndicator style={styles.loading} animating={true} /> : <></>
        }
        ref={flashListRef}
        ListEmptyComponent={ListEmptyComponent}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  loading: {
    paddingTop: 16,
  },
  list: {
    height: '100%',
  },
  noteCard: {
    marginTop: 16,
  },
  center: {
    alignContent: 'center',
    textAlign: 'center',
  },
  blank: {
    justifyContent: 'space-between',
    height: 220,
    marginTop: 91,
  },
  activityIndicator: {
    padding: 16,
  },
})

export default RepliesFeed
