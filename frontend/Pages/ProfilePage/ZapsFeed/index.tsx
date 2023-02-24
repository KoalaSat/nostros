import React, { useContext, useState, useEffect } from 'react'
import { StyleSheet, View } from 'react-native'
import { AppContext } from '../../../Contexts/AppContext'
import { getNotes, Note } from '../../../Functions/DatabaseFunctions/Notes'
import { RelayPoolContext } from '../../../Contexts/RelayPoolContext'
import { Kind } from 'nostr-tools'
import { ActivityIndicator, Text, useTheme } from 'react-native-paper'
import NoteCard from '../../../Components/NoteCard'
import { FlashList, ListRenderItem } from '@shopify/flash-list'
import { getMostZapedNotes } from '../../../Functions/DatabaseFunctions/Zaps'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import { useTranslation } from 'react-i18next'
import { getUnixTime } from 'date-fns'

interface ZapsFeedProps {
  publicKey: string
  setRefreshing: (refreshing: boolean) => void
  pageSize: number
  refreshing: boolean
}

export const ZapsFeed: React.FC<ZapsFeedProps> = ({
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
      getMostZapedNotes(database, publicKey, pageSize, getUnixTime(new Date()) - 604800).then((zaps) => {
        const zappedEventIds = zaps.map((zap) => zap.zapped_event_id)
        if (zaps.length > 0) {
          relayPool?.subscribe(`profile-zap-notes${publicKey.substring(0, 8)}`, [
            {
              kinds: [Kind.Text, Kind.RecommendRelay],
              ids: zappedEventIds,
            },
          ])
          getNotes(database, { filters: { id: zappedEventIds } }).then((results) => {
            if (results.length > 0) {
              setNotes(
                zappedEventIds
                  .map((zappedEventId) => {
                    return results.find((note) => note && note.id === zappedEventId) as Note
                  })
                  .filter((note) => note !== undefined),
              )
              setRefreshing(false)
              if (results.length > 0) {
                relayPool?.subscribe(`profile-zaps-answers${publicKey.substring(0, 8)}`, [
                  {
                    kinds: [Kind.Reaction, Kind.Text, Kind.RecommendRelay, 9735],
                    '#e': results.map((note) => note.id ?? ''),
                  },
                  {
                    kinds: [Kind.Metadata],
                    ids: zappedEventIds,
                  },
                ])
              }
            }
          })
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
          {t('profilePage.zapsFeed.emptyTitle')}
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
    height: 120,
    marginTop: 91,
  },
  activityIndicator: {
    padding: 16,
  },
})

export default ZapsFeed
