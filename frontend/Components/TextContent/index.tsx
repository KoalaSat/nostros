import React, { useContext, useEffect, useState } from 'react'
import ParsedText from 'react-native-parsed-text'
import { Event } from '../../lib/nostr/Events'
import { Linking, StyleSheet, View } from 'react-native'
import { AppContext } from '../../Contexts/AppContext'
import { getUser, User } from '../../Functions/DatabaseFunctions/Users'
import { formatPubKey } from '../../Functions/RelayFunctions/Users'
import getUnixTime from 'date-fns/getUnixTime'
import { Avatar, Card, Text, useTheme } from 'react-native-paper'
import { getNip19Key, getNpub } from '../../lib/nostr/Nip19'
import { navigate } from '../../lib/Navigation'
import { validBlueBirdUrl, validImageUrl, validMediaUrl } from '../../Functions/NativeFunctions'
import Clipboard from '@react-native-clipboard/clipboard'
import FastImage from 'react-native-fast-image'
import { useTranslation } from 'react-i18next'
import { decode, PaymentRequestObject, TagsObject } from 'bolt11'
import LnPreview from '../LnPreview'

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
  const { t } = useTranslation('common')
  const { database, getSatoshiSymbol } = useContext(AppContext)
  const [userNames, setUserNames] = useState<Record<number, string>>({})
  const [loadedUsers, setLoadedUsers] = useState<number>(0)
  const [url, setUrl] = useState<string>()
  const [lnUrl, setLnUrl] = useState<string>()
  const [invoice, setInvoice] = useState<string>()
  const [decodedLnUrl, setDecodedLnUrl] = useState<
    PaymentRequestObject & { tagsObject: TagsObject }
  >()
  const [linkPreview, setLinkPreview] = useState<string>()
  const [linkType, setLinkType] = useState<string>()
  const text = event?.content ?? content ?? ''
  const DEFAULT_COVER = '../../../assets/images/placeholders/placeholder_url.png'
  const MEDIA_COVER = '../../../assets/images/placeholders/placeholder_media.png'
  const IMAGE_COVER = '../../../assets/images/placeholders/placeholder_image.png'
  const BLUEBIRD_COVER = '../../../assets/images/placeholders/placeholder_bluebird.png'

  useEffect(() => {
    if (!linkPreview && url) {
      if (validMediaUrl(url)) {
        setLinkPreview(url)
        setLinkType('video')
      } else if (validImageUrl(url)) {
        setLinkPreview(url)
        setLinkType('image')
      } else if (validBlueBirdUrl(url)) {
        setLinkPreview(url)
        setLinkType('blueBird')
      }
    }
  }, [loadedUsers, url])

  const handleUrlPress: (url: string | undefined) => void = (url) => {
    if (!url) return

    Linking.openURL(url)
  }

  const handleLnUrlPress: () => void = () => {
    setInvoice(lnUrl)
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
      setDecodedLnUrl(decode(lnurl))
      setLnUrl(lnurl)
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

  const renderUrlText: (matchingString: string, matches: string[]) => string = (
    matchingString,
    _matches,
  ) => {
    setUrl((prev) => {
      return prev ?? matchingString
    })
    return matchingString
  }

  const parsedText = React.useMemo(
    () => (
      <ParsedText
        style={[styles.text, { color: theme.colors.onSurfaceVariant }]}
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
          { pattern: /(lnbc)\S*/, style: styles.nip19, renderText: renderLnurl },
          { pattern: /(nevent1)\S*/, style: styles.nip19, onPress: handleNip05NotePress },
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
    ),
    [loadedUsers],
  )

  const preview = React.useMemo(() => {
    if (!showPreview) return <></>

    const getRequireCover: () => string | undefined = () => {
      if (linkType === 'image') return url

      return ''
    }

    const getDefaultCover: () => number = () => {
      if (!linkPreview) return require(DEFAULT_COVER)
      if (linkType === 'blueBird') return require(BLUEBIRD_COVER)
      if (linkType === 'audio') return require(MEDIA_COVER)
      if (linkType === 'video') return require(MEDIA_COVER)
      return require(DEFAULT_COVER)
    }

    return (
      <View>
        {decodedLnUrl && (
          <Card onPress={handleLnUrlPress}>
            <Card.Title
              title={t('textContent.invoice')}
              subtitle={
                <>
                  <Text>{decodedLnUrl.satoshis}</Text>
                  {getSatoshiSymbol(16)}
                </>
              }
              left={(props) => (
                <Avatar.Icon
                  {...props}
                  icon='lightning-bolt'
                  style={{
                    backgroundColor: '#F5D112',
                  }}
                />
              )}
            />
          </Card>
        )}
        {url && (
          <View style={styles.previewCard}>
            <Card onPress={() => handleUrlPress(url)}>
              {linkType === 'image' ? (
                <FastImage
                  style={[
                    styles.cardCover,
                    {
                      backgroundColor: theme.colors.backdrop,
                    },
                  ]}
                  source={{
                    uri: getRequireCover(),
                    priority: FastImage.priority.high,
                  }}
                  resizeMode={FastImage.resizeMode.contain}
                  defaultSource={require(IMAGE_COVER)}
                />
              ) : (
                <Card.Cover source={getDefaultCover()} resizeMode='contain' />
              )}
              {linkType !== 'image' && (
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
              )}
            </Card>
          </View>
        )}
        {invoice && <LnPreview invoice={invoice} setInvoice={setInvoice} />}
      </View>
    )
  }, [invoice, url, linkType])

  return (
    <View style={styles.container}>
      {parsedText}
      {preview}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  cardCover: {
    flex: 1,
    height: 180,
    borderRadius: 16,
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
