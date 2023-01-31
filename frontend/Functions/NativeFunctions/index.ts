export const handleInfinityScroll: (event: any) => boolean = (event) => {
  const mHeight = event.nativeEvent.layoutMeasurement.height
  const cSize = event.nativeEvent.contentSize.height
  const Y = event.nativeEvent.contentOffset.y
  // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
  if (Math.ceil(mHeight + Y) >= cSize) return true
  return false
}

export const stringToColour: (string: string) => string = (string) => {
  let hash = 0
  for (let i = 0; i < string.length; i++) {
    hash = string.charCodeAt(i) + ((hash << 5) - hash)
  }
  let colour = '#'
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xff
    colour += ('00' + value.toString(16)).substr(-2)
  }
  return colour
}

export const pickRandomItems = <T extends unknown>(arr: T[], n: number): T[] => {
  const shuffled = Array.from(arr).sort(() => 0.5 - Math.random())
  return shuffled.slice(0, n)
}

export const validImageUrl: (url: string | undefined) => boolean = (url) => {
  if (url) {
    const regexp = /^(https?:\/\/.*\.(?:png|jpg|jpeg|gif|webp))$/
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
    const regexp = /^nostr:(npub1|nprofile1|note1|nevent1)S*$/
    return regexp.test(string)
  } else {
    return false
  }
}

export const randomInt: (min: number, max: number) => number = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
