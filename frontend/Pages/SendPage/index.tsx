import React, { useContext, useEffect, useState } from 'react'
import { Dimensions, ScrollView, StyleSheet, View } from 'react-native'
import { AppContext } from '../../Contexts/AppContext'
import { type Event } from '../../lib/nostr/Events'
import { useTranslation } from 'react-i18next'
import { RelayPoolContext } from '../../Contexts/RelayPoolContext'
import getUnixTime from 'date-fns/getUnixTime'
import { type Note } from '../../Functions/DatabaseFunctions/Notes'
import { getETags } from '../../Functions/RelayFunctions/Events'
import { getUsers, type User } from '../../Functions/DatabaseFunctions/Users'
import { formatPubKey } from '../../Functions/RelayFunctions/Users'
import { Button, Chip, IconButton, TextInput, useTheme } from 'react-native-paper'
import { UserContext } from '../../Contexts/UserContext'
import { goBack, navigate } from '../../lib/Navigation'
import { Kind, nip19 } from 'nostr-tools'
import ProfileData from '../../Components/ProfileData'
import NoteCard from '../../Components/NoteCard'
import UploadImage from '../../Components/UploadImage'
import { useFocusEffect } from '@react-navigation/native'
import { TouchableWithoutFeedback } from 'react-native-gesture-handler'

interface SendPageProps {
  route: { params: { note: Note; type?: 'reply' | 'repost', splits?: string[] } | undefined }
}

export const SendPage: React.FC<SendPageProps> = ({ route }) => {
  const theme = useTheme()
  const { database } = useContext(AppContext)
  const { publicKey } = useContext(UserContext)
  const { sendEvent, lastConfirmationtId } = useContext(RelayPoolContext)
  const { t } = useTranslation('common')
  // state
  const [content, setContent] = useState<string>('')
  const [contentWarning, setContentWarning] = useState<boolean>(false)
  const [users, setUsers] = useState<User[]>([])
  const [userSuggestions, setUserSuggestions] = useState<User[]>([])
  const [userMentions, setUserMentions] = useState<User[]>([])
  const [isSending, setIsSending] = useState<boolean>(false)
  const [uploadingFile, setUploadingFile] = useState<boolean>(false)
  const [startUpload, setStartUpload] = useState<boolean>(false)
  const note = React.useMemo(() => route.params?.note, [])

  useFocusEffect(
    React.useCallback(() => {
      if (database) getUsers(database, {}).then(setUsers)
      return () => {}
    }, []),
  )

  useEffect(() => {
    if (isSending) goBack()
  }, [lastConfirmationtId])

  const onChangeText: (text: string) => void = (text) => {
    const match = text.match(/.*@(.*)$/)
    if (database && match && match[1] !== '') {
      const search = match[1].toLocaleLowerCase()
      setUserSuggestions(users.filter((item) => item.name?.toLocaleLowerCase()?.includes(search)))
    } else {
      setUserSuggestions([])
    }
    setContent(text)
  }

  const mentionText: (user: User) => string = (user) => {
    return `@${user.name ?? formatPubKey(user.id)}`
  }

  const onPressSend: () => void = () => {
    if (database && publicKey) {
      setIsSending(true)
      let tags: string[][] = []

      let rawContent = content
      if (note?.id) {
        tags = note.tags
        if (route.params?.type === 'reply') {
          const eTags = getETags(note)
          tags.push(['e', note.id, '', eTags.length > 0 ? 'reply' : 'root'])
          tags.push(['p', note.pubkey, ''])
        } else if (route.params?.type === 'repost') {
          rawContent = `${rawContent} nostr:${nip19.noteEncode(note.id)}`
          tags.push(['e', note.id, '', ''])
        }
      }

      if (contentWarning) tags.push(['content-warning', ''])

      if (route.params?.splits?.length) {
        route.params?.splits.forEach((split) => {
          const mainRelay = users.find(u => u.id === split)
          tags.push(['zap', split, mainRelay?.main_relay ?? '', '1'])
        })
      }

      if (userMentions.length > 0) {
        userMentions.forEach((user) => {
          const userText = mentionText(user)
          if (rawContent.includes(userText)) {
            rawContent = rawContent.replace(userText, `nostr:${nip19.npubEncode(user.id)}`)
            tags.push(['p', user.id, ''])
          }
        })
      }

      [...rawContent.matchAll(/#([^#]\S+)/gi)].forEach((match) => {
        if (match[1]) tags.push(['t', match[1]])
      })

      const event: Event = {
        content: rawContent,
        created_at: getUnixTime(new Date()),
        kind: Kind.Text,
        pubkey: publicKey,
        tags,
      }

      sendEvent(event).catch(() => {})
    }
  }

  const addUserMention: (user: User) => void = (user) => {
    setUserMentions((prev) => {
      prev.push(user)
      return prev
    })
    setContent((prev) => {
      const splitText = prev.split('@')
      splitText.pop()
      return `${splitText.join('@')}${mentionText(user)} `
    })
    setUserSuggestions([])
  }

  const renderContactItem: (item: User, index: number) => JSX.Element = (item, index) => (
    <TouchableWithoutFeedback onPress={() => addUserMention(item)}>
      <View key={index} style={styles.contactRow}>
        <ProfileData
          username={item?.name}
          publicKey={item?.id}
          validNip05={item?.valid_nip05}
          nip05={item?.nip05}
          lnurl={item?.lnurl}
          lnAddress={item?.ln_address}
          picture={item?.picture}
        />
      </View>
    </TouchableWithoutFeedback>
  )

  return (
    <>
      <ScrollView
        style={[styles.textInputContainer]}
        keyboardShouldPersistTaps='handled'
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
      >
        {note && (
          <View style={styles.noteCard}>
            <NoteCard
              note={note}
              showAction={false}
              showPreview={false}
              showAnswerData={false}
              showRepostPreview={false}
              numberOfLines={5}
            />
          </View>
        )}
        <View style={styles.textInput}>
          <TextInput
            ref={(ref) => ref?.focus()}
            mode='outlined'
            multiline
            numberOfLines={
              note ? Dimensions.get('window').height / 35 : Dimensions.get('window').height / 25
            }
            outlineStyle={{ borderColor: 'transparent' }}
            value={content}
            onChangeText={onChangeText}
            scrollEnabled
          />
        </View>
      </ScrollView>
      <View>
        {userSuggestions.length > 0 ? (
          <View style={[styles.contactsList, { backgroundColor: theme.colors.background }]}>
            <ScrollView>
              {userSuggestions.map((user, index) => renderContactItem(user, index))}
            </ScrollView>
          </View>
        ) : (
          <></>
        )}
        <View style={{ backgroundColor: theme.colors.elevation.level1 }}>
          <View style={styles.contentWarning}>
            <View style={styles.switchWrapper}>
              <Chip
                compact
                style={contentWarning ? 
                  { ...styles.chip, ...{ backgroundColor: theme.colors.secondaryContainer } } : 
                  { ...styles.chip, ...{ backgroundColor: theme.colors.elevation.level1 } }
                }
                mode='outlined'
                onPress={() => setContentWarning((prev) => !prev)}
              >
                {t('sendPage.contentWarning')}
              </Chip>
              <Chip
                compact
                style={(route.params?.splits?.length ?? 0) > 0 ? 
                  { backgroundColor: theme.colors.secondaryContainer } : 
                  { backgroundColor: theme.colors.elevation.level1 }
                }
                mode='outlined'
                onPress={() => navigate('SplitZap', { splits: route.params?.splits })}
              >
                {t('sendPage.splitZap')}{route.params?.splits?.length && ` (${route.params?.splits?.length})`}
              </Chip>
            </View>
            <IconButton
              icon='image-outline'
              size={25}
              style={styles.imageButton}
              onPress={() => setStartUpload(true)}
              disabled={uploadingFile}
            />
          </View>
          <View style={styles.send}>
            <Button
              mode='contained'
              onPress={onPressSend}
              disabled={
                isSending || (route.params?.type !== 'repost' && (!content || content === ''))
              }
              loading={isSending || uploadingFile}
            >
              {t('sendPage.send')}
            </Button>
          </View>
        </View>
      </View>
      <UploadImage
        startUpload={startUpload}
        setImageUri={(imageUri) => {
          setContent((prev) => `${prev}\n\n${imageUri}`)
          setStartUpload(false)
        }}
        onError={() => setStartUpload(false)}
        uploadingFile={uploadingFile}
        setUploadingFile={setUploadingFile}
      />
    </>
  )
}

