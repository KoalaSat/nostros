import React, { useContext, useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { AppContext } from '../../Contexts/AppContext'
import { Event } from '../../lib/nostr/Events'
import { useTranslation } from 'react-i18next'
import { RelayPoolContext } from '../../Contexts/RelayPoolContext'
import getUnixTime from 'date-fns/getUnixTime'
import { Note } from '../../Functions/DatabaseFunctions/Notes'
import { getETags, getTaggedPubKeys } from '../../Functions/RelayFunctions/Events'
import { getUsers, User } from '../../Functions/DatabaseFunctions/Users'
import { formatPubKey } from '../../Functions/RelayFunctions/Users'
import { Button, Switch, Text, TextInput, TouchableRipple } from 'react-native-paper'
import { UserContext } from '../../Contexts/UserContext'
import { goBack } from '../../lib/Navigation'
import { Kind } from 'nostr-tools'
import ProfileData from '../../Components/ProfileData'
import NoteCard from '../../Components/NoteCard'

interface SendPageProps {
  route: { params: { note: Note; type?: 'reply' | 'repost' } | undefined }
}

export const SendPage: React.FC<SendPageProps> = ({ route }) => {
  const { database } = useContext(AppContext)
  const { publicKey } = useContext(UserContext)
  const { relayPool, lastConfirmationtId } = useContext(RelayPoolContext)
  const { t } = useTranslation('common')
  // state
  const [content, setContent] = useState<string>('')
  const [contentWarning, setContentWarning] = useState<boolean>(false)
  const [userSuggestions, setUserSuggestions] = useState<User[]>([])
  const [userMentions, setUserMentions] = useState<User[]>([])
  const [isSending, setIsSending] = useState<boolean>(false)
  const note = React.useMemo(() => route.params?.note, [])

  useEffect(() => {
    if (isSending) goBack()
  }, [lastConfirmationtId])

  const onChangeText: (text: string) => void = (text) => {
    const match = text.match(/.*@(.*)$/)
    const note: Note | undefined = route.params?.note
    if (database && match && match?.length > 0) {
      let request = getUsers(database, { name: match[1], order: 'contact DESC,name ASC' })

      if (match[1] === '' && note) {
        const taggedPubKeys = getTaggedPubKeys(note)
        request = getUsers(database, {
          includeIds: [...taggedPubKeys, note.pubkey],
          order: 'contact DESC,name ASC',
        })
      }

      request.then((results) => {
        setUserSuggestions(results.filter((item) => item.id !== publicKey))
      })
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
        if (route.params?.type === 'reply') {
          tags = note.tags
          if (getETags(note).length === 0) {
            tags.push(['e', note.id, '', 'root'])
          } else {
            tags.push(['e', note.id, '', 'reply'])
          }
          tags.push(['p', note.pubkey, ''])
        } else if (route.params?.type === 'repost') {
          rawContent = `#[${tags.length}] ${rawContent}`
          tags.push(['e', note.id, '', ''])
        }
      }

      if (contentWarning) tags.push(['content-warning', ''])

      if (userMentions.length > 0) {
        userMentions.forEach((user) => {
          const userText = mentionText(user)
          if (rawContent.includes(userText)) {
            rawContent = rawContent.replace(userText, `#[${tags.length}]`)
            tags.push(['p', user.id])
          }
        })
      }

      const event: Event = {
        content: rawContent,
        created_at: getUnixTime(new Date()),
        kind: Kind.Text,
        pubkey: publicKey,
        tags,
      }
      relayPool?.sendEvent(event).catch(() => {})
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
    <TouchableRipple onPress={() => addUserMention(item)}>
      <View key={index} style={styles.contactRow}>
        <ProfileData
          username={item?.name}
          publicKey={item?.id}
          validNip05={item?.valid_nip05}
          nip05={item?.nip05}
          lud06={item?.lnurl}
          picture={item?.picture}
          avatarSize={34}
        />
        <View style={styles.contactFollow}>
          <Text>{item.contact ? t('sendPage.isContact') : t('sendPage.isNotContact')}</Text>
        </View>
      </View>
    </TouchableRipple>
  )

  return (
    <>
      <View style={[styles.textInputContainer, { paddingBottom: note ? 200 : 10 }]}>
        {note && (
          <View style={styles.noteCard}>
            <NoteCard note={note} showAction={false} showPreview={false} numberOfLines={5} />
          </View>
        )}
        <View style={styles.textInput}>
          <TextInput
            ref={(ref) => ref?.focus()}
            mode='outlined'
            multiline
            numberOfLines={30}
            outlineStyle={{ borderColor: 'transparent' }}
            value={content}
            onChangeText={onChangeText}
            scrollEnabled
          />
        </View>
      </View>
      <View style={styles.actions}>
        {userSuggestions.length > 0 ? (
          <View style={styles.contactsList}>
            {userSuggestions.map((user, index) => renderContactItem(user, index))}
          </View>
        ) : (
          // FIXME: can't find this color
          <View style={{ backgroundColor: '#001C37' }}>
            <View style={styles.contentWarning}>
              <Text>{t('sendPage.contentWarning')}</Text>
              <Switch value={contentWarning} onValueChange={setContentWarning} />
            </View>
            <View style={styles.send}>
              <Button
                mode='contained'
                onPress={onPressSend}
                disabled={route.params?.type !== 'repost' && (!content || content === '')}
                loading={isSending}
              >
                {t('sendPage.send')}
              </Button>
            </View>
          </View>
        )}
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  textInputContainer: {
    flex: 1,
  },
  textInput: {
    paddingBottom: 0,
  },
  noteCard: {
    flexDirection: 'column-reverse',
    paddingLeft: 16,
    paddingRight: 16,
  },
  actions: {
    height: 100,
    flexDirection: 'column-reverse',
    zIndex: 999,
  },
  contactsList: {
    bottom: 0,
    maxHeight: 200,
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
})

export default SendPage
