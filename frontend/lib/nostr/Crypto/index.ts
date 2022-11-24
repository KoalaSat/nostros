import aes from 'browserify-cipher'
import { Buffer } from 'buffer'
import * as secp256k1 from '@noble/secp256k1'
import { generateSecureRandom } from 'react-native-securerandom'

export const encrypt: (privkey: string, pubkey: string, text: string) => Promise<string> = async (
  privkey,
  pubkey,
  text,
) => {
  const key = secp256k1.getSharedSecret(privkey, '02' + pubkey)
  const normalizedKey = Buffer.from(key.slice(1, 33)).toString('hex')

  const iv = await generateSecureRandom(16)
  const cipher = aes.createCipheriv('aes-256-cbc', Buffer.from(normalizedKey, 'hex'), iv)
  let encryptedMessage = cipher.update(text, 'utf8', 'base64')
  encryptedMessage += cipher.final('base64')

  return `${encryptedMessage}?iv=${Buffer.from(iv.buffer).toString('base64')}`
}