const styles = StyleSheet.create({
  switchWrapper: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
  },
  snackbar: {
    margin: 16,
    bottom: 100,
    flex: 1,
  },
  textInputContainer: {},
  textInput: {
    paddingBottom: 0,
  },
  imageButton: {
    marginBottom: -13,
    marginTop: -8,
  },
  noteCard: {
    flexDirection: 'column-reverse',
    paddingLeft: 16,
    paddingRight: 16,
  },
  contactsList: {
    bottom: 0,
    maxHeight: 180,
    paddingBottom: 16,
  },
  contactRow: {
    paddingLeft: 16,
    paddingRight: 16,
    paddingTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  contactData: {
    paddingLeft: 16,
  },
  contactName: {
    flexDirection: 'row',
  },
  contactInfo: {
    flexDirection: 'row',
    alignContent: 'center',
  },
  contactFollow: {
    justifyContent: 'center',
  },
  contentWarning: {
    flexDirection: 'row',
    alignContent: 'center',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: 16,
    paddingRight: 16,
    paddingTop: 16,
  },
  send: {
    padding: 16,
  },
  verifyIcon: {
    paddingTop: 4,
    paddingLeft: 5,
  },
  imageUploadPreview: {
    marginTop: 16,
    marginBottom: 16,
  },
  buttonSpacer: {
    marginTop: 16,
    marginBottom: 16,
  },
  chip: {
    marginRight: 16
  }
})

export default SendPage
