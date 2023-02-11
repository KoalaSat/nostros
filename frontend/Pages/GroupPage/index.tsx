import React, { useContext, useEffect, useMemo, useRef, useState } from 'react'
import { NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleSheet, View } from 'react-native'
import { AppContext } from '../../Contexts/AppContext'
import { RelayPoolContext } from '../../Contexts/RelayPoolContext'
import { Event } from '../../lib/nostr/Events'
import { useTranslation } from 'react-i18next'
import { username, usernamePubKey } from '../../Functions/RelayFunctions/Users'
import { getUnixTime, formatDistance, fromUnixTime } from 'date-fns'
import TextContent from '../../Components/TextContent'
import { Card, useTheme, TextInput, TouchableRipple, Text } from 'react-native-paper'
import { UserContext } from '../../Contexts/UserContext'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import { useFocusEffect } from '@react-navigation/native'
import { Kind } from 'nostr-tools'
import { handleInfinityScroll } from '../../Functions/NativeFunctions'
import NostrosAvatar from '../../Components/NostrosAvatar'
import { FlashList, ListRenderItem } from '@shopify/flash-list'
import UploadImage from '../../Components/UploadImage'
import { getGroupMessages, GroupMessage } from '../../Functions/DatabaseFunctions/Groups'
import { RelayFilters } from '../../lib/nostr/RelayPool/intex'

interface GroupPageProps {
  route: { params: { groupId: string } }
}

