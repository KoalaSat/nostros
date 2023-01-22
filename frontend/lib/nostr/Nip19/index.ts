import { decode, EventPointer, npubEncode, ProfilePointer } from 'nostr-tools/nip19'

export function getNpub(key: string): string {

  if (isPublicKey(key)) return key
  
  try {
    return npubEncode(key)
  } catch {
    console.log('Error encoding')
  }

  return key
}

export function getNip19Key(nip19: string): string | null {
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

  return null
}

export function isPrivateKey(nip19: string): boolean {
  return /^(nsec1).*/.test(nip19)
}

export function isPublicKey(nip19: string): boolean {
  return /^(npub1|nprofile1).*/.test(nip19)
}
