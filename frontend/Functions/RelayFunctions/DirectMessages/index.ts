import { DirectMessage } from '../../DatabaseFunctions/DirectMessages'

export const getOtherPubKey: (message: DirectMessage, ownPubKey: string) => string = (
  message,
  ownPubKey,
) => {
  let otherPubKey = message.pubkey

  if (otherPubKey === ownPubKey) {
    otherPubKey = message.tags[0][1]
  }

  return otherPubKey
}

export const convertStringToByteArray: (string: string) => number[] = (string) => {
  const bytes = []
  for (let i = 0; i < string.length; ++i) {
    bytes.push(string.charCodeAt(i))
  }
  return bytes
}
