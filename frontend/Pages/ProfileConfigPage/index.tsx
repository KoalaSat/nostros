import React, { useContext, useEffect, useState } from 'react'
import { Clipboard, Linking, ScrollView, StyleSheet, View } from 'react-native'
import { AppContext } from '../../Contexts/AppContext'
import { useTranslation } from 'react-i18next'
import { UserContext } from '../../Contexts/UserContext'
import { getUser } from '../../Functions/DatabaseFunctions/Users'
import { EventKind } from '../../lib/nostr/Events'
import moment from 'moment'
import {
  Avatar,
  Button,
  Card,
  useTheme,
  IconButton,
  Text,
  TouchableRipple,
  TextInput,
} from 'react-native-paper'
import { RelayPoolContext } from '../../Contexts/RelayPoolContext'
import RBSheet from 'react-native-raw-bottom-sheet'
import NostrosNotification from '../../Components/NostrosNotification'
import NostrosAvatar from '../../Components/Avatar'

export const ProfileConfigPage: React.FC = () => {
  const theme = useTheme()
  const bottomSheetPictureRef = React.useRef<RBSheet>(null)
  const bottomSheetDirectoryRef = React.useRef<RBSheet>(null)
  const bottomSheetNip05Ref = React.useRef<RBSheet>(null)
  const bottomSheetLud06Ref = React.useRef<RBSheet>(null)
  const { database } = useContext(AppContext)
  const { relayPool } = useContext(RelayPoolContext)
  const { user, publicKey, nPub, nSec, contactsCount, followersCount, setUser } =
    useContext(UserContext)
  // State
  const [name, setName] = useState<string>()
  const [picture, setPicture] = useState<string>()
  const [about, setAbout] = useState<string>()
  const [lnurl, setLnurl] = useState<string>()
  const [isPublishingProfile, setIsPublishingProfile] = useState<boolean>(false)
  const [nip05, setNip05] = useState<string>()
  const [showNotification, setShowNotification] = useState<undefined | string>()
  const { t } = useTranslation('common')

  useEffect(() => {
    relayPool?.unsubscribeAll()
    if (database && publicKey) {
      if (user) {
        setName(user.name)
        setPicture(user.picture)
        setAbout(user.about)
        setLnurl(user.lnurl)
        setNip05(user.nip05)
      }
    }
  }, [])

  const onPressSavePicture: () => void = () => {
    if (publicKey && database) {
      getUser(publicKey, database).then((user) => {
        if (user) {
          relayPool
            ?.sendEvent({
              content: JSON.stringify({
                name: user.name,
                about: user.about,
                picture,
                lud06: user.lnurl,
                nip05: user.nip05,
              }),
              created_at: moment().unix(),
              kind: EventKind.meta,
              pubkey: publicKey,
              tags: [],
            })
            .then(() => {
              setIsPublishingProfile(false) // restore sending status
              setShowNotification('picturePublished')
              setUser({
                ...user,
                picture,
              })
              bottomSheetPictureRef.current?.close()
            })
            .catch(() => {
              setIsPublishingProfile(false) // restore sending status
              setShowNotification('connectionError')
            })
        }
      })
    }
  }

  const onPressSaveNip05: () => void = () => {
    if (publicKey && database) {
      getUser(publicKey, database).then((user) => {
        if (user) {
          relayPool
            ?.sendEvent({
              content: JSON.stringify({
                name: user.name,
                about: user.about,
                picture: user.picture,
                lud06: user.lnurl,
                nip05,
              }),
              created_at: moment().unix(),
              kind: EventKind.meta,
              pubkey: publicKey,
              tags: [],
            })
            .then(() => {
              setIsPublishingProfile(false) // restore sending status
              setShowNotification('nip05Published')
              setUser({
                ...user,
                nip05,
              })
              bottomSheetNip05Ref.current?.close()
            })
            .catch(() => {
              setIsPublishingProfile(false) // restore sending status
              setShowNotification('connectionError')
            })
        }
      })
    }
  }

  const onPressSaveLnurl: () => void = () => {
    if (publicKey && database) {
      getUser(publicKey, database).then((user) => {
        if (user) {
          relayPool
            ?.sendEvent({
              content: JSON.stringify({
                name: user.name,
                about: user.about,
                picture: user.picture,
                lud06: lnurl,
                nip05: user.nip05,
              }),
              created_at: moment().unix(),
              kind: EventKind.meta,
              pubkey: publicKey,
              tags: [],
            })
            .then(() => {
              setIsPublishingProfile(false) // restore sending status
              setShowNotification('lud06Published')
              setUser({
                ...user,
                lnurl,
              })
              bottomSheetLud06Ref.current?.close()
            })
            .catch(() => {
              setIsPublishingProfile(false) // restore sending status
              setShowNotification('connectionError')
            })
        }
      })
    }
  }

  const onPressSaveProfile: () => void = () => {
    if (publicKey && database) {
      getUser(publicKey, database).then((user) => {
        if (user) {
          relayPool
            ?.sendEvent({
              content: JSON.stringify({
                name,
                about,
                picture: user.picture,
                lud06: lnurl,
                nip05: user.nip05,
              }),
              created_at: moment().unix(),
              kind: EventKind.meta,
              pubkey: publicKey,
              tags: [],
            })
            .then(() => {
              setIsPublishingProfile(false) // restore sending status
              setShowNotification('profilePublished')
              bottomSheetPictureRef.current?.close()
            })
            .catch(() => {
              setIsPublishingProfile(false) // restore sending status
              setShowNotification('connectionError')
            })
          setUser({
            ...user,
            name,
            about,
            picture,
          })
        }
      })
    }
  }

  const rbSheetCustomStyles = React.useMemo(() => {
    return {
      container: {
        ...styles.rbsheetContainer,
        backgroundColor: theme.colors.background,
      },
      draggableIcon: styles.rbsheetDraggableIcon,
    }
  }, [])

  const pastePicture: () => void = () => {
    Clipboard.getString().then((value) => {
      setPicture(value ?? '')
    })
  }

  const pasteNip05: () => void = () => {
    Clipboard.getString().then((value) => {
      setNip05(value ?? '')
    })
  }

  const pasteLud06: () => void = () => {
    Clipboard.getString().then((value) => {
      setLnurl(value ?? '')
    })
  }

  return (
    <View style={styles.container}>
      <ScrollView horizontal={false} showsVerticalScrollIndicator={false}>
        <Card style={styles.cardContainer}>
          <Card.Content>
            <View style={styles.cardPicture}>
              <TouchableRipple onPress={() => bottomSheetPictureRef.current?.open()}>
                {user?.picture ? (
                  <Avatar.Image size={100} source={{ uri: user.picture }} />
                ) : (
                  <NostrosAvatar
                    name={user?.name}
                    pubKey={nPub ?? publicKey ?? ''}
                    src={user?.picture}
                    lud06={user?.lnurl}
                    size={100}
                  />
                )}
              </TouchableRipple>
            </View>
            <View style={styles.cardActions}>
              <Button mode='elevated'>
                {t('menuItems.following', { following: contactsCount })}
              </Button>
              <Button mode='elevated'>
                {t('menuItems.followers', { followers: followersCount })}
              </Button>
            </View>
            <View style={styles.cardActions}>
              <View style={styles.actionButton}>
                <IconButton
                  icon='content-copy'
                  size={28}
                  onPress={() => {
                    setShowNotification('picturePublished')
                    Clipboard.setString(nPub ?? '')
                  }}
                />
                <Text>{t('profileConfigPage.copyNPub')}</Text>
              </View>
              <View style={styles.actionButton}>
                <IconButton
                  icon='twitter'
                  size={28}
                  onPress={() => bottomSheetDirectoryRef.current?.open()}
                />
                <Text>{t('profileConfigPage.directory')}</Text>
              </View>
              <View style={styles.actionButton}>
                <IconButton
                  icon='lightning-bolt'
                  size={28}
                  iconColor='#F5D112'
                  onPress={() => bottomSheetLud06Ref.current?.open()}
                />
                <Text>{t('profileConfigPage.invoice')}</Text>
              </View>
            </View>
            <View style={styles.cardActions}>
              <View style={styles.actionButton}>
                <IconButton
                  icon='check-circle-outline'
                  size={28}
                  onPress={() => bottomSheetNip05Ref.current?.open()}
                />
                <Text>{t('profileConfigPage.nip05')}</Text>
              </View>
              <View style={styles.actionButton}></View>
              <View style={styles.actionButton}></View>
            </View>
          </Card.Content>
        </Card>
        <TextInput
          mode='outlined'
          label={t('profileConfigPage.name') ?? ''}
          onChangeText={setName}
          value={name}
        />
        <TextInput
          mode='outlined'
          label={t('profileConfigPage.about') ?? ''}
          onChangeText={setAbout}
          value={about}
        />
        <TextInput
          mode='outlined'
          label={t('profileConfigPage.npub') ?? ''}
          value={nPub}
          right={
            <TextInput.Icon
              icon='content-paste'
              onPress={() => {
                setShowNotification('npubCopied')
                Clipboard.setString(nPub ?? '')
              }}
              forceTextInputFocus={false}
            />
          }
        />
        <TextInput
          mode='outlined'
          label={t('profileConfigPage.nsec') ?? ''}
          value={nSec}
          secureTextEntry={true}
          right={
            <TextInput.Icon
              icon='content-paste'
              onPress={() => {
                setShowNotification('nsecCopied')
                Clipboard.setString(nSec ?? '')
              }}
              forceTextInputFocus={false}
            />
          }
        />
        <Button
          mode='contained'
          disabled={!picture || picture === ''}
          onPress={onPressSaveProfile}
          loading={isPublishingProfile}
        >
          {t('profileConfigPage.publish')}
        </Button>
      </ScrollView>
      <RBSheet
        ref={bottomSheetPictureRef}
        closeOnDragDown={true}
        height={230}
        customStyles={rbSheetCustomStyles}
      >
        <View>
          <Text variant='titleLarge'>{t('profileConfigPage.pictureTitle')}</Text>
          <Text variant='bodyMedium'>{t('profileConfigPage.pictureDescription')}</Text>
          <TextInput
            mode='outlined'
            label={t('profileConfigPage.pictureUrl') ?? ''}
            onChangeText={setPicture}
            value={picture}
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
            disabled={!picture || picture === ''}
            onPress={onPressSavePicture}
            loading={isPublishingProfile}
          >
            {t('profileConfigPage.publishPicture')}
          </Button>
        </View>
      </RBSheet>
      <RBSheet
        ref={bottomSheetDirectoryRef}
        closeOnDragDown={true}
        height={230}
        customStyles={rbSheetCustomStyles}
      >
        <View>
          <Text variant='titleLarge'>{t('profileConfigPage.directoryTitle')}</Text>
          <Text variant='bodyMedium'>{t('profileConfigPage.directoryDescription')}</Text>
          <Button
            mode='contained'
            onPress={async () => await Linking.openURL('https://www.nostr.directory')}
            loading={isPublishingProfile}
          >
            {t('profileConfigPage.continue')}
          </Button>
          <Button mode='outlined' onPress={() => bottomSheetDirectoryRef.current?.close()}>
            {t('profileConfigPage.cancell')}
          </Button>
        </View>
      </RBSheet>
      <RBSheet
        ref={bottomSheetNip05Ref}
        closeOnDragDown={true}
        height={230}
        customStyles={rbSheetCustomStyles}
      >
        <View>
          <Text variant='titleLarge'>{t('profileConfigPage.pictureTitle')}</Text>
          <Text variant='bodyMedium'>{t('profileConfigPage.pictureDescription')}</Text>
          <TextInput
            mode='outlined'
            label={t('profileConfigPage.nip05') ?? ''}
            onChangeText={setNip05}
            value={nip05}
            right={
              <TextInput.Icon
                icon='content-paste'
                onPress={pasteNip05}
                forceTextInputFocus={false}
              />
            }
          />
          <Button
            mode='contained'
            disabled={!nip05 || nip05 === ''}
            onPress={onPressSaveNip05}
            loading={isPublishingProfile}
          >
            {t('profileConfigPage.publishPicture')}
          </Button>
        </View>
      </RBSheet>
      <RBSheet
        ref={bottomSheetLud06Ref}
        closeOnDragDown={true}
        height={230}
        customStyles={rbSheetCustomStyles}
      >
        <View>
          <Text variant='titleLarge'>{t('profileConfigPage.lud06Title')}</Text>
          <Text variant='bodyMedium'>{t('profileConfigPage.lud06Description')}</Text>
          <TextInput
            mode='outlined'
            label={t('profileConfigPage.lud06') ?? ''}
            onChangeText={setLnurl}
            value={lnurl}
            right={
              <TextInput.Icon
                icon='content-paste'
                onPress={pasteLud06}
                forceTextInputFocus={false}
              />
            }
          />
          <Button
            mode='contained'
            disabled={!lnurl || lnurl === ''}
            onPress={onPressSaveLnurl}
            loading={isPublishingProfile}
          >
            {t('profileConfigPage.publishPicture')}
          </Button>
        </View>
      </RBSheet>
      <NostrosNotification
        showNotification={showNotification}
        setShowNotification={setShowNotification}
      >
        <Text>{t(`profileConfigPage.${showNotification}`)}</Text>
        {showNotification === 'nip05Published' && <Text>{nip05}</Text>}
        {showNotification === 'lud06Published' && <Text>{lnurl}</Text>}
      </NostrosNotification>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  cardContainer: {
    width: '100%',
    justifyContent: 'center',
    alignContent: 'center',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  cardPicture: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignContent: 'center',
    marginBottom: 32,
  },
  actionButton: {
    marginTop: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rbsheetDraggableIcon: {
    backgroundColor: '#000',
  },
  rbsheetContainer: {
    padding: 16,
    borderTopRightRadius: 28,
    borderTopLeftRadius: 28,
  },
  snackbar: {
    margin: 16,
    bottom: 70,
  },
})

export default ProfileConfigPage
