import React, { useContext, useState, useEffect } from 'react'
import { type NativeScrollEvent, type NativeSyntheticEvent, StyleSheet, View } from 'react-native'
import { AppContext } from '../../../Contexts/AppContext'
import { getNotes, type Note } from '../../../Functions/DatabaseFunctions/Notes'
import { RelayPoolContext } from '../../../Contexts/RelayPoolContext'
import { Kind } from 'nostr-tools'
import { ActivityIndicator } from 'react-native-paper'
import NoteCard from '../../../Components/NoteCard'
import { FlashList, type ListRenderItem } from '@shopify/flash-list'
import { getMostZapedNotes } from '../../../Functions/DatabaseFunctions/Zaps'
import { getUnixTime } from 'date-fns'
import { handleInfinityScroll } from '../../../Functions/NativeFunctions'

interface ZapsFeedProps {
  publicKey: string
  setRefreshing: (refreshing: boolean) => void
  refreshing: boolean
  activeTab: string
}

export const ZapsFeed: React.FC<ZapsFeedProps> = ({
  publicKey,
  refreshing,
  setRefreshing,
  activeTab,
}) => {
  const initialPageSize = 10
  const { database } = useContext(AppContext)
  const { lastEventId, relayPool } = useContext(RelayPoolContext)
  const [pageSize, setPageSize] = useState<number>(initialPageSize)
  const [notes, setNotes] = useState<Note[]>([])

  useEffect(() => {
    if (refreshing) {
      subscribe()
      loadNotes()
    }
  }, [refreshing])

  useEffect(() => {
    if (activeTab === 'zaps') {
      subscribe()
      loadNotes()
    }
  }, [pageSize, lastEventId, activeTab])

  const subscribe: () => Promise<void> = async () => {
    relayPool?.subscribe(`profile-zaps${publicKey}`, [
      {
        kinds: [9735],
        '#p': [publicKey],
        since: getUnixTime(new Date()) - 604800,
      },
    ])
  }

  const loadNotes: (main?: boolean) => void = () => {
    if (database) {
      getMostZapedNotes(database, publicKey, pageSize, getUnixTime(new Date()) - 604800).then(
        (zaps) => {
          const zappedEventIds = zaps.map((zap) => zap.zapped_event_id)
          if (zaps.length > 0) {
            relayPool?.subscribe(`profile-zaps-notes${publicKey.substring(0, 8)}`, [
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
                      ids: results.map((note) => note.pubkey ?? ''),
                    },
                  ])
                }
              }
            })
          }
        },
      )
    }
  }

  const onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void = (event) => {
    if (handleInfinityScroll(event)) {
      setPageSize(pageSize + initialPageSize)
    }
  }

  const renderItem: ListRenderItem<Note> = ({ item }) => {
    return (
      <View style={styles.noteCard} key={item.id}>
        <NoteCard note={item} />
      </View>
    )
  }

  return (
    <View style={styles.list}>
      <FlashList
        onScroll={onScroll}
        estimatedItemSize={210}
        showsVerticalScrollIndicator={false}
        data={notes}
        renderItem={renderItem}
        horizontal={false}
        ListFooterComponent={
          notes.length > 0 ? <ActivityIndicator style={styles.loading} animating={true} /> : <></>
        }
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

export default ZapsFeed
