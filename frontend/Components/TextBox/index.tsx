import React, { useContext, useEffect, useState } from 'react'
import ParsedText from 'react-native-parsed-text'
import { useTheme } from '@ui-kitten/components'
import { Event } from '../../lib/nostr/Events'
import { Linking, StyleSheet } from 'react-native'
import { AppContext } from '../../Contexts/AppContext'
import { getUser } from '../../Functions/DatabaseFunctions/Users'
import { formatPubKey } from '../../Functions/RelayFunctions/Users'

interface TextBoxProps {
  note: Event
}

export const TextBox: React.FC<TextBoxProps> = ({ note }) => {
  const theme = useTheme()
  const { database, goToPage } = useContext(AppContext)
  const [userNames, setUserNames] = useState<Record<number, string>>({})
  const [loadedUsers, setLoadedUsers] = useState<number>(0)

  useEffect(() => {}, [loadedUsers])

  const handleUrlPress: (url: string) => void = (url) => {
    Linking.openURL(url)
  }

  const handleEmailPress: (email: string) => void = (email) => {
    Linking.openURL(email)
  }

  const handleMentionPress: (text: string) => void = (text) => {
    const mentionIndex: number = parseInt(text.substring(2, text.length - 1))
    goToPage(`profile#${note.tags[mentionIndex][1]}`)
  }

  const renderMentionText: (matchingString: string, matches: string[]) => string = (
    _matchingString,
    matches,
  ) => {
    const mentionIndex: number = parseInt(matches[1])
    const pudKey = note.tags[mentionIndex][1]

    if (userNames[mentionIndex]) {
      return userNames[mentionIndex]
    } else {
      if (database) {
        getUser(pudKey, database).then((user) => {
          setUserNames((prev) => {
            if (user?.name) {
              prev[mentionIndex] = `@${user.name}`
            }
            setLoadedUsers((prev) => prev  + 1)
            return prev
          })
        })
      }
      return `@${formatPubKey(pudKey)}`
    }
  }

  const styles = StyleSheet.create({
    url: {
      textDecorationLine: 'underline',
    },
    email: {
      textDecorationLine: 'underline',
    },
    text: {
      color: theme['text-basic-color'],
    },
    mention: {
      fontWeight: 'bold',
      textDecorationLine: 'underline',
    },
    hashTag: {
      fontStyle: 'italic',
    },
  })

  return (
    note && (
      <ParsedText
        style={styles.text}
        parse={[
          { type: 'url', style: styles.url, onPress: handleUrlPress },
          { type: 'email', style: styles.email, onPress: handleEmailPress },
          {
            pattern: /#\[(\d+)\]/,
            style: styles.mention,
            onPress: handleMentionPress,
            renderText: renderMentionText,
          },
          { pattern: /#(\w+)/, style: styles.hashTag },
        ]}
        childrenProps={{ allowFontScaling: false }}
      >
        {note.content}
      </ParsedText>
    )
  )
}

export default TextBox
