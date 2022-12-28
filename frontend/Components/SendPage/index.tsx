import {
  Button,
  Input,
  Layout,
  List,
  ListItem,
  Toggle,
  TopNavigation,
  useTheme,
} from '@ui-kitten/components'
import React, { useContext, useRef, useState } from 'react'
import { StyleSheet } from 'react-native'
import { AppContext } from '../../Contexts/AppContext'
import Icon from 'react-native-vector-icons/FontAwesome5'
import { Event, EventKind } from '../../lib/nostr/Events'
import { useTranslation } from 'react-i18next'
import { RelayPoolContext } from '../../Contexts/RelayPoolContext'
import moment from 'moment'
import { getNotes } from '../../Functions/DatabaseFunctions/Notes'
import { getETags } from '../../Functions/RelayFunctions/Events'
import { getUsers, User } from '../../Functions/DatabaseFunctions/Users'
import { formatPubKey } from '../../Functions/RelayFunctions/Users'
import Avatar from '../Avatar'

export const SendPage: React.FC = () => {
  const theme = useTheme()
  const { goBack, page, database } = useContext(AppContext)
  const { relayPool, publicKey } = useContext(RelayPoolContext)
  const { t } = useTranslation('common')
  const scrollViewRef = useRef<Input>()
  const [content, setContent] = useState<string>('')
  const [contentWarning, setContentWarning] = useState<boolean>(false)
  const [userSuggestions, setUserSuggestions] = useState<User[]>([])
  const [userMentions, setUserMentions] = useState<User[]>([])
  const breadcrump = page.split('%')
  const eventId = breadcrump[breadcrump.length - 1].split('#')[1]

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    actionContainer: {
      marginTop: 30,
      paddingLeft: 32,
      paddingRight: 32,
    },
    button: {
      marginTop: 30,
    },
  })

  const onChangeText: (text: string) => void = (text) => {
    const match = text.match(/@(\S*)$/)
    if (database && match && match[1].length > 0) {
      getUsers(database, { name: match[1] }).then((results) => {
        setUserSuggestions(results)
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
      getNotes(database, { filters: { id: eventId } }).then((notes) => {
        let tags: string[][] = []
        const note = notes[0]

        let rawContent = content

        if (note) {
          tags = note.tags
          if (getETags(note).length === 0) {
            tags.push(['e', eventId, '', 'root'])
          } else {
            tags.push(['e', eventId, '', 'reply'])
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
        relayPool?.sendEvent(event).then(() => goBack())
      })
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
    scrollViewRef.current?.focus()
  }

  const suggestionsList: () => JSX.Element = () => {
    const renderItem: (item: { item: User }) => JSX.Element = ({ item }) => {
      return (
        <ListItem
          title={`${item.name ?? item.id}`}
          accessoryLeft={<Avatar name={item.name} src={item.picture} pubKey={item.id} size={25} />}
          onPress={() => addUserMention(item)}
        />
      )
    }

    return userSuggestions.length > 0 ? (
      <List data={userSuggestions} renderItem={renderItem} />
    ) : (
      <></>
    )
  }

  const renderBackAction = (): JSX.Element => (
    <Button
      accessoryRight={<Icon name='arrow-left' size={16} color={theme['text-basic-color']} />}
      onPress={() => goBack()}
      appearance='ghost'
    />
  )

  return (
    <>
      <Layout style={styles.container} level='2'>
        <TopNavigation
          alignment='center'
          title={eventId ? t('sendPage.reply') : t('sendPage.title')}
          accessoryLeft={renderBackAction}
        />
        <Layout style={styles.actionContainer} level='2'>
          <Layout>
            <Input
              ref={scrollViewRef}
              multiline={true}
              textStyle={{ minHeight: 64 }}
              placeholder={t('sendPage.placeholder')}
              value={content}
              onChangeText={onChangeText}
              size='large'
              autoFocus={true}
              keyboardType='twitter'
            />
          </Layout>
          <Layout style={styles.button}>
            <Button onPress={onPressSend}>{t('sendPage.send')}</Button>
          </Layout>
          <Layout style={styles.button} level='2'>
            <Toggle checked={contentWarning} onChange={setContentWarning}>
              {t('sendPage.contentWarning')}
            </Toggle>
          </Layout>
          {suggestionsList()}
        </Layout>
      </Layout>
    </>
  )
}

export default SendPage
