export const defaultRelays = [
  'wss://brb.io',
  'wss://damus.io',
  'wss://nostr.swiss-enigma.ch',
  'wss://nostr-pub.wellorder.net',
  'wss://nostr-relay.wlvs.space',
  'wss://nostr.onsats.org',
  'wss://nostr-pub.semisol.dev',
  'wss://nostr.openchain.fr',
  'wss://relay.nostr.info',
  'wss://nostr.oxtr.dev',
  'wss://nostr.ono.re',
  'wss://relay.grunch.dev',
]

export const REGEX_SOCKET_LINK =
  /((wss):\/\/)?([\w_-]+(?:(?:\.[\w_-]+)+))([\w.,@?^=%&:/~+#-]*[\w@?^=%&/~+#-])?/i
