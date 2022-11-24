import { DirectMessage } from '../../DatabaseFunctions/DirectMessages'
import { v4 as uuidv4 } from 'uuid'

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

export const generateConversationId: (pubKey: string, otherPubKey: string) => string = (
  pubKey,
  otherPubKey,
) => {
  const pubKeys = [pubKey, otherPubKey].sort().join('')

  return uuidv4({
    random: convertStringToByteArray(pubKeys),
  })
}

export const convertStringToByteArray: (string: string) => number[] = (string) => {
  const bytes = []
  for (let i = 0; i < string.length; ++i) {
    bytes.push(string.charCodeAt(i))
  }
  return bytes
}
