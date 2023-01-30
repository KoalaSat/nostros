import { imageHostingServices } from '../../../Constants/Services'
import axios from 'axios'

export const nostrBuildUpload: (
  fileUri: string,
  fileType: string,
  fileName: string,
) => Promise<string | null> = async (fileUri, fileType, fileName) => {
  return await new Promise<string | null>((resolve, reject) => {
    const formdata = new FormData()
    formdata.append('fileToUpload', {
      uri: fileUri,
      name: fileName,
      type: fileType,
    })
    formdata.append('submit', 'Upload Image')
    const headers = {
      'Content-Type': 'multipart/form-data',
    }
    axios
      .post(imageHostingServices.nostrBuild.uploadUrl, formdata, {
        headers,
      })
      .then((response) => {
        const regExp = /(https:\/\/nostr.build\/i\/nostr.build.*)<\/b>/
        const imageUrl: string = response.data.match(regExp)[0].slice(0, -4)
        resolve(imageUrl)
      })
      .catch(() => {
        reject(new Error('Error uploading image'))
      })
  })
}
