import React, { useContext, useEffect, useState } from 'react'
import ParsedText from 'react-native-parsed-text'
import { type Event } from '../../lib/nostr/Events'
import { Clipboard, Linking, StyleSheet, View } from 'react-native'
import { AppContext } from '../../Contexts/AppContext'
import { getUser, type User } from '../../Functions/DatabaseFunctions/Users'
import { formatPubKey } from '../../Functions/RelayFunctions/Users'
import getUnixTime from 'date-fns/getUnixTime'
import { useTheme } from 'react-native-paper'
import { nip19 } from 'nostr-tools'
import { getNip19Key, getNpub } from '../../lib/nostr/Nip19'
import { navigate } from '../../lib/Navigation'
import {
  validBlueBirdUrl,
  validImageUrl,
  validMediaUrl,
  validTubeUrl,
} from '../../Functions/NativeFunctions'
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
  const [userNames, setUserNames] = useState<Record<string, string>>({})
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

  const handleNotePress: (nip19: string) => void = (nip19) => {
    const noteId = getNip19Key(nip19)

    if (noteId) {
      navigate('Note', { noteId })
    }
  }

  const handleHashtagPress: (hashtag: string) => void = (hashtag) => {
    if (hashtag) {
      navigate('Search', { search: hashtag })
    }
  }

  const handleProfilePress: (matchingString: string) => void = (matchingString) => {
    const npub = matchingString.replace('nostr:', '')
    const decoded = nip19.decode(npub)

    let pubKey = decoded.data as string

    if (decoded.type === 'nprofile') {
      pubKey = (decoded.data as nip19.ProfilePointer).pubkey
    }

    onPressUser({ id: pubKey, name: userNames[matchingString] ?? formatPubKey(npub) })
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
    if (userNames[matchingString]) {
      return `@${userNames[matchingString]}`
    } else if (event) {
      const mentionIndex: number = parseInt(matches[1])
      const tag = event.tags[mentionIndex]

      if (tag) {
        const kind = tag[0]
        const pubKey = tag[1]

        if (kind === 'e') return ''

        if (database) {
          getUser(pubKey, database).then((user) => {
            setLoadedUsers(getUnixTime(new Date()))
            setUserNames((prev) => {
              if (user?.name) prev[matchingString] = user.name
              return prev
            })
          })
        }
        return `@${formatPubKey(getNpub(pubKey))}`
      } else {
        return matchingString
      }
    } else {
      return matchingString
    }
  }

  const renderProfile: (matchingString: string, matches: string[]) => string = (
    matchingString,
  ) => {
    try {
      const decoded = nip19.decode(matchingString.replace('nostr:', ''))
    
      let pubKey = decoded.data as string

      if (decoded.type === 'nprofile') {
        pubKey = (decoded.data as nip19.ProfilePointer).pubkey
      }

      if (userNames[matchingString]) {
        return `@${userNames[matchingString]}`
      } else {
        if (database) {
          getUser(pubKey, database).then((user) => {
            setLoadedUsers(getUnixTime(new Date()))
            setUserNames((prev) => {
              if (user?.name) prev[matchingString] = user.name
              return prev
            })
          })
        }
        return `@${formatPubKey(pubKey)}`
      }
    } catch {
      return '@[invalid nip19]'
    }
  }

  const linkPreview: (url: string) => string = (url) => {
    if (validMediaUrl(url)) {
      return 'video'
    } else if (validImageUrl(url)) {
      return 'image'
    } else if (validBlueBirdUrl(url)) {
      return 'blueBird'
    } else if (validTubeUrl(url)) {
      return 'tube'
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

  const renderNote: (matchingString: string, matches: string[]) => string = (
    _matchingString,
    _matches,
  ) => {
    return ''
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
          { pattern: /#(\w+)/, style: styles.hashTag, onPress: handleHashtagPress },
          { pattern: /\b(lnbc)\S+\b/, style: styles.nip19, renderText: renderLnurl },
          { pattern: /\b(nostr:)?(nevent1|note1)\S+\b/, style: styles.nip19, onPress: handleNotePress, renderText: renderNote },
          {
            pattern: /\b(nostr:)?(npub1|nprofile1)\S+\b/,
            style: styles.nip19,
            renderText: renderProfile,
            onPress: handleProfilePress,
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
