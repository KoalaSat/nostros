import ecurve from 'ecurve'
import BigInteger from 'bigi'
import { generateSecureRandom } from 'react-native-securerandom'
import schnorr from 'bip-schnorr'

export const getPublickey: (privateKey: string) => string = (privateKey) => {
  const privateKeyBuffer = Buffer.from(privateKey, 'hex')
  const ecparams = ecurve.getCurveByName('secp256k1')

  const curvePt = ecparams.G.multiply(BigInteger.fromBuffer(privateKeyBuffer))
  const publicKey = curvePt.getEncoded(true)

  return publicKey.toString('hex').slice(2)
}

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
