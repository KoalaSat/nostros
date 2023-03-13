import React, { useContext, useEffect, useState } from 'react'
import ParsedText from 'react-native-parsed-text'
import { type Event } from '../../lib/nostr/Events'
import { Clipboard, Linking, StyleSheet, View } from 'react-native'
import { AppContext } from '../../Contexts/AppContext'
import { getUser, type User } from '../../Functions/DatabaseFunctions/Users'
import { formatPubKey } from '../../Functions/RelayFunctions/Users'
import getUnixTime from 'date-fns/getUnixTime'
import { useTheme } from 'react-native-paper'
import { getNip19Key, getNpub } from '../../lib/nostr/Nip19'
import { navigate } from '../../lib/Navigation'
import { validBlueBirdUrl, validImageUrl, validMediaUrl } from '../../Functions/NativeFunctions'
import { LinksPreview } from './LinksPreview'

interface TextContentProps {
  event?: Event
  content?: string
  showPreview?: boolean
  onPressUser?: (user: User) => void
  numberOfLines?: number
  copyText?: boolean
  hightlightText?: string
}

export const TextContent: React.FC<TextContentProps> = ({
  event,
  content,
  showPreview = true,
  onPressUser = () => {},
  numberOfLines,
  copyText = false,
  hightlightText,
}) => {
  const theme = useTheme()
  const { database } = useContext(AppContext)
  const [userNames, setUserNames] = useState<Record<number, string>>({})
  const [loadedUsers, setLoadedUsers] = useState<number>(0)
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [lnUrl, setLnUrl] = useState<string>()
  const text = event?.content ?? content ?? ''
  const MAGNET_LINK = /(magnet:)\S+/

  useEffect(() => {}, [loadedUsers])

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

  const renderLnurl: (lnurl: string | undefined) => string = (lnurl) => {
    if (!lnUrl && lnurl) {
      try {
        setLnUrl(lnurl)
      } catch (e) {
        console.log(e)
      }
    }
    return ''
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

  const linkPreview: (url: string) => string = (url) => {
    if (validMediaUrl(url)) {
      return 'video'
    } else if (validImageUrl(url)) {
      return 'image'
    } else if (validBlueBirdUrl(url)) {
      return 'blueBird'
    } else if (MAGNET_LINK.test(url)) {
      return 'magnet'
    }
    return 'url'
  }

  const renderUrlText: (matchingString: string, matches: string[]) => string = (
    matchingString,
    _matches,
  ) => {
    setUrls((prev) => {
      prev[matchingString] = linkPreview(matchingString)
      return prev
    })

    return matchingString
  }

  const onLongPress: () => void = () => {
    if (copyText) Clipboard.setString(text)
  }

  const getHightlightText: () => RegExp = () => new RegExp(hightlightText ?? '@@@@@', 'i')

  return (
    <View style={styles.container}>
      <ParsedText
        style={[{ color: theme.colors.onSurfaceVariant }]}
        parse={[
          { type: 'url', style: styles.url, onPress: handleUrlPress, renderText: renderUrlText },
          {
            pattern: MAGNET_LINK,
            style: styles.url,
            onPress: handleUrlPress,
            renderText: renderUrlText,
          },
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
                style: styles.mention,
              },
          { pattern: /#(\w+)/, style: styles.hashTag },
          { pattern: /(lnbc)\S+/, style: styles.nip19, renderText: renderLnurl },
          { pattern: /(nevent1)\S+/, style: styles.nip19, onPress: handleNip05NotePress },
          {
            pattern: /(npub1|nprofile1)\S+/,
            style: styles.nip19,
            onPress: handleNip05ProfilePress,
          },
          {
            pattern: getHightlightText(),
            style: [styles.hightlight, { backgroundColor: theme.colors.onSecondary }],
          },
        ]}
        childrenProps={{ allowFontScaling: false }}
        numberOfLines={numberOfLines}
        onLongPress={onLongPress}
      >
        {text}
      </ParsedText>
      {showPreview && <LinksPreview urls={urls} lnUrl={lnUrl} />}
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
  hightlight: {
    fontWeight: 'bold',
  },
})

export default TextContent
