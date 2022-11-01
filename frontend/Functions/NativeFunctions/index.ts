export const handleInfinityScroll: (event: any) => boolean = (event) => {
  const mHeight = event.nativeEvent.layoutMeasurement.height
  const cSize = event.nativeEvent.contentSize.height
  const Y = event.nativeEvent.contentOffset.y
  // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
  if (Math.ceil(mHeight + Y) >= cSize) return true
  return false
}
