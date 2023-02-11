import React, { useContext, useEffect, useState } from 'react'
import { Clipboard, Dimensions, FlatList, StyleSheet, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import {
  AnimatedFAB,
  Button,
  Divider,
  List,
  Snackbar,
  Text,
  TextInput,
  TouchableRipple,
  useTheme,
} from 'react-native-paper'
import RBSheet from 'react-native-raw-bottom-sheet'
import UploadImage from '../../Components/UploadImage'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import { Kind } from 'nostr-tools'
import { Event } from '../../lib/nostr/Events'
import { UserContext } from '../../Contexts/UserContext'
import { RelayPoolContext } from '../../Contexts/RelayPoolContext'
import { getUnixTime } from 'date-fns'
import { useFocusEffect } from '@react-navigation/native'
import { AppContext } from '../../Contexts/AppContext'
import { getGroups, Group } from '../../Functions/DatabaseFunctions/Groups'
import { formatId, username } from '../../Functions/RelayFunctions/Users'
import NostrosAvatar from '../../Components/NostrosAvatar'
import { navigate } from '../../lib/Navigation'
import { FlashList, ListRenderItem } from '@shopify/flash-list'
import { RelayFilters } from '../../lib/nostr/RelayPool/intex'
import { validNip21 } from '../../Functions/NativeFunctions'
import { getNip19Key } from '../../lib/nostr/Nip19'

export const GroupsFeed: React.FC = () => {
  const { t } = useTranslation('common')
  const theme = useTheme()
  const { database } = useContext(AppContext)
  const { publicKey } = useContext(UserContext)
  const { relayPool, lastEventId, lastConfirmationtId } = useContext(RelayPoolContext)
  const bottomSheetSearchRef = React.useRef<RBSheet>(null)
  const bottomSheetCreateRef = React.useRef<RBSheet>(null)
  const bottomSheetFabActionRef = React.useRef<RBSheet>(null)
  const [groups, setGroups] = useState<Group[]>([])
  const [searchGroup, setSearchGroup] = useState<string>()
  const [newGroupName, setNewGroupName] = useState<string>()
  const [newGroupDescription, setNewGroupDescription] = useState<string>()
  const [newGroupPicture, setNewGroupPicture] = useState<string>()
  const [startUpload, setStartUpload] = useState<boolean>(false)
  const [uploadingFile, setUploadingFile] = useState<boolean>(false)
  const [showNotification, setShowNotification] = useState<string>()

  useFocusEffect(
    React.useCallback(() => {
      loadGroups()

      return () => relayPool?.unsubscribe(['groups-create', 'groups-meta', 'groups-messages'])
    }, []),
  )

  useEffect(() => {
    loadGroups()
  }, [lastEventId, lastConfirmationtId])

  const pastePicture: () => void = () => {
    Clipboard.getString().then((value) => {
      setNewGroupPicture(value ?? '')
    })
  }

  const loadGroups: (newGroupId?: string) => void = (newGroupId) => {
    if (database && publicKey) {
      getGroups(database).then((results) => {
        const filters: RelayFilters[] = [
          {
            kinds: [Kind.ChannelCreation],
            authors: [publicKey],
          },
        ]
        if (results && results.length > 0) {
          setGroups(results)
          filters.push({
            kinds: [Kind.Metadata],
            ids: [...results.map((group) => group.pubkey)],
          })
          filters.push({
            kinds: [Kind.ChannelMetadata],
            ids: [...results.map((group) => group.id ?? ''), publicKey, newGroupId ?? ''],
          })
          if (newGroupId) {
            filters.push({
              kinds: [Kind.ChannelCreation],
              ids: [newGroupId],
            })
          }
        }
        relayPool?.subscribe('groups-create', filters)
      })
    }
  }

  const addGroup: () => void = () => {
    if (!searchGroup) return
    if (validNip21(searchGroup)) {
      const key = getNip19Key(searchGroup)
      if (key) loadGroups(key)
    } else {
      loadGroups(searchGroup)
    }
    setSearchGroup(undefined)
    bottomSheetSearchRef.current?.close()
    bottomSheetFabActionRef.current?.close()
  }

  const createNewGroup: () => void = () => {
    if (newGroupName && publicKey) {
      const event: Event = {
        content: JSON.stringify({
          name: newGroupName,
          about: newGroupDescription,
          picture: newGroupPicture,
        }),
        created_at: getUnixTime(new Date()),
        kind: Kind.ChannelCreation,
        pubkey: publicKey,
        tags: [],
      }
      relayPool?.sendEvent(event)
      bottomSheetCreateRef.current?.close()
      bottomSheetFabActionRef.current?.close()
    }
  }

  const renderGroupItem: ListRenderItem<Group> = ({ item }) => {
    return (
      <TouchableRipple
        onPress={() =>
          navigate('Group', {
            groupId: item.id,
            title: item.name || formatId(item.id),
          })
        }
      >
        <View style={styles.row}>
          <View style={styles.groupData}>
            <NostrosAvatar src={item.picture} name={item.name} pubKey={item.pubkey} />
            <View style={styles.groupDescription}>
              <Text>
                {item.name && item.name?.length > 30 ? `${item.name?.slice(0, 30)}...` : item.name}
              </Text>
              <Text style={{ color: theme.colors.onSurfaceVariant }}>
                {item.about && item.about?.length > 30
                  ? `${item.about?.slice(0, 30)}...`
                  : item.about}
              </Text>
            </View>
          </View>
          <View>
            <View style={styles.username}>
              <Text>{username({ name: item.user_name, id: item.pubkey })}</Text>
              {item.valid_nip05 && (
                <MaterialCommunityIcons
                  name='check-decagram-outline'
                  color={theme.colors.onPrimaryContainer}
                  style={styles.verifyIcon}
                />
              )}
            </View>
            <Text style={{ color: theme.colors.onSurfaceVariant }}>{formatId(item.id)}</Text>
          </View>
        </View>
      </TouchableRipple>
    )
  }

  const bottomSheetStyles = React.useMemo(() => {
    return {
      container: {
        backgroundColor: theme.colors.background,
        paddingTop: 16,
        paddingRight: 16,
        paddingBottom: 32,
        paddingLeft: 16,
        borderTopRightRadius: 28,
        borderTopLeftRadius: 28,
        height: 'auto',
      },
    }
  }, [])

  const ListEmptyComponentBlocked = (
    <View style={styles.blankNoButton}>
      <MaterialCommunityIcons
        name='account-group-outline'
        size={64}
        style={styles.center}
        color={theme.colors.onPrimaryContainer}
      />
      <Text variant='headlineSmall' style={styles.center}>
        {t('groupsFeed.emptyTitleBlocked')}
      </Text>
      <Text variant='bodyMedium' style={styles.center}>
        {t('groupsFeed.emptyDescriptionBlocked')}
      </Text>
    </View>
  )

  const fabOptions = React.useMemo(() => {
    return [
      {
        key: 1,
        title: t('groupsFeed.createTitle'),
        left: () => (
          <List.Icon
            icon={() => (
              <MaterialCommunityIcons
                name='account-multiple-plus-outline'
                size={25}
                color={theme.colors.onPrimaryContainer}
              />
            )}
          />
        ),
        onPress: async () => bottomSheetCreateRef.current?.open(),
      },
      {
        key: 2,
        title: t('groupsFeed.add'),
        left: () => (
          <List.Icon
            icon={() => (
              <MaterialCommunityIcons
                name='plus'
                size={25}
                color={theme.colors.onPrimaryContainer}
              />
            )}
          />
        ),
        onPress: async () => bottomSheetSearchRef.current?.open(),
        disabled: false,
        style: {},
      },
    ]
  }, [])

  return (
    <View style={styles.container}>
      <FlashList
        estimatedItemSize={71}
        showsVerticalScrollIndicator={false}
        data={groups}
        renderItem={renderGroupItem}
        ItemSeparatorComponent={Divider}
        ListEmptyComponent={ListEmptyComponentBlocked}
        horizontal={false}
      />
      <AnimatedFAB
        style={[styles.fab, { top: Dimensions.get('window').height - 216 }]}
        icon='plus'
        label='Label'
        onPress={() => bottomSheetFabActionRef.current?.open()}
        animateFrom='right'
        iconMode='static'
        extended={false}
      />
      <RBSheet ref={bottomSheetCreateRef} closeOnDragDown={true} customStyles={bottomSheetStyles}>
        <View>
          <Text style={styles.input} variant='titleLarge'>
            {t('groupsFeed.createTitle')}
          </Text>
          <TextInput
            style={styles.input}
            mode='outlined'
            label={t('groupsFeed.newGroupName') ?? ''}
            onChangeText={setNewGroupName}
            value={newGroupName}
          />
          <TextInput
            style={styles.input}
            multiline
            mode='outlined'
            label={t('groupsFeed.newGroupDescription') ?? ''}
            onChangeText={setNewGroupDescription}
            value={newGroupDescription}
          />
          <TextInput
            style={styles.input}
            mode='outlined'
            label={t('groupsFeed.newGroupPicture') ?? ''}
            onChangeText={setNewGroupPicture}
            value={newGroupPicture}
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
                icon='content-paste'
                onPress={pastePicture}
                forceTextInputFocus={false}
              />
            }
          />
          <Button mode='contained' disabled={!newGroupName} onPress={createNewGroup}>
            {t('groupsFeed.newGroupCreate')}
          </Button>
          <UploadImage
            startUpload={startUpload}
            setImageUri={(imageUri) => {
              setNewGroupPicture(imageUri)
              setStartUpload(false)
            }}
            uploadingFile={uploadingFile}
            setUploadingFile={setUploadingFile}
          />
        </View>
      </RBSheet>
      <RBSheet ref={bottomSheetSearchRef} closeOnDragDown={true} customStyles={bottomSheetStyles}>
        <View>
          <Text style={styles.input} variant='titleLarge'>
            {t('groupsFeed.addTitle')}
          </Text>
          <TextInput
            style={styles.input}
            mode='outlined'
            label={t('groupsFeed.groupId') ?? ''}
            onChangeText={setSearchGroup}
            value={searchGroup}
          />
          <Button mode='contained' disabled={!searchGroup} onPress={addGroup}>
            {t('groupsFeed.add')}
          </Button>
        </View>
      </RBSheet>
      <RBSheet
        ref={bottomSheetFabActionRef}
        closeOnDragDown={true}
        customStyles={bottomSheetStyles}
      >
        <FlatList
          data={fabOptions}
          renderItem={({ item }) => {
            return (
              <List.Item
                key={item.key}
                title={item.title}
                onPress={item.onPress}
                left={item.left}
                disabled={item.disabled}
                titleStyle={item.style}
              />
            )
          }}
          ItemSeparatorComponent={Divider}
          horizontal={false}
        />
      </RBSheet>
      {showNotification && (
        <Snackbar
          style={styles.snackbar}
          visible={showNotification !== undefined}
          duration={Snackbar.DURATION_SHORT}
          onIconPress={() => setShowNotification(undefined)}
          onDismiss={() => setShowNotification(undefined)}
        >
          {t(`groupsFeed.notifications.${showNotification}`)}
        </Snackbar>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  blankNoButton: {
    justifyContent: 'space-between',
    height: 192,
    marginTop: 75,
    padding: 16,
  },
  fab: {
    right: 16,
    position: 'absolute',
  },
  groupDescription: {
    paddingLeft: 16,
  },
  input: {
    marginBottom: 16,
  },
  verifyIcon: {
    paddingTop: 4,
    paddingLeft: 5,
  },
  list: {
    paddingLeft: 16,
    paddingRight: 16,
  },
  snackbar: {
    marginLeft: 16,
    bottom: 16,
  },
  containerAvatar: {
    marginTop: 10,
  },
  row: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  groupData: {
    flexDirection: 'row',
  },
  username: {
    flexDirection: 'row',
  },
  center: {
    alignContent: 'center',
    textAlign: 'center',
  },
})

export default GroupsFeed
