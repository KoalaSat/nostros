import { useFocusEffect } from '@react-navigation/native'
import { FlashList, ListRenderItem } from '@shopify/flash-list'
import { t } from 'i18next'
import { decode } from 'nostr-tools/nip19'
import * as React from 'react'
import { StyleSheet, View } from 'react-native'
import { Text, TextInput, TouchableRipple, useTheme } from 'react-native-paper'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import NoteCard from '../../Components/NoteCard'
import ProfileData from '../../Components/ProfileData'
import { AppContext } from '../../Contexts/AppContext'
import { getNotes, Note } from '../../Functions/DatabaseFunctions/Notes'
import { getUsers, User } from '../../Functions/DatabaseFunctions/Users'
import { validNip21 } from '../../Functions/NativeFunctions'
import { navigate } from '../../lib/Navigation'
import { getNpub } from '../../lib/nostr/Nip19'

interface SearchPageProps {
  route: { params: { urls: string[]; index?: number } }
}

export const SearchPage: React.FC<SearchPageProps> = ({ route }) => {
  const theme = useTheme()
  const { database } = React.useContext(AppContext)
  const [users, setUsers] = React.useState<User[]>([])
  const [resultsUsers, setResultsUsers] = React.useState<User[]>([])
  const [notes, setNotes] = React.useState<Note[]>([])
  const [resultsNotes, setResultsNotes] = React.useState<Note[]>([])
  const [searchInput, setSearchInput] = React.useState<string>('')
  const inputRef = React.useRef<TextInput>(null)

  useFocusEffect(
    React.useCallback(() => {
      inputRef.current?.focus()
      if (database) {
        getNotes(database, {}).then((results) => {
          if (results.length > 0) {
            setNotes(results)
          }
        })
        getUsers(database, {}).then(setUsers)
      }

      return () => {}
    }, []),
  )

  React.useEffect(() => {
    if (searchInput !== '') {
      const search = searchInput.toLocaleLowerCase()
      if (/^@.*/.test(search)) {
        const searchUser = search.replace(/^@/, '')
        setResultsUsers(
          users.filter(
            (user) =>
              user.name?.toLocaleLowerCase().includes(searchUser) ??
              user.nip05?.toLocaleLowerCase().includes(searchUser),
          ),
        )
      } else {
        if (validNip21(search)) {
          try {
            const key = decode(search.replace('nostr:', ''))
            if (key?.data) {
              if (key.type === 'nevent') {
                setSearchInput('')
                navigate('Note', { noteId: key.data.id })
              } else if (key.type === 'npub') {
                setSearchInput('')
                navigate('Profile', { pubKey: key.data })
              } else if (key.type === 'nprofile' && key.data.pubkey) {
                setSearchInput('')
                navigate('Profile', { pubKey: key.data.pubkey })
              }
            }
          } catch {}
        }
        setResultsNotes(notes.filter((note) => note.content.toLocaleLowerCase().includes(search)))
      }
    }
  }, [searchInput])

  const renderItemNote: ListRenderItem<Note> = ({ item, index }) => {
    return (
      <View style={styles.noteCard} key={item.id}>
        <NoteCard note={item} hightlightText={searchInput !== '' ? searchInput : undefined} />
      </View>
    )
  }

  const renderItemUser: ListRenderItem<User> = ({ item, index }) => {
    return (
      <TouchableRipple
        onPress={() => {
          setSearchInput('')
          navigate('Profile', { pubKey: item.id })
        }}
      >
        <View key={item.id} style={styles.contactRow}>
          <View style={styles.profileData}>
            <ProfileData
              username={item?.name}
              publicKey={getNpub(item.id)}
              validNip05={item?.valid_nip05}
              nip05={item?.nip05}
              lnurl={item?.lnurl}
              lnAddress={item?.ln_address}
              picture={item?.picture}
            />
          </View>
        </View>
      </TouchableRipple>
    )
  }

  const ListEmptyComponent = React.useMemo(
    () => (
      <View style={styles.blank}>
        <MaterialCommunityIcons
          name='lightbulb-outline'
          size={64}
          style={styles.center}
          color={theme.colors.onPrimaryContainer}
        />
        <Text variant='headlineSmall' style={styles.center}>
          {t('searchPage.emptyTitle')}
        </Text>
        <Text variant='bodyMedium' style={styles.center}>
          {t('searchPage.emptyDescription')}
        </Text>
      </View>
    ),
    [],
  )

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          ref={inputRef}
          style={[styles.input, { backgroundColor: theme.colors.onSecondary }]}
          outlineStyle={{ borderColor: 'transparent' }}
          numberOfLines={1}
          mode='outlined'
          placeholder={t('searchPage.placeholder') ?? ''}
          value={searchInput}
          onChangeText={setSearchInput}
        />
      </View>
      {searchInput === '' && ListEmptyComponent}
      {!/^@.*/.test(searchInput) && (
        <FlashList
          showsVerticalScrollIndicator={false}
          data={resultsNotes}
          renderItem={renderItemNote}
          horizontal={false}
        />
      )}
      {/^@.*/.test(searchInput) && (
        <FlashList
          showsVerticalScrollIndicator={false}
          data={resultsUsers}
          renderItem={renderItemUser}
          horizontal={false}
        />
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
    flex: 1,
  },
  inputContainer: {
    position: 'absolute',
    top: -70,
    right: 0,
    zIndex: 999,
    width: '100%',
  },
  input: {
    flex: 1,
    marginLeft: 30,
    paddingTop: 0,
    height: 60,
  },
  noteCard: {
    marginTop: 16,
  },
  profileData: {
    flex: 1,
  },
  contactRow: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  center: {
    alignContent: 'center',
    textAlign: 'center',
  },
  blank: {
    justifyContent: 'space-between',
    height: 180,
    marginTop: 91,
  },
})

export default SearchPage
