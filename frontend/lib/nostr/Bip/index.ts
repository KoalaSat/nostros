import { generateSecureRandom } from 'react-native-securerandom'
import schnorr from 'bip-schnorr'

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
