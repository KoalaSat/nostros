import { t } from 'i18next'
import * as React from 'react'
import { StyleSheet, TouchableNativeFeedback, View } from 'react-native'
import { IconButton, Text, useTheme } from 'react-native-paper'
import { AppContext } from '../../Contexts/AppContext'
import RBSheet from 'react-native-raw-bottom-sheet'
import { getNoteRelays, getNotes, Note, NoteRelay } from '../../Functions/DatabaseFunctions/Notes'
import Clipboard from '@react-native-clipboard/clipboard'
import NoteShare from '../NoteShare'
import { navigate } from '../../lib/Navigation'
import { relayToColor } from '../../Functions/NativeFunctions'
import { RelayPoolContext } from '../../Contexts/RelayPoolContext'
import { formatId } from '../../Functions/RelayFunctions/Users'
import { UserContext } from '../../Contexts/UserContext'
import { updateBookmarkList } from '../../Functions/RelayFunctions/Lists'

interface NoteActionsProps {
  bottomSheetRef: React.RefObject<RBSheet>
}

export const NoteActions: React.FC<NoteActionsProps> = ({ bottomSheetRef }) => {
  const theme = useTheme()
  const { reloadLists, bookmarks, publicKey } = React.useContext(UserContext)
  const { database, displayNoteDrawer, relayColouring } = React.useContext(AppContext)
  const { relayPool, setDisplayrelayDrawer, lastEventId } = React.useContext(RelayPoolContext)
  const [note, setNote] = React.useState<Note>()
  const [relays, setRelays] = React.useState<NoteRelay[]>([])
  const [bookmarked, setBookrmarked] = React.useState<boolean>(false)
  const bottomSheetShareRef = React.useRef<RBSheet>(null)

  React.useEffect(() => {
    if (publicKey) {
      relayPool?.unsubscribe(['lists-bookmarks'])
      relayPool?.subscribe('lists-bookmarks', [
        {
          kinds: [10001],
          authors: [publicKey],
        },
      ])
    }
  }, [])

  React.useEffect(() => {
    reloadLists()
    loadNote()
  }, [displayNoteDrawer, lastEventId, bookmarked])

  React.useEffect(() => {
    if (note) {
      setBookrmarked(bookmarks.find((id) => id === note.id) !== undefined)
    }
  }, [bookmarks, note])

  const loadNote: () => void = () => {
    if (database && displayNoteDrawer) {
      getNotes(database, { filters: { id: [displayNoteDrawer] } }).then((results) => {
        if (results.length > 0) {
          setNote(results[0])
        }
      })
      getNoteRelays(database, displayNoteDrawer).then(setRelays)
    }
  }

  const changeBookmark: () => void = () => {
    if (relayPool && database && publicKey && note?.id) {
      updateBookmarkList(relayPool, database, publicKey, note.id, bookmarked)
      setBookrmarked(!bookmarked)
    }
  }

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
    <View style={styles.container}>
      <Text variant='titleMedium'>{formatId(note?.id)}</Text>
      <View style={styles.mainLayout}>
        <View style={styles.actionButton}>
          <IconButton
            icon='content-copy'
            size={28}
            onPress={() => {
              note?.content && Clipboard.setString(note?.content)
              bottomSheetRef.current?.close()
            }}
          />
          <Text>{t('noteActions.copy')}</Text>
        </View>
        <View style={styles.actionButton}>
          <IconButton
            icon={bookmarked ? 'bookmark-check' : 'bookmark-multiple-outline'}
            size={28}
            onPress={changeBookmark}
          />
          <Text>{t(bookmarked ? 'noteActions.bookmarked' : 'noteActions.bookmark')}</Text>
        </View>
        <View style={styles.actionButton}>
          <IconButton
            icon='eye'
            size={28}
            onPress={() => {
              bottomSheetRef.current?.close()
              navigate('Note', { noteId: note?.id })
            }}
          />
          <Text>{t('noteActions.view')}</Text>
        </View>
      </View>
      <View style={styles.mainLayout}>
        <View style={styles.actionButton}>
          <IconButton
            icon='share-variant-outline'
            size={28}
            onPress={() => bottomSheetShareRef.current?.open()}
          />
          <Text>{t('noteActions.share')}</Text>
        </View>
      </View>
      <View style={styles.relayList}>
        {relayColouring &&
          relays.map((relay, index) => (
            <TouchableNativeFeedback
              onPress={() => setDisplayrelayDrawer(relay.relay_url)}
              key={relay.relay_url}
            >
              <View
                style={[
                  styles.relay,
                  { backgroundColor: relayToColor(relay.relay_url) },
                  index === 0 ? { borderBottomLeftRadius: 50, borderTopLeftRadius: 50 } : {},
                  index === relays.length - 1
                    ? { borderBottomRightRadius: 50, borderTopRightRadius: 50 }
                    : {},
                ]}
              />
            </TouchableNativeFeedback>
          ))}
      </View>
      {note && (
        <RBSheet
          ref={bottomSheetShareRef}
          closeOnDragDown={true}
          customStyles={bottomSheetStyles}
          onClose={() => bottomSheetRef.current?.close()}
        >
          <NoteShare note={note} />
        </RBSheet>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  relayList: {
    flexDirection: 'row',
    marginTop: 16,
  },
  container: {
    width: '100%',
    paddingRight: 16,
    paddingLeft: 16,
  },
  relayColor: {
    paddingTop: 9,
  },
  mainLayout: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 16,
  },
  actionButton: {
    alignItems: 'center',
  },
  snackbar: {
    marginLeft: 16,
    bottom: 16,
  },
  switch: {
    marginLeft: 32,
  },
  listHeader: {
    paddingRight: 5,
    paddingLeft: 16,
    textAlign: 'center',
  },
  warning: {
    borderRadius: 4,
    padding: 16,
    marginTop: 16,
    marginBottom: 16,
  },
  warningTitle: {
    marginBottom: 8,
  },
  buttonSpacer: {
    marginTop: 16,
    marginBottom: 16,
  },
  muteContainer: {
    paddingRight: 16,
  },
  relaysList: {
    maxHeight: '90%',
  },
  relay: {
    flex: 1,
    height: 10,
  },
})

export default NoteActions
