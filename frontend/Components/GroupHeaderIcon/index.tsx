import React, { useContext, useEffect, useState } from 'react'
import { Clipboard, StyleSheet, View } from 'react-native'
import RBSheet from 'react-native-raw-bottom-sheet'
import {
  Avatar as PaperAvatar,
  Button,
  Divider,
  IconButton,
  Text,
  TextInput,
  TouchableRipple,
  useTheme,
} from 'react-native-paper'
import { getGroup, type Group } from '../../Functions/DatabaseFunctions/Groups'
import { AppContext } from '../../Contexts/AppContext'
import { validImageUrl } from '../../Functions/NativeFunctions'
import FastImage from 'react-native-fast-image'
import { useTranslation } from 'react-i18next'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import UploadImage from '../UploadImage'
import { UserContext } from '../../Contexts/UserContext'
import { getUnixTime } from 'date-fns'
import { Kind } from 'nostr-tools'
import { RelayPoolContext } from '../../Contexts/RelayPoolContext'
import { type Event } from '../../lib/nostr/Events'
import { goBack } from '../../lib/Navigation'
import { getUser, type User } from '../../Functions/DatabaseFunctions/Users'
import ProfileData from '../ProfileData'
import GroupShare from '../GroupShare'
import DatabaseModule from '../../lib/Native/DatabaseModule'

interface GroupHeaderIconProps {
  groupId: string
}

export const GroupHeaderIcon: React.FC<GroupHeaderIconProps> = ({ groupId }) => {
  const { t } = useTranslation('common')
  const { database } = useContext(AppContext)
  const { publicKey } = useContext(UserContext)
  const { relayPool, lastEventId } = useContext(RelayPoolContext)
  const theme = useTheme()
  const [group, setGroup] = useState<Group>()
  const [user, setUser] = useState<User>()
  const [newGroupName, setNewGroupName] = useState<string>()
  const [newGroupDescription, setNewGroupDescription] = useState<string>()
  const [newGroupPicture, setNewGroupPicture] = useState<string>()
  const [startUpload, setStartUpload] = useState<boolean>(false)
  const [uploadingFile, setUploadingFile] = useState<boolean>(false)
  const bottomSheetActionsGroupRef = React.useRef<RBSheet>(null)
  const bottomSheetEditGroupRef = React.useRef<RBSheet>(null)
  const bottomSheetShareGroupRef = React.useRef<RBSheet>(null)

  useEffect(() => {
    if (database && groupId) {
      getGroup(database, groupId).then((result) => {
        getUser(result.pubkey, database).then((user) => {
          if (user) setUser(user)
        })
        setGroup(result)
        setNewGroupName(result.name)
        setNewGroupDescription(result.about)
        setNewGroupPicture(result.picture)
      })
    }
  }, [lastEventId])

  const pastePicture: () => void = () => {
    Clipboard.getString().then((value) => {
      setNewGroupPicture(value ?? '')
    })
  }

  const onDeleteGroup: () => void = () => {
    if (database && group?.id) {
      DatabaseModule.deleteGroup(group?.id)
      bottomSheetActionsGroupRef.current?.close()
      goBack()
    }
  }

  const updateGroup: () => void = () => {
    if (newGroupName && publicKey && group?.id) {
      const event: Event = {
        content: JSON.stringify({
          name: newGroupName,
          about: newGroupDescription,
          picture: newGroupPicture,
        }),
        created_at: getUnixTime(new Date()),
        kind: Kind.ChannelMetadata,
        pubkey: publicKey,
        tags: [['e', group?.id, '']],
      }
      relayPool?.sendEvent(event)
      bottomSheetEditGroupRef.current?.close()
    }
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

  return (
    <View style={styles.container}>
      <TouchableRipple onPress={() => bottomSheetActionsGroupRef.current?.open()}>
        {validImageUrl(group?.picture) ? (
          <FastImage
            style={[
              {
                backgroundColor: theme.colors.backdrop,
                borderRadius: 33,
                width: 35,
                height: 35,
              },
            ]}
            source={{
              uri: group?.picture,
              priority: FastImage.priority.normal,
            }}
            resizeMode={FastImage.resizeMode.contain}
          />
        ) : (
          <PaperAvatar.Text size={35} label={group?.name ?? group?.id ?? ''} />
        )}
      </TouchableRipple>
      <RBSheet
        ref={bottomSheetActionsGroupRef}
        closeOnDragDown={true}
        customStyles={bottomSheetStyles}
      >
        <View>
          <View style={styles.cardUser}>
            <View>
              <View style={styles.cardUserMain}>
                <ProfileData
                  username={group?.name}
                  publicKey={group?.id}
                  picture={group?.picture}
                />
              </View>
              {group?.about && (
                <View style={styles.cardGroupAbout}>
                  <Text>{group?.about}</Text>
                </View>
              )}
            </View>
          </View>
          <Divider />
          <View style={styles.cardUser}>
            <View>
              <View style={styles.cardUserMain}>
                <ProfileData
                  username={user?.name}
                  publicKey={user?.id}
                  validNip05={user?.valid_nip05}
                  nip05={user?.nip05}
                  lnurl={user?.lnurl}
                  lnAddress={user?.ln_address}
                  picture={user?.picture}
                />
              </View>
            </View>
            <View style={styles.arrow}>
              <MaterialCommunityIcons
                name='menu-right'
                size={25}
                color={theme.colors.onPrimaryContainer}
              />
            </View>
          </View>
          <Divider />
          <View style={styles.mainLayout}>
            <View style={styles.actionButton}>
              <IconButton icon='account-multiple-minus-outline' size={28} onPress={onDeleteGroup} />
              <Text>{t('groupHeaderIcon.delete')}</Text>
            </View>
            {group?.pubkey === publicKey && (
              <View style={styles.actionButton}>
                <IconButton
                  icon='pencil'
                  size={28}
                  onPress={() => {
                    bottomSheetEditGroupRef.current?.open()
                    bottomSheetActionsGroupRef.current?.close()
                  }}
                />
                <Text>{t('groupHeaderIcon.edit')}</Text>
              </View>
            )}
            <View style={styles.actionButton}>
              <IconButton
                icon='share-variant-outline'
                size={28}
                onPress={() => bottomSheetShareGroupRef.current?.open()}
              />
              <Text>{t('groupHeaderIcon.share')}</Text>
            </View>
          </View>
        </View>
      </RBSheet>
      <RBSheet
        ref={bottomSheetShareGroupRef}
        closeOnDragDown={true}
        customStyles={bottomSheetStyles}
      >
        {group && <GroupShare group={group} />}
      </RBSheet>
      <RBSheet
        ref={bottomSheetEditGroupRef}
        closeOnDragDown={true}
        customStyles={bottomSheetStyles}
      >
        <View>
          <Text style={styles.input} variant='titleLarge'>
            {t('groupsFeed.updateTitle')}
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
          <Button
            mode='contained'
            style={styles.input}
            disabled={!newGroupName}
            onPress={() => updateGroup()}
          >
            {t('groupsFeed.groupUpdate')}
          </Button>
          <Button mode='outlined' style={styles.input} onPress={onDeleteGroup}>
            {t('groupsFeed.delete')}
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
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingRight: 8,
  },
  input: {
    marginTop: 16,
  },
  cardGroupAbout: {
    marginTop: 16,
  },
  cardUser: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  cardUserMain: {
    flexDirection: 'row',
  },
  arrow: {
    alignContent: 'center',
    justifyContent: 'center',
  },
  mainLayout: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    alignItems: 'center',
  },
})

export default GroupHeaderIcon
