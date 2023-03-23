import { imageHostingServices } from '../../../Constants/Services'
import axios from 'axios'

export const nostrcheckUpload: (
  fileUri: string,
  fileType: string,
  fileName: string,
) => Promise<string | null> = async (fileUri, fileType, fileName) => {
  return await new Promise<string | null>((resolve, reject) => {
    const formdata = new FormData()
    formdata.append('publicgallery', {
      uri: fileUri,
      name: fileName,
      type: fileType,
    })
    formdata.append('apikey', '26d075787d261660682fb9d20dbffa538c708b1eda921d0efa2be95fbef4910a')
    formdata.append('type', 'media')
    formdata.append('submit', 'Upload Image')
    const headers = {
      'Content-Type': 'multipart/form-data',
    }
    axios
      .post(imageHostingServices.nostrcheck.uploadUrl, formdata, {
        headers,
      })
      .then((response) => {
        const imageUrl: string = response.data.URL
        resolve(imageUrl)
      })
      .catch(() => {
        reject(new Error('Error uploading image'))
      })
  })
}
