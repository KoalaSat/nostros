import * as React from 'react'
import { StyleSheet, View } from 'react-native'
// import { Camera, useCameraDevices } from 'react-native-vision-camera'
// import { useScanBarcodes, BarcodeFormat } from 'vision-camera-code-scanner'
import { Text, useTheme } from 'react-native-paper'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import { useTranslation } from 'react-i18next'

export const QrReaderPage: React.FC = () => {
  const theme = useTheme()
  const { t } = useTranslation('common')
  // const [hasPermission, setHasPermission] = React.useState(false)
  // const devices = useCameraDevices()
  // const device = devices.back

  // const [frameProcessor, barcodes] = useScanBarcodes([BarcodeFormat.QR_CODE], {
  //   checkInverted: true,
  // })

  // React.useEffect(() => {
  //   console.log(barcodes)
  // }, [barcodes])

  // React.useEffect(() => {
  //   ;(async () => {
  //     const status = await Camera.requestCameraPermission()
  //     setHasPermission(status === 'authorized')
  //   })()
  // }, [])

  const NoPermissionsComponent = React.useMemo(
    () => (
      <View style={styles.blank}>
        <MaterialCommunityIcons
          name='camera-off-outline'
          size={64}
          style={styles.center}
          color={theme.colors.onPrimaryContainer}
        />
        <Text variant='headlineSmall' style={styles.center}>
          {t('qrReaderPage.emptyTitle')}
        </Text>
        <Text variant='bodyMedium' style={styles.center}>
          {t('qrReaderPage.emptyDescription')}
        </Text>
      </View>
    ),
    [],
  )

  // return device != null && hasPermission ? (
  //   <>
  //     <Camera
  //       style={StyleSheet.absoluteFill}
  //       device={device}
  //       isActive={true}
  //       frameProcessor={frameProcessor}
  //       frameProcessorFps={5}
  //     />
  //     {barcodes.map((barcode, idx) => (
  //       <Text key={idx} style={styles.barcodeTextURL}>
  //         {barcode.displayValue}
  //       </Text>
  //     ))}
  //   </>
  // ) : (
  //   NoPermissionsComponent
  // )
  return NoPermissionsComponent
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
    marginTop: 91,
  },
})

export default QrReaderPage
