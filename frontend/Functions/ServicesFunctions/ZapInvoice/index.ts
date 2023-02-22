// Thanks to v0l/snort for the nice code!
// https://github.com/v0l/snort/blob/39fbe3b10f94b7542df01fb085e4f164aab15fca/src/Feed/VoidUpload.ts

import { QuickSQLiteConnection } from 'react-native-quick-sqlite'
import { getRelays, Relay } from '../../DatabaseFunctions/Relays'
import { getUnixTime } from 'date-fns'
import { Event, signEvent } from '../../../lib/nostr/Events'
import { requestInvoiceWithServiceParams, requestPayServiceParams } from 'lnurl-pay'
import axios from 'axios'

export const lightningInvoice: (
  database: QuickSQLiteConnection,
  lud: string,
  tokens: number,
  privateKey: string,
  publicKey: string,
  userId: string,
  zap?: boolean,
  zapPubkey?: string,
  comment?: string,
  noteId?: string,
) => Promise<string | null> = async (
  database,
  lud,
  tokens,
  privateKey,
  publicKey,
  userId,
  zap,
  zapPubkey,
  comment,
  noteId,
) => {
  let nostr: string

  if (zap && database && privateKey && publicKey && zapPubkey && userId) {
    const relays: Relay[] = await getRelays(database)
    const tags = [
      ['p', userId],
      ['amount', (tokens * 1000).toString()],
      ['relays', ...relays.map((relay) => relay.url)],
    ]
    if (noteId) tags.push(['e', noteId])

    const event: Event = {
      content: comment,
      created_at: getUnixTime(new Date()),
      kind: 9734,
      pubkey: publicKey,
      tags,
    }
    const signedEvent = await signEvent(event, privateKey)
    nostr = JSON.stringify(signedEvent)
  }

  const serviceParams = await requestPayServiceParams({ lnUrlOrAddress: lud })

  return await new Promise<string>((resolve, reject) => {
    requestInvoiceWithServiceParams({
      params: serviceParams,
      lnUrlOrAddress: lud,
      tokens,
      comment,
      fetchGet: async ({ url, params }) => {
        if (params && nostr && serviceParams.rawData.allowsNostr) {
          params.nostr = nostr
        }
        const response = await axios.get(url, {
          params,
        })
        return response.data
      },
    })
      .then((action) => {
        if (action.hasValidAmount && action.invoice) {
          resolve(action.invoice)
        }
      })
      .catch((e) => {
        reject(new Error())
      })
  })
}
