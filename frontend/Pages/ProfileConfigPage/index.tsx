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
  Snackbar,
} from 'react-native-paper'
import { RelayPoolContext } from '../../Contexts/RelayPoolContext'
import RBSheet from 'react-native-raw-bottom-sheet'
import NostrosAvatar from '../../Components/NostrosAvatar'

export const ProfileConfigPage: React.FC = () => {
  const theme = useTheme()
  const bottomSheetPictureRef = React.useRef<RBSheet>(null)
  const bottomSheetDirectoryRef = React.useRef<RBSheet>(null)
  const bottomSheetNip05Ref = React.useRef<RBSheet>(null)
  const bottomSheetLud06Ref = React.useRef<RBSheet>(null)
  const { database } = useContext(AppContext)
  const { relayPool, lastEventId } = useContext(RelayPoolContext)
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
    if (database && publicKey) {
      relayPool?.unsubscribeAll()
      relayPool?.subscribe('loading-meta', [
        {
          kinds: [EventKind.meta],
          authors: [publicKey],
        },
      ])
    }
  }, [])

  useEffect(() => {
    if (database && publicKey) {
      getUser(publicKey, database).then((result) => {
        if (result) {
          setName(result.name)
          setPicture(result.picture)
          setAbout(result.about)
          setLnurl(result.lnurl)
          setNip05(result.nip05)
          setUser(result)
        }
      })
    }
  }, [lastEventId])

  const onPressSavePicture: () => void = () => {
    if (publicKey && database) {
      getUser(publicKey, database).then((result) => {
        relayPool
          ?.sendEvent({
            content: JSON.stringify({
              name: result?.name,
              about: result?.about,
              lud06: result?.lnurl,
              nip05: result?.nip05,
              picture,
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
              ...(user ?? { id: publicKey }),
              picture,
            })
            bottomSheetPictureRef.current?.close()
          })
          .catch(() => {
            setIsPublishingProfile(false) // restore sending status
            setShowNotification('connectionError')
          })
      })
    }
  }

  const onPressSaveNip05: () => void = () => {
    if (publicKey && database) {
      getUser(publicKey, database).then((result) => {
        relayPool
          ?.sendEvent({
            content: JSON.stringify({
              name: result?.name,
              about: result?.about,
              picture: result?.picture,
              lud06: result?.lnurl,
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
              ...(result ?? { id: publicKey }),
              nip05,
            })
            bottomSheetNip05Ref.current?.close()
          })
          .catch(() => {
            setIsPublishingProfile(false) // restore sending status
            setShowNotification('connectionError')
          })
      })
    }
  }

  const onPressSaveLnurl: () => void = () => {
    if (publicKey && database) {
      getUser(publicKey, database).then((result) => {
        relayPool
          ?.sendEvent({
            content: JSON.stringify({
              name: result?.name,
              about: result?.about,
              picture: result?.picture,
              nip05: result?.nip05,
              lud06: lnurl,
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
              ...(user ?? { id: publicKey }),
              lnurl,
            })
            bottomSheetLud06Ref.current?.close()
          })
          .catch(() => {
            setIsPublishingProfile(false) // restore sending status
            setShowNotification('connectionError')
          })
      })
    }
  }

  const onPressSaveProfile: () => void = () => {
    if (publicKey && database) {
      getUser(publicKey, database).then((user) => {
        relayPool
          ?.sendEvent({
            content: JSON.stringify({
              picture: user?.picture,
              lud06: lnurl,
              nip05: user?.nip05,
              name,
              about,
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
          ...(user ?? { id: publicKey }),
          name,
          about,
          picture,
        })
      })
    }
  }

  const rbSheetCustomStyles = React.useMemo(() => {
    return {
      container: {
        backgroundColor: theme.colors.background,
        padding: 16,
        borderTopRightRadius: 28,
        borderTopLeftRadius: 28,
      },
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
                    pubKey={nPub ?? ''}
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
                  icon='check-circle-outline'
                  size={28}
                  onPress={() => bottomSheetNip05Ref.current?.open()}
                />
                <Text>{t('profileConfigPage.nip05')}</Text>
              </View>
              <View style={styles.actionButton}>
                <IconButton
                  icon='lightning-bolt'
                  size={28}
                  iconColor='#F5D112'
                  onPress={() => bottomSheetLud06Ref.current?.open()}
                />
                <Text>{t('profileConfigPage.lud06')}</Text>
              </View>
            </View>
          </Card.Content>
        </Card>
        <View style={styles.inputContainer}>
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
            selectTextOnFocus={true}
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
            selectTextOnFocus={true}
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
          <Button mode='contained' onPress={onPressSaveProfile} loading={isPublishingProfile}>
            {t('profileConfigPage.publish')}
          </Button>
        </View>
      </ScrollView>
      <RBSheet
        ref={bottomSheetPictureRef}
        closeOnDragDown={true}
        height={230}
        customStyles={rbSheetCustomStyles}
      >
        <View style={styles.bottomDrawer}>
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
        height={480}
        customStyles={rbSheetCustomStyles}
      >
        <View style={styles.bottomDrawer}>
          <Text variant='titleLarge'>{t('profileConfigPage.directoryTitle')}</Text>
          <Text variant='bodyMedium'>{t('profileConfigPage.directoryDescription')}</Text>
          <Button
            mode='contained'
            onPress={async () => await Linking.openURL('https://www.nostr.directory')}
            loading={isPublishingProfile}
          >
            {t('profileConfigPage.directoryContinue')}
          </Button>
          <Button mode='outlined' onPress={() => bottomSheetDirectoryRef.current?.close()}>
            {t('profileConfigPage.directoryCancell')}
          </Button>
        </View>
      </RBSheet>
      <RBSheet
        ref={bottomSheetNip05Ref}
        closeOnDragDown={true}
        height={230}
        customStyles={rbSheetCustomStyles}
      >
        <View style={styles.bottomDrawer}>
          <Text variant='titleLarge'>{t('profileConfigPage.nip05Title')}</Text>
          <Text variant='bodyMedium'>
            {t('profileConfigPage.nip05Description')}
            <Text> </Text>
            <Text
              style={styles.link}
              onPress={async () =>
                await Linking.openURL('https://github.com/nostr-protocol/nips/blob/master/05.md')
              }
            >
              {t('profileConfigPage.nip05Link')}
            </Text>
          </Text>
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
            {t('profileConfigPage.publishNip05')}
          </Button>
        </View>
      </RBSheet>
      <RBSheet
        ref={bottomSheetLud06Ref}
        closeOnDragDown={true}
        height={240}
        customStyles={rbSheetCustomStyles}
      >
        <View style={styles.bottomDrawer}>
          <Text variant='titleLarge'>{t('profileConfigPage.lud06Title')}</Text>
          <Text variant='bodyMedium'>{t('profileConfigPage.lud06Description')}</Text>
          <TextInput
            mode='outlined'
            label={t('profileConfigPage.lud06Label') ?? ''}
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
            {t('profileConfigPage.publishLud06')}
          </Button>
        </View>
      </RBSheet>
      {showNotification && (
        <Snackbar
          style={styles.snackbar}
          visible={showNotification !== undefined}
          duration={Snackbar.DURATION_SHORT}
          onIconPress={() => setShowNotification(undefined)}
          onDismiss={() => setShowNotification(undefined)}
        >
          {t(`profileConfigPage.notifications.${showNotification}`, { nip05, lnurl })}
        </Snackbar>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  bottomDrawer: {
    height: '90%',
    justifyContent: 'space-between',
  },
  container: {
    padding: 16,
  },
  inputContainer: {
    justifyContent: 'space-between',
    height: 350,
    paddingTop: 16,
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
  snackbar: {
    margin: 16,
    bottom: 70,
  },
  link: {
    textDecorationLine: 'underline',
  },
})

export default ProfileConfigPage
