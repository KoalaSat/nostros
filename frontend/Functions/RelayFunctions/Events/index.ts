import { Event } from '../../../lib/nostr/Events'

export const getReplyEventId: (event: Event) => string | null = (event) => {
  const eTags = getETags(event)
  let mainTag = eTags.find((tag) => {
    return tag[3] === 'reply'
  })

  if (!mainTag) {
    mainTag = eTags[eTags.length - 1]
  }

  return mainTag ? mainTag[1] : null
}

export const getDirectReplies: (event: Event, replies: Event[]) => Event[] = (event, replies) => {
  return replies.filter((item) => isDirectReply(event, item))
}

export const isDirectReply: (mainEvent: Event, reply: Event) => boolean = (mainEvent, reply) => {
  const taggedMainEventsIds: string[] = getTaggedEventIds(mainEvent)
  const taggedReplyEventsIds: string[] = getTaggedEventIds(reply)
  const difference = taggedReplyEventsIds.filter((item) => !taggedMainEventsIds.includes(item))

  return difference.length === 1 && difference[0] === mainEvent?.id
}

export const getTaggedEventIds: (event: Event) => string[] = (event) => {
  const mainEventETags: string[][] = getETags(event)
  return mainEventETags.map((item) => item[1] ?? '')
}

export const getETags: (event: Event) => string[][] = (event) => {
  return event?.tags.filter((tag) => tag[0] === 'e') || []
}
