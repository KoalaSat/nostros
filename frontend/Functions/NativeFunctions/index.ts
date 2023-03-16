import { endOfYesterday, format, formatDistanceToNow, fromUnixTime, isBefore } from 'date-fns'

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

export const pickRandomItems = <T>(arr: T[], n: number): T[] => {
  const shuffled = Array.from(arr).sort(() => 0.5 - Math.random())
  return shuffled.slice(0, n)
}

export const validImageUrl: (url: string | undefined) => boolean = (url) => {
  if (url) {
    const regexp = /^(https?:\/\/.*\.?(png|jpg|jpeg|gif|webp){1}(\?.*)?)$/
    return regexp.test(url)
  } else {
    return false
  }
}

export const validMediaUrl: (url: string | undefined) => boolean = (url) => {
  if (url) {
    return /^(https?:\/\/.*\.(mp4|mp3){1})$/.test(url)
  } else {
    return false
  }
}

export const validTubeUrl: (url: string | undefined) => boolean = (url) => {
  if (url) {
    return /^(https?:\/\/.*\.?(youtube|youtu.be){1}.*)$/.test(url)
  } else {
    return false
  }
}

export const validBlueBirdUrl: (url: string | undefined) => boolean = (url) => {
  if (url) {
    const serviceRegexp = /^(https?:\/\/.*\.?(twitter.com|t.co){1}.*)$/
    return serviceRegexp.test(url)
  } else {
    return false
  }
}

export const validNip21: (string: string | undefined) => boolean = (string) => {
  if (string) {
    const regexp = /^(nostr:)?(npub1|nprofile1|nevent1|nrelay1|note1){1}\S*$/
    return regexp.test(string)
  } else {
    return false
  }
}

export const formatDate: (unix: number | undefined) => string = (unix) => {
  if (!unix) return ''

  const date = fromUnixTime(unix)
  if (isBefore(date, endOfYesterday())) {
    return formatDistanceToNow(fromUnixTime(unix), { addSuffix: true })
  } else {
    return format(date, 'HH:mm')
  }
}

export const formatBigNumber: (num: number | undefined) => string = (num) => {
  if (num === undefined) return ''

  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`
  } else if (num >= 1_000) {
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
