// Thanks to v0l/snort for the nice code!
// https://github.com/v0l/snort/blob/39fbe3b10f94b7542df01fb085e4f164aab15fca/src/Feed/VoidUpload.ts

import { imageHostingServices } from '../../../Constants/Services'
import ReactNativeBlobUtil from 'react-native-blob-util'

export const voidCatUpload: (
  fileUri: string,
  fileType: string,
  fileName: string,
) => Promise<string | null> = async (fileUri, fileType, fileName) => {
  const digest = await ReactNativeBlobUtil.fs.hash(fileUri, 'sha256')
  return await new Promise<string | null>((resolve, reject) => {
    ReactNativeBlobUtil.fetch(
      'POST',
      imageHostingServices.voidCat.uploadUrl,
      {
        'Content-Type': 'application/octet-stream',
        'V-Content-Type': fileType,
        'V-Filename': fileName,
        'V-Full-Digest': digest,
        'V-Description': 'Uploaded from Nostros https://github.com/KoalaSat/nostros',
        'V-Strip-Metadata': 'true',
      },
      ReactNativeBlobUtil.wrap(fileUri),
    )
      .then((repsp) => JSON.parse(repsp.data))
      .then((data) => {
        if (data.ok) {
          resolve(`${imageHostingServices.voidCat.uri}/d/${data.file.id}.png`)
        } else {
          reject(new Error('Error uploading image'))
        }
      })
      .catch((e) => {
        console.log(e)
        reject(new Error('Error uploading image'))
      })
  })
}
