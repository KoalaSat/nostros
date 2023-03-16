import { Buffer } from 'buffer'
import { generateSecureRandom } from 'react-native-securerandom'
import * as secp256k1 from '@noble/secp256k1'
import aes from 'browserify-cipher'

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

export function decrypt(privkey: string, pubkey: string, ciphertext: string): string {
  const [cip, iv] = ciphertext.split('?iv=')
  const key = secp256k1.getSharedSecret(privkey, '02' + pubkey)
  const normalizedKey = getNormalizedX(key)

  const decipher = aes.createDecipheriv(
    'aes-256-cbc',
    Buffer.from(normalizedKey, 'hex'),
    Buffer.from(iv, 'base64'),
  )
  let decryptedMessage = decipher.update(cip, 'base64', 'utf8')
  decryptedMessage += decipher.final('utf8')

  return decryptedMessage
}

function getNormalizedX(key: Uint8Array): string {
  return Buffer.from(key.slice(1, 33)).toString('hex')
}
