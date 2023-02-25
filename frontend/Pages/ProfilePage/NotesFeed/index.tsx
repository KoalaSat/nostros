import React, { useContext, useState, useEffect } from 'react'
import { NativeScrollEvent, NativeSyntheticEvent, StyleSheet, View } from 'react-native'
import { AppContext } from '../../../Contexts/AppContext'
import { getMainNotes, Note } from '../../../Functions/DatabaseFunctions/Notes'
import { RelayPoolContext } from '../../../Contexts/RelayPoolContext'
import { Kind } from 'nostr-tools'
import { ActivityIndicator } from 'react-native-paper'
import NoteCard from '../../../Components/NoteCard'
import { FlashList, ListRenderItem } from '@shopify/flash-list'
import { handleInfinityScroll } from '../../../Functions/NativeFunctions'
import { RelayFilters } from '../../../lib/nostr/RelayPool/intex'

interface NotesFeedProps {
  publicKey: string
  setRefreshing: (refreshing: boolean) => void
  refreshing: boolean
  activeTab: string
}

export const NotesFeed: React.FC<NotesFeedProps> = ({
  publicKey,
  setRefreshing,
  refreshing,
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
    if (activeTab === 'notes') {
      subscribe()
      loadNotes()
    }
  }, [pageSize, lastEventId, activeTab])

  const subscribe: () => Promise<void> = async () => {
    relayPool?.subscribe(`profile-user${publicKey}`, [
      {
        kinds: [Kind.Text, Kind.RecommendRelay],
        authors: [publicKey],
        limit: pageSize + initialPageSize,
      },
    ])
  }

  const loadNotes: (main?: boolean) => void = () => {
    if (database) {
      getMainNotes(database, pageSize, { pubKey: publicKey }).then((results) => {
        setNotes(results)
        setRefreshing(false)

        const message: RelayFilters = {
          kinds: [Kind.Text, Kind.RecommendRelay],
          authors: [publicKey],
          limit: pageSize + initialPageSize,
        }
        if (results.length === pageSize) {
          message.since = results[pageSize - 1].created_at
        }
        relayPool?.subscribe(`profile-notes-main${publicKey.substring(0, 8)}`, [message])

        if (results.length > 0) {
          relayPool?.subscribe(`profile-notes-answers${publicKey.substring(0, 8)}`, [
            {
              kinds: [Kind.Reaction, Kind.Text, Kind.RecommendRelay, 9735],
              '#e': results.map((note) => note.id ?? ''),
            },
          ])
        }
      })
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
        estimatedItemSize={210}
        showsVerticalScrollIndicator={false}
        data={notes}
        onScroll={onScroll}
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

export default NotesFeed
