export const handleInfinityScroll: (event: any) => boolean = (event) => {
  const mHeight = event.nativeEvent.layoutMeasurement.height
  const cSize = event.nativeEvent.contentSize.height
  const Y = event.nativeEvent.contentOffset.y
  // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
  if (Math.ceil(mHeight + Y) >= cSize) return true
  return false
}

export const relayColors = [
  '#3016dd',
  '#43e1ef',
  '#ef3b50',
  '#d3690c',
  '#43e23b',
  '#3a729e',
  '#805de2',
  '#b2ff5b',
  '#eaa123',
  '#ba7a3b',
  '#90c900',
  '#26e08c',
  '#090660',
  '#9edb62',
  '#db48f2',
  '#5d14aa',
  '#f2d859',
  '#0b8458',
  '#cdea10',
  '#6473e0',
  '#6721a5',
  '#f76f8c',
  '#ce2780',
  '#403ba0',
  '#a9f41d',
  '#BBF067',
]

export const relayToColor: (string: string) => string = (string) => {
  let hash = 0
  for (let i = 0; i < string.length; i++) {
    hash = string.charCodeAt(i) + ((hash << 5) - hash)
  }
  return relayColors[(Math.abs(hash) % relayColors.length) - 1]
}

export const pickRandomItems = <T extends unknown>(arr: T[], n: number): T[] => {
  const shuffled = Array.from(arr).sort(() => 0.5 - Math.random())
  return shuffled.slice(0, n)
}

export const validImageUrl: (url: string | undefined) => boolean = (url) => {
  if (url) {
    const regexp = /^(https?:\/\/.*\.(?:png|jpg|jpeg|gif|webp)(\?.*)?)$/
    return regexp.test(url)
  } else {
    return false
  }
}

export const validMediaUrl: (url: string | undefined) => boolean = (url) => {
  if (url) {
    const fileRegexp = /^(https?:\/\/.*\.(?:mp4|mp3))$/
    const serviceRegexp = /^(https?:\/\/(?:youtube|youtu.be).*)$/
    return fileRegexp.test(url) || serviceRegexp.test(url)
  } else {
    return false
  }
}

export const validBlueBirdUrl: (url: string | undefined) => boolean = (url) => {
  if (url) {
    const serviceRegexp = /^(https?:\/\/(?:twitter.com).*)$/
    return serviceRegexp.test(url)
  } else {
    return false
  }
}

export const validNip21: (string: string | undefined) => boolean = (string) => {
  if (string) {
    const regexp = /^(nostr:)?(npub1|nprofile1|nevent1|nrelay1)\S*$/
    return regexp.test(string)
  } else {
    return false
  }
}

export const randomInt: (min: number, max: number) => number = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min

export const median: (arr: number[]) => number = (arr) => {
  const mid = Math.floor(arr.length / 2)
  const nums = [...arr].sort((a, b) => a - b)
  return arr.length % 2 !== 0 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2
}
