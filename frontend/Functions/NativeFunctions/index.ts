export const handleInfinityScroll: (event: any) => boolean = (event) => {
  const mHeight = event.nativeEvent.layoutMeasurement.height
  const cSize = event.nativeEvent.contentSize.height
  const Y = event.nativeEvent.contentOffset.y
  // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
  if (Math.ceil(mHeight + Y) >= cSize) return true
  return false
}

export const relayColors = [
  '#DADADA',
  '#DA7E5D',
  '#FFC93C',
  '#B83B5E',
  '#6A2C70',
  '#155263',
  '#314CDA',
  '#00ADB5',
  '#9A1919',
  '#FF2E63',
  '#397D2E',
  '#4CBB3A',
  '#9AF245',
  '#7592BD',
  '#52616B',
  '#753422',
  '#484848',
  '#CA8300',
  '#FFFFFF',
  '#000000',
  '#3A3A3A',
]

export const relayToColor: (string: string) => string = (string) => {
  let hash = 0
  for (let i = 0; i < string.length; i++) {
    hash = string.charCodeAt(i) + ((hash << 5) - hash)
  }
  return relayColors[Math.abs(hash) % (relayColors.length - 1)]
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
    const serviceRegexp = /^(https?:\/\/(?:twitter.com|t.co).*)$/
    return serviceRegexp.test(url)
  } else {
    return false
  }
}

export const validNip21: (string: string | undefined) => boolean = (string) => {
  if (string) {
    const regexp = /^(nostr:)?(npub1|nprofile1|nevent1|nrelay1|note1)\S*$/
    return regexp.test(string)
  } else {
    return false
  }
}

export const formatBigNumber: (num: number) => string = (num) => {
  if (num > 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`
  } else if (num > 1_000) {
    return `${(num / 1_000).toFixed(1)}K`
  } else {
    return num.toString()
  }
}

export const randomInt: (min: number, max: number) => number = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min

export const median: (arr: number[]) => number = (arr) => {
  const mid = Math.floor(arr.length / 2)
  const nums = [...arr].sort((a, b) => a - b)
  return arr.length % 2 !== 0 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2
}
