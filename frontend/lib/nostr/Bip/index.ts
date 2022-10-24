import ecurve from 'ecurve';
import BigInteger from 'bigi';

export const getPublickey: (privateKey: string) => string = (privateKey) => {
  const privateKeyBuffer = Buffer.from(privateKey, 'hex');
  const ecparams = ecurve.getCurveByName('secp256k1');

  const curvePt = ecparams.G.multiply(BigInteger.fromBuffer(privateKeyBuffer));
  const publicKey = curvePt.getEncoded(true);

  return publicKey.toString('hex').slice(2);
};
