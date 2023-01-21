import React, { useContext, useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { AppContext } from '../../Contexts/AppContext'
import { Event, EventKind } from '../../lib/nostr/Events'
import { useTranslation } from 'react-i18next'
import { RelayPoolContext } from '../../Contexts/RelayPoolContext'
import moment from 'moment'
import { Note } from '../../Functions/DatabaseFunctions/Notes'
import { getETags, getTaggedPubKeys } from '../../Functions/RelayFunctions/Events'
import { getUsers, User } from '../../Functions/DatabaseFunctions/Users'
import { formatPubKey, username } from '../../Functions/RelayFunctions/Users'
import { Button, Switch, Text, TextInput, TouchableRipple } from 'react-native-paper'
import { UserContext } from '../../Contexts/UserContext'
import NostrosAvatar from '../../Components/NostrosAvatar'
import { goBack } from '../../lib/Navigation'
import { getNpub } from '../../lib/nostr/Nip19'

interface SendPageProps {
  route: { params: { note: Note } | undefined }
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

  useEffect(() => {
    if (isSending) goBack()
  }, [lastConfirmationtId])

  const onChangeText: (text: string) => void = (text) => {
    const match = text.match(/@(.*)$/)
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
      const note: Note | undefined = route.params?.note
      setIsSending(true)
      let tags: string[][] = []

      let rawContent = content

      if (note?.id) {
        tags = note.tags
        if (getETags(note).length === 0) {
          tags.push(['e', note.id, '', 'root'])
        } else {
          tags.push(['e', note.id, '', 'reply'])
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
        created_at: moment().unix(),
        kind: EventKind.textNote,
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
      return `${splitText.join('@')}${mentionText(user)}`
    })
    setUserSuggestions([])
  }

  const renderContactItem: (item: User, index: number) => JSX.Element = (item, index) => (
    <TouchableRipple onPress={() => addUserMention(item)}>
      <View key={index} style={styles.contactRow}>
        <View style={styles.contactInfo}>
          <NostrosAvatar
            name={item.name}
            pubKey={getNpub(item.id)}
            src={item.picture}
            lud06={item.lnurl}
            size={34}
          />
          <View style={styles.contactName}>
            <Text>{formatPubKey(item.id)}</Text>
            {item.name && <Text variant='titleSmall'>{username(item)}</Text>}
          </View>
        </View>
        <View style={styles.contactFollow}>
          <Text>{item.contact ? t('sendPage.isContact') : t('sendPage.isNotContact')}</Text>
        </View>
      </View>
    </TouchableRipple>
  )

  return (
    <>
      <View style={styles.textInput}>
        <TextInput
          ref={(ref) => ref?.focus()}
          mode='outlined'
          multiline={true}
          numberOfLines={30}
          outlineStyle={{ borderColor: 'transparent' }}
          value={content}
          onChangeText={onChangeText}
        />
      </View>
      <View style={styles.actions}>
        {/* flexDirection: 'column-reverse' */}
        {userSuggestions.length > 0 ? (
          // FIXME: can't find this color
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
                disabled={!content || content === ''}
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
  textInput: {
    flex: 3,
  },
  actions: {
    height: 200,
    flexDirection: 'column-reverse',
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
  contactName: {
    paddingLeft: 16,
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
})

export default SendPage