export const GroupPage: React.FC<GroupPageProps> = ({ route }) => {
  const initialPageSize = 10
  const theme = useTheme()
  const scrollViewRef = useRef<ScrollView>()
  const { database, setDisplayUserDrawer } = useContext(AppContext)
  const { relayPool, lastEventId } = useContext(RelayPoolContext)
  const { publicKey, privateKey, name, picture, validNip05 } = useContext(UserContext)
  const otherPubKey = useMemo(() => route.params.groupId, [])
  const [pageSize, setPageSize] = useState<number>(initialPageSize)
  const [groupMessages, setGroupMessages] = useState<GroupMessage[]>([])
  const [sendingMessages, setSendingMessages] = useState<GroupMessage[]>([])
  const [input, setInput] = useState<string>('')
  const [startUpload, setStartUpload] = useState<boolean>(false)
  const [uploadingFile, setUploadingFile] = useState<boolean>(false)

  const { t } = useTranslation('common')

  useFocusEffect(
    React.useCallback(() => {
      loadGroupMessages(true)

      return () => relayPool?.unsubscribe([`group${route.params.groupId}`])
    }, []),
  )

  useEffect(() => {
    loadGroupMessages(false)
  }, [lastEventId])

  const loadGroupMessages: (subscribe: boolean) => void = (subscribe) => {
    if (database && publicKey && privateKey && route.params.groupId) {
      getGroupMessages(database, route.params.groupId, {
        order: 'DESC',
        limit: pageSize,
      }).then((results) => {
        if (results.length > 0) {
          setSendingMessages([])
          setGroupMessages(results)
          const pubKeys = results
            .map((message) => message.pubkey)
            .filter((key, index, array) => array.indexOf(key) === index)
          const lastCreateAt = pageSize <= results.length ? results[0].created_at : 0
          if (subscribe) subscribeGroupMessages(lastCreateAt, pubKeys)
        } else if (subscribe) {
          subscribeGroupMessages()
        }
      })
    }
  }

  const subscribeGroupMessages: (lastCreateAt?: number, pubKeys?: string[]) => void = async (
    lastCreateAt,
    pubKeys,
  ) => {
    if (publicKey && otherPubKey && route.params.groupId) {
      const filters: RelayFilters[] = [
        {
          kinds: [Kind.ChannelCreation],
          ids: [route.params.groupId],
        },
        {
          kinds: [Kind.ChannelMetadata],
          '#e': [route.params.groupId],
        },
        {
          kinds: [Kind.ChannelMessage],
          '#e': [route.params.groupId],
          since: lastCreateAt ?? 0,
          limit: pageSize,
        },
      ]

      if (pubKeys && pubKeys.length > 0) {
        filters.push({
          kinds: [Kind.Metadata],
          authors: pubKeys,
        })
      }

      relayPool?.subscribe(`group${route.params.groupId}`, filters)
    }
  }

  const send: () => void = () => {
    if (input !== '' && otherPubKey && publicKey && privateKey && route.params.groupId) {
      const event: Event = {
        content: input,
        created_at: getUnixTime(new Date()),
        kind: Kind.ChannelMessage,
        pubkey: publicKey,
        tags: [['e', route.params.groupId, '']],
      }
      relayPool?.sendEvent(event)
      const groupMessage = event as GroupMessage
      groupMessage.pending = true
      groupMessage.valid_nip05 = validNip05
      setSendingMessages((prev) => [...prev, groupMessage])
      setInput('')
    }
  }

  const renderGroupMessageItem: ListRenderItem<GroupMessage> = ({ index, item }) => {
    if (!publicKey) return <></>

    const displayName =
      item.pubkey === publicKey
        ? usernamePubKey(name, publicKey)
        : username({ name: item.name, id: item.pubkey })
    const showAvatar = groupMessages[index - 1]?.pubkey !== item.pubkey

    return (
      <View style={styles.messageRow}>
        {publicKey !== item.pubkey && (
          <View style={styles.pictureSpaceLeft}>
            {showAvatar && (
              <TouchableRipple onPress={() => setDisplayUserDrawer(otherPubKey)}>
                <NostrosAvatar
                  name={displayName}
                  pubKey={otherPubKey}
                  src={item.picture}
                  size={40}
                />
              </TouchableRipple>
            )}
          </View>
        )}
        <Card
          style={[
            styles.card,
            // FIXME: can't find this color
            {
              backgroundColor:
                publicKey === item.pubkey ? theme.colors.tertiaryContainer : '#001C37',
            },
          ]}
        >
          <Card.Content>
            <View style={styles.cardContentInfo}>
              <View style={styles.cardContentName}>
                <Text>{displayName}</Text>
                {item.valid_nip05 ? (
                  <MaterialCommunityIcons
                    name='check-decagram-outline'
                    color={theme.colors.onPrimaryContainer}
                    style={styles.verifyIcon}
                  />
                ) : (
                  <></>
                )}
              </View>
              <View style={styles.cardContentDate}>
                {item.pending && (
                  <View style={styles.cardContentPending}>
                    <MaterialCommunityIcons
                      name='clock-outline'
                      size={14}
                      color={theme.colors.onPrimaryContainer}
                    />
                  </View>
                )}
                <Text>
                  {formatDistance(fromUnixTime(item.created_at), new Date(), { addSuffix: true })}
                </Text>
              </View>
            </View>
            <TextContent content={item.content} event={item} />
          </Card.Content>
        </Card>
        {publicKey === item.pubkey && (
          <View style={styles.pictureSpaceRight}>
            {showAvatar && (
              <TouchableRipple onPress={() => setDisplayUserDrawer(publicKey)}>
                <NostrosAvatar name={name} pubKey={publicKey} src={picture} size={40} />
              </TouchableRipple>
            )}
          </View>
        )}
      </View>
    )
  }

  const onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void = (event) => {
    if (handleInfinityScroll(event)) {
      setPageSize(pageSize + initialPageSize)
    }
  }

  return (
    <View style={styles.container}>
      <FlashList
        inverted
        data={[...sendingMessages, ...groupMessages]}
        renderItem={renderGroupMessageItem}
        horizontal={false}
        ref={scrollViewRef}
        estimatedItemSize={100}
        onScroll={onScroll}
      />
      <View
        style={[
          styles.input,
          {
            backgroundColor: '#001C37',
          },
        ]}
      >
        <TextInput
          mode='outlined'
          multiline
          label={t('groupPage.typeMessage') ?? ''}
          value={input}
          onChangeText={setInput}
          onFocus={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          left={
            <TextInput.Icon
              icon={() => (
                <MaterialCommunityIcons
                  name='image-outline'
                  size={25}
                  color={theme.colors.onPrimaryContainer}
                />
              )}
              onPress={() => setStartUpload(true)}
            />
          }
          right={
            <TextInput.Icon
              icon={() => (
                <MaterialCommunityIcons
                  name='send-outline'
                  size={25}
                  color={theme.colors.onPrimaryContainer}
                />
              )}
              onPress={send}
            />
          }
        />
      </View>
      <UploadImage
        startUpload={startUpload}
        setImageUri={(imageUri) => {
          setInput((prev) => `${prev} ${imageUri}`)
          setStartUpload(false)
        }}
        uploadingFile={uploadingFile}
        setUploadingFile={setUploadingFile}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  scrollView: {
    paddingBottom: 16,
  },
  messageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardContentDate: {
    flexDirection: 'row',
  },
  container: {
    paddingLeft: 16,
    paddingBottom: 16,
    paddingRight: 16,
    justifyContent: 'space-between',
    flex: 1,
  },
  card: {
    marginTop: 16,
    flex: 6,
  },
  cardContentInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardContentPending: {
    flexDirection: 'row',
    alignContent: 'center',
    justifyContent: 'center',
    paddingRight: 5,
    paddingTop: 3,
  },
  pictureSpaceLeft: {
    justifyContent: 'flex-end',
    width: 50,
    flex: 1,
  },
  pictureSpaceRight: {
    alignContent: 'flex-end',
    justifyContent: 'flex-end',
    width: 50,
    flex: 1,
    paddingLeft: 16,
  },
  input: {
    flexDirection: 'column-reverse',
    marginTop: 16,
  },
  snackbar: {
    margin: 16,
    bottom: 70,
  },
  verifyIcon: {
    paddingTop: 4,
    paddingLeft: 5,
  },
  cardContentName: {
    flexDirection: 'row',
  },
})

export default GroupPage
