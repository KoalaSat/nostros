import schnorr from 'bip-schnorr'
import { Kind } from 'nostr-tools'

export interface Event {
  content: string
  created_at: number
  id?: string
  kind: Kind
  pubkey: string
  sig?: string
  tags: string[][]
}

export const evetDatabaseToEntity: (object: any) => Event = (object = {}) => {
  const event: Event = {
    created_at: object.created_at,
    content: object.content,
    id: object.id,
    kind: object.kind,
    pubkey: object.pubkey,
    sig: object.sig,
    tags: object.tags ? JSON.parse(object.tags) : [],
  }
  return event
}

export const serializeEvent: (event: Event) => string = (event) => {
  return JSON.stringify([0, event.pubkey, event.created_at, event.kind, event.tags, event.content])
}

export const getEventHash: (event: Event) => Buffer = (event) => {
  return schnorr.convert.hash(Buffer.from(serializeEvent(event)))
}

export const validateEvent: (event: Event) => boolean = (event) => {
  if (event.id !== getEventHash(event).toString('hex')) return false
  if (typeof event.content !== 'string') return false
  if (typeof event.created_at !== 'number') return false

  if (!Array.isArray(event.tags)) return false
  for (let i = 0; i < event.tags.length; i++) {
    const tag = event.tags[i]
    if (!Array.isArray(tag)) return false
    for (let j = 0; j < tag.length; j++) {
      if (typeof tag[j] === 'object') return false
    }
  }

  return true
}

export const verifySignature: (event: Event) => Promise<boolean> = async (event) => {
  try {
    schnorr.verify(
      Buffer.from(event.pubkey, 'hex'),
      Buffer.from(event?.id, 'hex'),
      Buffer.from(event?.sig, 'hex'),
    )
    return true
  } catch (_e) {
    console.error('The signature verification failed')
    return false
  }
}

export const signEvent: (event: Event, privateKey: string) => Promise<Event> = async (
  event,
  privateKey,
) => {
  const hash = getEventHash(event)

  const signature: string = Buffer.from(await schnorr.sign(privateKey, hash), 'hex').toString('hex')

  event.id = hash.toString('hex')
  event.sig = signature

  return event
}
