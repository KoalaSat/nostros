import { generateSecureRandom } from 'react-native-securerandom'
import schnorr from 'bip-schnorr'
import { wordlist } from '@scure/bip39/wordlists/english.js'

export const generateRandomKey: () => Promise<string> = async () => {
  for (;;) {
    const random = await generateSecureRandom(32)
    const buffer = Buffer.from(random)
    const value = schnorr.convert.bufferToInt(buffer)
    try {
      schnorr.check.checkRange('a', value)
      return buffer.toString('hex')
    } catch (e) {
      // out of range, generate another one
    }
  }
}

export const generateRandomMnemonic: () => Promise<Record<number, string>> = async () => {
  const result: Record<number, string> = {}
  for (let index = 0; index < 12; index++) {
    const random = await generateSecureRandom(4)
    const totalRandom = random.reduce((sum, current) => sum + current, 0)
    const position = totalRandom % wordlist.length
    result[index + 1] = wordlist[position]
  }

  return result
}
