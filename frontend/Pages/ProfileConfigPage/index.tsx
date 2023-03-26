import React, { useContext, useEffect, useState } from 'react'
import { Linking, ScrollView, StyleSheet, View } from 'react-native'
import Clipboard from '@react-native-clipboard/clipboard'
import { AppContext } from '../../Contexts/AppContext'
import { useTranslation } from 'react-i18next'
import { UserContext } from '../../Contexts/UserContext'
import { Kind } from 'nostr-tools'
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
import { getUnixTime } from 'date-fns'
import { useFocusEffect } from '@react-navigation/native'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import UploadImage from '../../Components/UploadImage'
import { navigate } from '../../lib/Navigation'

export const ProfileConfigPage: React.FC = () => {
  const { t } = useTranslation('common')
  const theme = useTheme()
  const bottomSheetPictureRef = React.useRef<RBSheet>(null)
  const bottomSheetDirectoryRef = React.useRef<RBSheet>(null)
  const bottomSheetNip05Ref = React.useRef<RBSheet>(null)
  const bottomSheetLud06Ref = React.useRef<RBSheet>(null)
  const { database } = useContext(AppContext)
  const { relayPool, lastEventId, lastConfirmationtId, sendEvent } = useContext(RelayPoolContext)
  const {
    publicKey,
    nPub,
    nSec,
    name,
    setName,
    picture,
    setPicture,
    about,
    setAbout,
    lnurl,
    setLnurl,
    lnAddress,
    setLnAddress,
    nip05,
    setNip05,
    reloadUser,
  } = useContext(UserContext)
  // State
  const [showNotification, setShowNotification] = useState<undefined | string>()
  const [isPublishingProfile, setIsPublishingProfile] = useState<string>()
  const [startUpload, setStartUpload] = useState<boolean>(false)
  const [uploadingFile, setUploadingFile] = useState<boolean>(false)

  useFocusEffect(
    React.useCallback(() => {
      if (database && publicKey) {
        relayPool?.subscribe('loading-meta', [
          {
            kinds: [Kind.Metadata],
            authors: [publicKey],
          },
        ])
      }
      return () => {
        relayPool?.unsubscribe(['loading-meta'])
      }
    }, []),
  )

  useEffect(() => {
    reloadUser()
    if (isPublishingProfile) {
      setIsPublishingProfile(undefined)
      setShowNotification(isPublishingProfile)
      bottomSheetPictureRef.current?.close()
      bottomSheetNip05Ref.current?.close()
      bottomSheetLud06Ref.current?.close()
    }
  }, [lastEventId, lastConfirmationtId])

  const publishUser: () => Promise<void> = async () => {
    return await new Promise<void>((resolve) => {
      if (publicKey && relayPool) {
        sendEvent({
          content: JSON.stringify({
            name,
            about,
            lud06: lnurl,
            lud16: lnAddress,
            nip05,
            picture,
          }),
          created_at: getUnixTime(new Date()),
          kind: Kind.Metadata,
          pubkey: publicKey,
          tags: [],
        }).then(() => resolve())
      } else {
        resolve()
      }
    })
  }

  const onPublishUser: (notification: string) => void = (notification) => {
    if (publicKey && database) {
      setIsPublishingProfile(notification)
      publishUser().catch(() => {
        setIsPublishingProfile(undefined) // restore sending status
        setShowNotification('connectionError')
      })
    }
  }

  const rbSheetCustomStyles = React.useMemo(() => {
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

  const pasteLud16: () => void = () => {
    Clipboard.getString().then((value) => {
      setLnAddress(value ?? '')
    })
  }

  return (
    <View style={styles.container}>
      <ScrollView horizontal={false} showsVerticalScrollIndicator={false}>
        <Card style={styles.cardContainer}>
          <Card.Content>
            <View style={styles.cardPicture}>
              <TouchableRipple onPress={() => bottomSheetPictureRef.current?.open()}>
                <View style={{ borderRadius: 50, overflow: 'hidden' }}>
                  {picture ? (
                    <Avatar.Image size={100} source={{ uri: picture }} />
                  ) : (
                    <NostrosAvatar
                      name={name}
                      pubKey={nPub ?? ''}
                      src={picture}
                      lnurl={lnurl}
                      lnAddress={lnAddress}
                      size={100}
                    />
                  )}
                </View>
              </TouchableRipple>
            </View>
            <View style={styles.cardActions}>
              <View style={styles.actionButton}>
                <IconButton
                  icon='content-copy'
                  size={28}
                  onPress={() => {
                    setShowNotification('npubCopied')
                    Clipboard.setString(nPub ?? '')
                  }}
                />
                <Text>{t('profileConfigPage.copyNPub')}</Text>
              </View>
              <View style={styles.actionButton}>
                <IconButton
                  icon='folder-check-outline'
                  size={28}
                  onPress={() => bottomSheetDirectoryRef.current?.open()}
                />
                <Text>{t('profileConfigPage.directory')}</Text>
              </View>
              <View style={styles.actionButton}>
                <IconButton
                  icon='check-decagram-outline'
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
            <View style={styles.cardActions}>
              <View style={styles.actionButton}>
                <IconButton
                  icon='badge-account-outline'
                  size={28}
                  onPress={() => navigate('ExternalIdentities')}
                />
                <Text>{t('profileConfigPage.externalIdentities')}</Text>
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
            style={styles.input}
          />
          <TextInput
            mode='outlined'
            label={t('profileConfigPage.about') ?? ''}
            onChangeText={setAbout}
            value={about}
            multiline
            numberOfLines={5}
            style={styles.input}
          />
          <TextInput
            mode='outlined'
            label={t('profileConfigPage.npub') ?? ''}
            value={nPub}
            selectTextOnFocus={true}
            editable={false}
            right={
              <TextInput.Icon
                icon='content-copy'
                onPress={() => {
                  setShowNotification('npubCopied')
                  Clipboard.setString(nPub ?? '')
                }}
                forceTextInputFocus={false}
              />
            }
            style={styles.input}
          />
          <TextInput
            mode='outlined'
            label={t('profileConfigPage.nsec') ?? ''}
            value={nSec}
            secureTextEntry={true}
            editable={false}
            selectTextOnFocus={true}
            right={
              <TextInput.Icon
                icon='content-copy'
                onPress={() => {
                  setShowNotification('nsecCopied')
                  Clipboard.setString(nSec ?? '')
                }}
                forceTextInputFocus={false}
              />
            }
            style={styles.input}
          />
          <Button
            mode='contained'
            onPress={() => onPublishUser('profilePublished')}
            loading={isPublishingProfile !== undefined}
          >
            {t('profileConfigPage.publish')}
          </Button>
        </View>
      </ScrollView>
      <RBSheet
        ref={bottomSheetPictureRef}
        closeOnDragDown={true}
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
            style={styles.imageInput}
            right={
              <TextInput.Icon
                icon='content-paste'
                onPress={pastePicture}
                forceTextInputFocus={false}
              />
            }
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
          />
          <Button
            mode='contained'
            disabled={!picture || picture === ''}
            onPress={() => onPublishUser('picturePublished')}
            loading={isPublishingProfile !== undefined}
          >
            {t('profileConfigPage.publishPicture')}
          </Button>
        </View>
      </RBSheet>
      <RBSheet
        ref={bottomSheetDirectoryRef}
        closeOnDragDown={true}
        customStyles={rbSheetCustomStyles}
      >
        <View>
          <Text variant='titleLarge'>{t('profileConfigPage.directoryTitle')}</Text>
          <Text style={styles.spacer} variant='bodyMedium'>
            {t('profileConfigPage.directoryDescription')}
          </Text>
          <Button
            style={styles.spacer}
            mode='contained'
            onPress={async () => await Linking.openURL('https://www.nostr.directory')}
            loading={isPublishingProfile !== undefined}
          >
            {t('profileConfigPage.directoryContinue')}
          </Button>
          <Button mode='outlined' onPress={() => bottomSheetDirectoryRef.current?.close()}>
            {t('profileConfigPage.directoryCancell')}
          </Button>
        </View>
      </RBSheet>
      <RBSheet ref={bottomSheetNip05Ref} closeOnDragDown={true} customStyles={rbSheetCustomStyles}>
        <View>
          <Text variant='titleLarge'>{t('profileConfigPage.nip05Title')}</Text>
          <Text style={styles.spacer} variant='bodyMedium'>
            {t('profileConfigPage.nip05Description')}
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
            style={styles.spacer}
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
            onPress={() => onPublishUser('nip05Published')}
            loading={isPublishingProfile !== undefined}
          >
            {t('profileConfigPage.publishNip05')}
          </Button>
        </View>
      </RBSheet>
      <RBSheet ref={bottomSheetLud06Ref} closeOnDragDown={true} customStyles={rbSheetCustomStyles}>
        <View>
          <Text variant='titleLarge'>{t('profileConfigPage.lud06Title')}</Text>
          <Text style={styles.spacer} variant='bodyMedium'>
            {t('profileConfigPage.lud06Description')}
          </Text>
          <TextInput
            style={styles.spacer}
            mode='outlined'
            multiline
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
          <TextInput
            style={styles.spacer}
            mode='outlined'
            multiline
            label={t('profileConfigPage.lud16Label') ?? ''}
            onChangeText={setLnAddress}
            value={lnAddress}
            right={
              <TextInput.Icon
                icon='content-paste'
                onPress={pasteLud16}
                forceTextInputFocus={false}
              />
            }
          />
          <Button
            mode='contained'
            onPress={() => onPublishUser('lud06Published')}
            loading={isPublishingProfile !== undefined}
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
          {t(`profileConfigPage.notifications.${showNotification}`, {
            nip05,
            lud06: lnurl,
            lud16: lnAddress,
          })}
        </Snackbar>
      )}
      <UploadImage
        startUpload={startUpload}
        setImageUri={(imageUri) => {
          setPicture(imageUri)
          setStartUpload(false)
        }}
        uploadingFile={uploadingFile}
        setUploadingFile={setUploadingFile}
        alert={false}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  spacer: {
    marginBottom: 16,
  },
  container: {
    padding: 16,
  },
  inputContainer: {
    justifyContent: 'space-between',
    paddingTop: 16,
  },
  input: {
    marginBottom: 16,
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
  },
  actionButton: {
    marginTop: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  snackbar: {
    marginLeft: 16,
    bottom: 24,
    flex: 1,
  },
  link: {
    textDecorationLine: 'underline',
  },
  imageInput: {
    marginTop: 16,
    marginBottom: 16,
  },
})

export default ProfileConfigPage
