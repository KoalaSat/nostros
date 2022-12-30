import React, { useContext, useEffect, useState } from 'react'
import ParsedText from 'react-native-parsed-text'
import { useTheme } from '@ui-kitten/components'
import { Event } from '../../lib/nostr/Events'
import { Linking, StyleSheet } from 'react-native'
import { AppContext } from '../../Contexts/AppContext'
import { getUser } from '../../Functions/DatabaseFunctions/Users'
import { formatPubKey } from '../../Functions/RelayFunctions/Users'
import moment from 'moment'
import { LinkPreview, REGEX_LINK } from '@flyerhq/react-native-link-preview'

interface TextContentProps {
  event?: Event
  content?: string
  preview?: boolean
}

export const TextContent: React.FC<TextContentProps> = ({ event, content, preview = true }) => {
  const theme = useTheme()
  const { database, goToPage } = useContext(AppContext)
  const [userNames, setUserNames] = useState<Record<number, string>>({})
  const [loadedUsers, setLoadedUsers] = useState<number>(0)
  const text = event?.content ?? content ?? ''

  useEffect(() => {}, [loadedUsers])

  const containsUrl: () => boolean = () => {
    const matches = text.match(REGEX_LINK) ?? []
    return matches.length > 0
  }

  const handleUrlPress: (url: string) => void = (url) => {
    Linking.openURL(url)
  }

  const handleEmailPress: (email: string) => void = (email) => {
    Linking.openURL(email)
  }

  const handleMentionPress: (text: string) => void = (text) => {
    if (!event) return

    const mentionIndex: number = parseInt(text.substring(2, text.length - 1))
    goToPage(`profile#${event.tags[mentionIndex][1]}`)
  }

  const renderMentionText: (matchingString: string, matches: string[]) => string = (
    matchingString,
    matches,
  ) => {
    const mentionIndex: number = parseInt(matches[1])

    if (userNames[mentionIndex]) {
      return userNames[mentionIndex]
    } else if (event) {
      const pudKey = event.tags[mentionIndex][1]
      if (database) {
        getUser(pudKey, database).then((user) => {
          setLoadedUsers(moment().unix())
          setUserNames((prev) => {
            if (user?.name) prev[mentionIndex] = `@${user.name}`
            return prev
          })
        })
      }
      return `@${formatPubKey(pudKey)}`
    } else {
      return matchingString
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
    <>
      <ParsedText
        style={styles.text}
        parse={[
          { type: 'url', style: styles.url, onPress: handleUrlPress },
          { type: 'email', style: styles.email, onPress: handleEmailPress },
          event
            ? {
                pattern: /#\[(\d+)\]/,
                style: styles.mention,
                onPress: handleMentionPress,
                renderText: renderMentionText,
              }
            : {
                pattern: /#\[(\d+)\]/,
              },
          { pattern: /#(\w+)/, style: styles.hashTag },
        ]}
        childrenProps={{ allowFontScaling: false }}
      >
        {text}
      </ParsedText>
      {preview && containsUrl() && (
        <LinkPreview text={text} renderText={() => ''} textContainerStyle={{ height: 0 }} />
      )}
    </>
  )
}

export default TextContent
