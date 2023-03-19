import { nip19 } from 'nostr-tools'

export function getNpub(key: string | undefined): string {
  if (!key) return ''
  if (isPublicKey(key)) return key

  try {
    return nip19.npubEncode(key)
  } catch {
    console.log('Error encoding')
  }

  return key
}

export function getNprofile(key: string, relays: string[]): string {
  if (!key) return ''

  try {
    return nip19.nprofileEncode({
      pubkey: key,
      relays,
    })
  } catch {
    console.log('Error encoding')
  }

  return key
}

export function getNevent(key: string | undefined, relays: string[]): string {
  if (!key) return ''
  if (isPublicKey(key)) return key

  try {
    return nip19.neventEncode({ id: key, relays })
  } catch {
    console.log('Error encoding')
  }

  return key
}

export function getNip19Key(key: string): string | null {
  let result = null

  try {
    const decoded = nip19.decode(key)
    if (decoded.type === 'nprofile') {
      const data = decoded.data as nip19.ProfilePointer
      result = data.pubkey
    } else if (decoded.type === 'nevent') {
      const data = decoded.data as nip19.EventPointer
      result = data.id
    } else {
      result = decoded.data as string
    }
  } catch (e) {
    console.log('Error decoding getNip19Key', e)
  }

  return result
}

export function isPrivateKey(nip19: string): boolean {
  return /^(nsec1).*/.test(nip19)
}

export function isPublicKey(nip19: string): boolean {
  return /^(npub1|nprofile1).*/.test(nip19)
}
