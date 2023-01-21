import { decode, EventPointer, npubEncode, ProfilePointer } from 'nostr-tools/nip19'

export function getNpub(key: string): string {
  return isPublicKey(key) ? key : npubEncode(key)
}

export function getNip19Key(nip19: string): string {
  let result = nip19

  try {
    const decoded = decode(result)
    if (decoded.type === 'nprofile') {
      const data = decoded.data as ProfilePointer
      result = data.pubkey
    } else if (decoded.type === 'nevent') {
      const data = decoded.data as EventPointer
      result = data.id
    } else {
      result = decoded.data as string
    }
  } catch (e) {
    console.log('Error decoding getPublicKey', e)
  }

  return result
}

export function isPrivateKey(nip19: string): boolean {
  return /^(nsec1).*/.test(nip19)
}

export function isPublicKey(nip19: string): boolean {
  return /^(npub1|nprofile1).*/.test(nip19)
}
