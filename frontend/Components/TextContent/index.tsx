import React, { useContext, useEffect, useState } from 'react'
import ParsedText from 'react-native-parsed-text'
import { Event } from '../../lib/nostr/Events'
import { Linking, StyleSheet, View } from 'react-native'
import { AppContext } from '../../Contexts/AppContext'
import { getUser } from '../../Functions/DatabaseFunctions/Users'
import { formatPubKey } from '../../Functions/RelayFunctions/Users'
import moment from 'moment'
import { Card, Text, useTheme } from 'react-native-paper'
import { getLinkPreview } from 'link-preview-js'
import { push } from '../../lib/Navigation'
import { validImageUrl } from '../../Functions/NativeFunctions'

interface TextContentProps {
  event?: Event
  content?: string
  preview?: boolean
}

interface LinkPreviewMedia {
  url: string
  title: string
  siteName: string | undefined
  description: string | undefined
  mediaType: string
  contentType: string | undefined
  images: string[]
  videos: Array<{
    url: string | undefined
    secureUrl: string | null | undefined
    type: string | null | undefined
    width: string | undefined
    height: string | undefined
  }>
  favicons: string[]
}

export const TextContent: React.FC<TextContentProps> = ({ event, content, preview = true }) => {
  const theme = useTheme()
  const { database } = useContext(AppContext)
  const [userNames, setUserNames] = useState<Record<number, string>>({})
  const [loadedUsers, setLoadedUsers] = useState<number>(0)
  const [linkPreview, setLinkPreview] = useState<LinkPreviewMedia>()
  const text = event?.content ?? content ?? ''

  useEffect(() => {}, [loadedUsers, linkPreview])

  const handleUrlPress: (url: string) => void = (url) => {
    Linking.openURL(url)
  }

  const handleMentionPress: (text: string) => void = (text) => {
    if (!event) return

    const mentionIndex: number = parseInt(text.substring(2, text.length - 1))
    const userPubKey = event.tags[mentionIndex][1]

    push('Profile', { pubKey: userPubKey })
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

  const renderUrlText: (matchingString: string, matches: string[]) => string = (
    matchingString,
    matches,
  ) => {
    if (!linkPreview) {
      getLinkPreview(matchingString).then((data) => {
        setLinkPreview(data as LinkPreviewMedia)
      })
    }

    return matchingString
  }

  const generatePreview: () => JSX.Element = () => {
    if (!linkPreview) return <></>

    const coverUrl = linkPreview.images?.length > 0 ? linkPreview.images[0] : linkPreview.url

    return (
      <Card style={styles.previewCard} onPress={() => handleUrlPress(linkPreview.url)}>
        {validImageUrl(coverUrl) && <Card.Cover source={{ uri: coverUrl }} resizeMode='contain' />}
        <Card.Content style={styles.previewContent}>
          <Text variant='titleSmall'>{linkPreview.title || linkPreview.url}</Text>
          {linkPreview.description && <Text variant='bodySmall'>{linkPreview.description}</Text>}
        </Card.Content>
      </Card>
    )
  }

  return (
    <View style={styles.container}>
      <ParsedText
        style={{ color: theme.colors.onSurfaceVariant }}
        parse={[
          { type: 'url', style: styles.url, onPress: handleUrlPress, renderText: renderUrlText },
          { type: 'email', style: styles.email, onPress: handleUrlPress },
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
      {linkPreview && generatePreview()}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  url: {
    textDecorationLine: 'underline',
  },
  email: {
    textDecorationLine: 'underline',
  },
  mention: {
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
  hashTag: {
    fontStyle: 'italic',
  },
  previewContent: {
    padding: 16,
  },
  previewCard: {
    marginTop: 16,
  },
})

export default TextContent
