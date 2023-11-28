import { nostrBuildUpload } from '../../Functions/ServicesFunctions/NostrBuildUpload'
import { nostrcheckUpload } from '../../Functions/ServicesFunctions/nostrcheckUpload'
import { voidCatUpload } from '../../Functions/ServicesFunctions/VoidCatUpload'

export const imageHostingServices: Record<
  string,
  {
    uri: string
    uploadUrl: string
    donation: string
    sendFunction: (fileUri: string, fileType: string, filename: string) => Promise<string | null>
  }
> = {
  // voidCat: {
  //   uri: 'https://void.cat',
  //   uploadUrl: 'https://void.cat/upload',
  //   donation: 'https://void.cat/donate',
  //   sendFunction: voidCatUpload,
  // },
  // nostrBuild: {
  //   uri: 'https://nostr.build',
  //   uploadUrl: 'https://nostr.build/upload.php',
  //   donation: 'https://nostr.build',
  //   sendFunction: nostrBuildUpload,
  // },
  nostrcheck: {
    uri: 'https://nostrcheck.me',
    uploadUrl: 'https://nostrcheck.me/api/media.php',
    donation: 'https://nostrcheck.me/about/support-us.php',
    sendFunction: nostrcheckUpload,
  },
}
