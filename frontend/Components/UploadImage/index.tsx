import React, { useContext, useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { Button, Card, Snackbar, Text, useTheme } from 'react-native-paper'
import { useTranslation } from 'react-i18next'
import RBSheet from 'react-native-raw-bottom-sheet'
import { type Asset, launchImageLibrary } from 'react-native-image-picker'
import { imageHostingServices } from '../../Constants/Services'
import { AppContext } from '../../Contexts/AppContext'

interface UploadImageProps {
  alert?: boolean
  startUpload: boolean
  setImageUri: (uri: string) => void
  uploadingFile: boolean
  setUploadingFile: (uploading: boolean) => void
  onError?: () => void
}

export const UploadImage: React.FC<UploadImageProps> = ({
  alert,
  startUpload,
  setImageUri,
  uploadingFile,
  setUploadingFile,
  onError = () => {},
}) => {
  const { getImageHostingService } = useContext(AppContext)
  const theme = useTheme()
  const { t } = useTranslation('common')
  const [showNotification, setShowNotification] = useState<undefined | string>()
  const [imageUpload, setImageUpload] = useState<Asset>()
  const bottomSheetImageRef = React.useRef<RBSheet>(null)
  const [imageHostingService] = useState<string>(getImageHostingService())

  useEffect(() => {
    if (startUpload && !uploadingFile) {
      getImage()
    }
  }, [startUpload])

  const getImage: () => void = () => {
    launchImageLibrary({ selectionLimit: 1, mediaType: 'mixed' }, async (result) => {
      const assets = result?.assets
      if (assets && assets.length > 0) {
        const file = assets[0]
        if (file.uri && file.type && file.fileName) {
          setImageUpload(file)
          setUploadingFile(false)
          bottomSheetImageRef.current?.open()
        } else {
          onError()
          setUploadingFile(false)
          setShowNotification('imageUploadErro')
        }
      } else {
        onError()
        setUploadingFile(false)
      }
    })
  }

  const uploadImage: () => void = async () => {
    if (imageUpload?.uri && imageUpload.type && imageUpload.fileName) {
      setUploadingFile(true)
      imageHostingServices[imageHostingService]
        .sendFunction(imageUpload.uri, imageUpload.type, imageUpload.fileName)
        .then((imageUri) => {
          if (imageUri) setImageUri(imageUri)
          bottomSheetImageRef.current?.close()
          setUploadingFile(false)
          setImageUpload(undefined)
          setShowNotification('imageUploaded')
        })
        .catch(() => {
          bottomSheetImageRef.current?.close()
          setUploadingFile(false)
          setShowNotification('imageUploadErro')
          onError()
        })
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
    <>
      <RBSheet ref={bottomSheetImageRef} closeOnDragDown={true} customStyles={bottomSheetStyles}>
        <Card style={styles.imageUploadPreview}>
          {imageUpload && (
            <Card.Cover source={{ uri: imageUpload?.uri ?? '' }} resizeMode='contain' />
          )}
        </Card>
        <Text>
          {t('uploadImage.poweredBy', { uri: imageHostingServices[imageHostingService].uri })}
        </Text>
        <View style={[styles.warning, { backgroundColor: '#683D00' }]}>
          <Text variant='titleSmall' style={[styles.warningTitle, { color: '#FFDCBB' }]}>
            {t('uploadImage.uploadImageWarningTitle')}
          </Text>
          <Text style={{ color: '#FFDCBB' }}>{t('uploadImage.uploadImageWarning')}</Text>
        </View>
        <Button
          style={styles.buttonSpacer}
          mode='contained'
          onPress={uploadImage}
          loading={uploadingFile}
          disabled={uploadingFile}
        >
          {t('uploadImage.uploadImage')}
        </Button>
        <Button
          mode='outlined'
          onPress={() => {
            bottomSheetImageRef.current?.close()
            setImageUpload(undefined)
            onError()
          }}
        >
          {t('uploadImage.cancel')}
        </Button>
      </RBSheet>
      {showNotification && (
        <Snackbar
          style={styles.snackbar}
          visible={showNotification !== undefined}
          duration={Snackbar.DURATION_SHORT}
          onIconPress={() => setShowNotification(undefined)}
          onDismiss={() => setShowNotification(undefined)}
        >
          {t(`uploadImage.notifications.${showNotification}`, {
            uri: imageHostingServices[imageHostingService].donation,
          })}
        </Snackbar>
      )}
    </>
  )
}

const styles = StyleSheet.create({
  imageUploadPreview: {
    marginTop: 16,
    marginBottom: 16,
  },
  buttonSpacer: {
    marginTop: 16,
    marginBottom: 16,
  },
  snackbar: {
    margin: 16,
    bottom: 100,
    flex: 1,
  },
  warning: {
    borderRadius: 4,
    padding: 16,
    marginTop: 16,
    marginBottom: 16,
  },
  warningTitle: {
    marginBottom: 8,
  },
})

export default UploadImage
