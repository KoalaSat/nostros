import React, { useContext, useEffect, useState } from 'react'
import ParsedText from 'react-native-parsed-text'
import { Event } from '../../lib/nostr/Events'
import { ImageSourcePropType, Linking, StyleSheet, View } from 'react-native'
import { AppContext } from '../../Contexts/AppContext'
import { getUser, User } from '../../Functions/DatabaseFunctions/Users'
import { formatPubKey } from '../../Functions/RelayFunctions/Users'
import getUnixTime from 'date-fns/getUnixTime'
import { Card, Text, useTheme } from 'react-native-paper'
import { getLinkPreview } from 'link-preview-js'
import { getNip19Key, getNpub } from '../../lib/nostr/Nip19'
import { navigate } from '../../lib/Navigation'
import { validImageUrl } from '../../Functions/NativeFunctions'
import Clipboard from '@react-native-clipboard/clipboard'

interface TextContentProps {
  event?: Event
  content?: string
  showPreview?: boolean
  onPressUser?: (user: User) => void
  numberOfLines?: number
}

export const TextContent: React.FC<TextContentProps> = ({
  event,
  content,
  showPreview = true,
  onPressUser = () => {},
  numberOfLines,
}) => {
  const theme = useTheme()
  const { database } = useContext(AppContext)
  const [userNames, setUserNames] = useState<Record<number, string>>({})
  const [loadedUsers, setLoadedUsers] = useState<number>(0)
  const [url, setUrl] = useState<string>()
  const [linkPreview, setLinkPreview] = useState<string>()
  const [linkType, setLinkType] = useState<string>()
  const text = event?.content ?? content ?? ''
  const DEFAULT_COVER = '../../../assets/images/placeholders/placeholder_url.png'
  const MEDIA_COVER = '../../../assets/images/placeholders/placeholder_media.png'
  // const IMAGE_COVER = '../../../assets/images/placeholders/placeholder_image.png'

  useEffect(() => {
    if (!linkPreview && url && validImageUrl(url)) {
      setLinkPreview(url)
      setLinkType('image')
    }
  }, [loadedUsers, url])

  const handleUrlPress: (url: string | undefined) => void = (url) => {
    if (!url) return

    Linking.openURL(url)
  }

  const handleNip05NotePress: (nip19: string) => void = (nip19) => {
    const noteId = getNip19Key(nip19)

    if (noteId) {
      navigate('Note', { noteId })
    }
  }

  const handleNip05ProfilePress: (nip19: string) => void = (nip19) => {
    const pubKey = getNip19Key(nip19)

    if (pubKey) {
      navigate('Profile', { pubKey })
    }
  }

  const handleMentionPress: (text: string) => void = (text) => {
    if (!event) return

    const mentionIndex: number = parseInt(text.substring(2, text.length - 1))
    const userPubKey = event.tags[mentionIndex][1]

    onPressUser({ id: userPubKey, name: text })
  }

  const renderMentionText: (matchingString: string, matches: string[]) => string = (
    matchingString,
    matches,
  ) => {
    const mentionIndex: number = parseInt(matches[1])

    if (userNames[mentionIndex]) {
      return userNames[mentionIndex]
    } else if (event) {
      const tag = event.tags[mentionIndex]
      if (tag) {
        const kind = tag[0]
        const pudKey = tag[1]

        if (kind === 'e') return ''

        if (database) {
          getUser(pudKey, database).then((user) => {
            setLoadedUsers(getUnixTime(new Date()))
            setUserNames((prev) => {
              if (user?.name) prev[mentionIndex] = `@${user.name}`
              return prev
            })
          })
        }
        return `@${formatPubKey(getNpub(pudKey))}`
      } else {
        return matchingString
      }
    } else {
      return matchingString
    }
  }

  const renderUrlText: (matchingString: string, matches: string[]) => string = (
    matchingString,
    _matches,
  ) => {
    setUrl((prev) => {
      return prev ?? matchingString
    })
    return matchingString
  }

  const generatePreview: () => JSX.Element = () => {
    if (!showPreview || !url) return <></>

    const getRequireCover: () => ImageSourcePropType = () => {
      if (!linkPreview) return require(DEFAULT_COVER)
      if (linkType === 'audio') return require(MEDIA_COVER)
      if (linkType === 'video') return require(MEDIA_COVER)
      // if (linkType === 'image') return require(IMAGE_COVER)
      if (linkType === 'image') return { uri: url }

      return require(DEFAULT_COVER)
    }

    return (
      <View style={styles.previewCard}>
        <Card onPress={() => handleUrlPress(url)}>
          <Card.Cover
            source={getRequireCover()}
            resizeMode='contain'
            defaultSource={require(DEFAULT_COVER)}
          />
          <Card.Content style={styles.previewContent}>
            <Text variant='bodyMedium' numberOfLines={3}>
              {/* {linkPreview?.title ?? linkPreview?.url ?? url} */}
              {url}
            </Text>
            {/* {linkPreview?.description && (
              <Text variant='bodySmall' numberOfLines={3}>
                {linkPreview.description}
              </Text>
            )} */}
          </Card.Content>
        </Card>
      </View>
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
          { pattern: /(note1)\S*/, style: styles.nip19, onPress: handleNip05NotePress },
          {
            pattern: /(npub1|nprofile1)\S*/,
            style: styles.nip19,
            onPress: handleNip05ProfilePress,
          },
        ]}
        childrenProps={{ allowFontScaling: false }}
        onLongPress={() => Clipboard.setString(text)}
        numberOfLines={numberOfLines}
      >
        {text}
      </ParsedText>
      {generatePreview()}
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
  nip19: {
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
    paddingTop: 16,
  },
})

export default TextContent
