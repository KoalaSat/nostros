import { type RelayMetadata } from '../../DatabaseFunctions/RelayMetadatas'
import { type Relay } from '../../DatabaseFunctions/Relays'
import { median } from '../../NativeFunctions'
import { getRTags } from '../Events'

export interface ResilientAssignation {
  resilientRelays: string[]
  smallRelays: string[]
  centralizedRelays: string[]
}

export const getContactsRelays: (
  userRelays: Relay[],
  relayMetadada: RelayMetadata[],
) => Promise<string[]> = async (userRelays, relayMetadada) => {
  const localhostRegExp = /.*:4848\/?.*$/
  const pubKeys: string[] = []
  // Url => pubkey[]
  const relaysPresence: Record<string, string[]> = {}
  relayMetadada.forEach((metadata) => {
    const rTags: string[][] = getRTags(metadata)
    pubKeys.push(metadata.pubkey)
    const urls = rTags.map((tags) => tags[1])
    urls.forEach((url) => {
      if (!localhostRegExp.test(url)) {
        relaysPresence[url] = [...(relaysPresence[url] ?? []), metadata.pubkey]
      }
    })
  })

  // Median of users per relay
  const medianUsage = median(
    Object.keys(relaysPresence).map((relay) => relaysPresence[relay].length),
  )

  // Sort relays by abs distance from the mediam
  const relaysByPresence = Object.keys(relaysPresence).sort((n1: string, n2: string) => {
    return (
      Math.abs(relaysPresence[n1].length - medianUsage) -
      Math.abs(relaysPresence[n2].length - medianUsage)
    )
  })

  //  Set helpers
  const userRelayUrls = userRelays
    .map((relay) => relay.url)
    .filter((url) => !localhostRegExp.test(url))

  // Allocate contacts to user's relays
  let allocatedUsers: string[] = []
  userRelayUrls.forEach((url) => {
    allocatedUsers = [...allocatedUsers, ...relaysPresence[url]]
  })

  // Iterate over remaining sorted relays and assigns as much users as possible
  const resilientAssignation: string[] = []
  const remainingUsers = pubKeys.filter((pubKey) => !allocatedUsers.includes(pubKey))
  relaysByPresence.forEach((relayUrl) => {
    remainingUsers.forEach((pubKey) => {
      if (!allocatedUsers.includes(pubKey) && relaysPresence[relayUrl].includes(pubKey)) {
        allocatedUsers.push(pubKey)
        if (!resilientAssignation.includes(relayUrl)) {
          resilientAssignation.push(relayUrl)
        }
      }
    })
  })

  return resilientAssignation
}
