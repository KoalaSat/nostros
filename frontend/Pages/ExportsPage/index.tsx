import React, { } from 'react'
import { useTranslation } from 'react-i18next'
import {
  StyleSheet,
  View,
} from 'react-native'
import {
  Button,
  List,
  Snackbar,
  useTheme
} from 'react-native-paper'
import RNFS from 'react-native-fs';
import { type Event } from '../../lib/nostr/Events'
import { getRawUserNotes } from '../../Functions/DatabaseFunctions/Notes'
import { AppContext } from '../../Contexts/AppContext'
import { UserContext } from '../../Contexts/UserContext'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { getUnixTime } from 'date-fns';
import { usersToTags } from '../../Functions/RelayFunctions/Users';
import { Kind } from 'nostr-tools';
import { getUsers } from '../../Functions/DatabaseFunctions/Users';
import { getRawRelayMetadata } from '../../Functions/DatabaseFunctions/RelayMetadatas';
import { getRawUserConversation } from '../../Functions/DatabaseFunctions/DirectMessages';


export const ExportsPage: React.FC = () => {
  const { t } = useTranslation('common')
  const theme = useTheme()
  const { database } = React.useContext(AppContext)
  const { publicKey } = React.useContext(UserContext)
  const [showNotification, setShowNotification] = React.useState<string>()
  const [loading, setLoading] = React.useState<boolean>(false)

  const downloadNotes = (): void => {
    if (database && publicKey) {
      setLoading(true)
      getRawUserNotes(database, publicKey).then(async (resultNotes) => {
        const exportNotes: Event[] = resultNotes.map((note) => {
          note.content = note.content.replace("''", "'")
          return note
        })

        const jsonString = JSON.stringify(exportNotes, null, 2);
        const filePath = `${RNFS.DownloadDirectoryPath}/nostr_notes_${getUnixTime(new Date())}.json`;
        await RNFS.writeFile(filePath, jsonString, 'utf8')
          .catch((e) => {
            console.log(e)
            setShowNotification('exportError')
          })
        setShowNotification('notesExport')
        setLoading(false)
      })
        .catch(() => setLoading(false))
    }
  }
  
  const downloadPets = (): void => {
    if (database && publicKey) {
      setLoading(true)
      getUsers(database, { exludeIds: [publicKey], contacts: true }).then(async (users) => {
        if (users) {
          const event: Event = {
            content: '',
            created_at: getUnixTime(new Date()),
            kind: Kind.Contacts,
            pubkey: publicKey,
            tags: usersToTags(users),
          }
          const jsonString = JSON.stringify([event], null, 2);
          const filePath = `${RNFS.DownloadDirectoryPath}/nostr_pets_${getUnixTime(new Date())}.json`;
          await RNFS.writeFile(filePath, jsonString, 'utf8')
            .catch((e) => {
              console.log(e)
              setShowNotification('exportError')
            })
          setShowNotification('petsExport')
          setLoading(false)
        }
      })
      .catch(() => setLoading(false))
    }
  }
  
  const downloadRelays = (): void => {
    if (database && publicKey) {
      setLoading(true)
      
      getRawRelayMetadata(database, publicKey).then(async (lists) => {
        const jsonString = JSON.stringify(lists, null, 2);
        const filePath = `${RNFS.DownloadDirectoryPath}/nostr_relays_${getUnixTime(new Date())}.json`;
        await RNFS.writeFile(filePath, jsonString, 'utf8')
          .catch((e) => {
            console.log(e)
            setShowNotification('exportError')
          })
        setShowNotification('relaysExport')
        setLoading(false)
      })
      .catch(() => setLoading(false))
    }
  }
  
  const downloadConversations = (): void => {
    if (database && publicKey) {
      setLoading(true)
      
      getRawUserConversation(database, publicKey).then(async (resultConversations) => {
        const exportNotes: Event[] = resultConversations.map((conversation) => {
          conversation.content = conversation.content.replace("''", "'")
          return conversation
        })
        const jsonString = JSON.stringify(exportNotes, null, 2);
        const filePath = `${RNFS.DownloadDirectoryPath}/nostr_direct_messages_${getUnixTime(new Date())}.json`;
        await RNFS.writeFile(filePath, jsonString, 'utf8')
          .catch((e) => {
            console.log(e)
            setShowNotification('exportError')
          })
        setShowNotification('converationsExport')
        setLoading(false)
      })
      .catch(() => setLoading(false))
    }
  }

  return (
    <>
      <View style={styles.main}>
        <List.Item
          title={t('exportsPage.myNotes')}
          right={() =>
            <Button
              loading={loading}
              disabled={loading}
              onPress={downloadNotes}
              textColor={theme.colors.onSurface}
              icon='file-import-outline'
            >
              {t('exportsPage.download')}
            </Button>
          }
        />
        <List.Item
          title={t('exportsPage.myContacts')}
          right={() =>
            <Button
              loading={loading}
              disabled={loading}
              onPress={downloadPets}
              textColor={theme.colors.onSurface}
              icon='file-import-outline'
            >
              {t('exportsPage.download')}
            </Button>
          }
        />
        <List.Item
          title={t('exportsPage.myDirectMessages')}
          right={() =>
            <Button
              loading={loading}
              disabled={loading}
              onPress={downloadConversations}
              textColor={theme.colors.onSurface}
              icon='file-import-outline'
            >
              {t('exportsPage.download')}
            </Button>
          }
        />
        <List.Item
          title={t('exportsPage.myRelays')}
          right={() =>
            <Button
              loading={loading}
              disabled={loading}
              onPress={downloadRelays}
              textColor={theme.colors.onSurface}
              icon='file-import-outline'
            >
              {t('exportsPage.download')}
            </Button>
          }
        />
      </View>
      {showNotification && (
        <Snackbar
          style={styles.snackbar}
          visible={showNotification !== undefined}
          duration={Snackbar.DURATION_SHORT}
          onIconPress={() => setShowNotification(undefined)}
          onDismiss={() => setShowNotification(undefined)}
        >
          {t(`exportsPage.notifications.${showNotification}`)}
        </Snackbar>
      )}
    </>
  )
}

const styles = StyleSheet.create({
  main: {
    flex: 1,
    padding: 16,
  },
  snackbar: {
    flex: 1,
  },
})

export default ExportsPage
