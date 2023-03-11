import * as React from 'react'
import { StyleSheet, View } from 'react-native'
// import { Camera, useCameraDevices } from 'react-native-vision-camera'
// import { useScanBarcodes, BarcodeFormat } from 'vision-camera-code-scanner'
import { Text, useTheme } from 'react-native-paper'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import { useTranslation } from 'react-i18next'
// import { goBack } from '../../lib/Navigation'
// import { AppContext } from '../../Contexts/AppContext'

export const QrReaderPage: React.FC = () => {
  const theme = useTheme()
  const { t } = useTranslation('common')
  // const { setQrReader } = React.useContext(AppContext)
  // const [hasPermission, setHasPermission] = React.useState<boolean>()
  // const devices = useCameraDevices()
  // const device = devices.back

  // const [frameProcessor, barcodes] = useScanBarcodes([BarcodeFormat.QR_CODE], {
  //   checkInverted: true,
  // })

  // React.useEffect(() => {
  //   if (barcodes.length > 0) {
  //     const lastIndex = barcodes.length - 1
  //     const qrValue = barcodes[lastIndex].displayValue
  //     if (qrValue) {
  //       setQrReader(qrValue)
  //       goBack()
  //     }
  //   }
  // }, [barcodes])

  // React.useEffect(() => {
  //   ;(async () => {
  //     const status = await Camera.requestCameraPermission()
  //     setHasPermission(status === 'authorized')
  //   })()
  // }, [])

  // const NoPermissionsComponent = React.useMemo(
  //   () => (
  //     <View style={styles.blank}>
  //       <MaterialCommunityIcons
  //         name='camera-off-outline'
  //         size={64}
  //         style={styles.center}
  //         color={theme.colors.onPrimaryContainer}
  //       />
  //       <Text variant='headlineSmall' style={styles.center}>
  //         {t('qrReaderPage.emptyTitle')}
  //       </Text>
  //     </View>
  //   ),
  //   [],
  // )

  // if (hasPermission === undefined) return <></>
  // return device != null && hasPermission ? (
  return (
    <View style={styles.container}>
      <View style={styles.reader}>
        {/* <Camera
          style={styles.camera}
          device={device}
          isActive={true}
          frameProcessor={frameProcessor}
          frameProcessorFps={5}
        /> */}
      </View>
      <View style={styles.title}>
        <MaterialCommunityIcons
          name='qrcode'
          size={64}
          style={styles.center}
          color={theme.colors.onPrimaryContainer}
        />
        <Text variant='headlineSmall' style={styles.center}>
          {t('qrReaderPage.QRreader')}
        </Text>
      </View>
    </View>
    // ) : (
    //   NoPermissionsComponent
  )
}

const styles = StyleSheet.create({
  barcodeTextURL: {
    fontSize: 20,
    color: 'white',
    fontWeight: 'bold',
  },
  center: {
    alignContent: 'center',
    textAlign: 'center',
  },
  blank: {
    justifyContent: 'space-between',
    height: 170,
    marginTop: 50,
  },
  title: {
    justifyContent: 'space-between',
    height: 120,
    marginTop: 50,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignContent: 'center',
  },
  reader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignContent: 'center',
  },
  camera: {
    height: 300,
    width: 300,
  },
})

export default QrReaderPage
