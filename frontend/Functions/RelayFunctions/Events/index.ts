import { Event } from '../../../lib/nostr/Events';

export const getMainEventId: (event: Event) => string | null = (event) => {
  const eTags = getETags(event);
  let mainTag = eTags.find((tag) => {
    return tag[3] === 'root';
  });

  if (!mainTag) {
    mainTag = eTags[0];
  }

  return mainTag ? mainTag[1] : null;
};

export const getReplyEventId: (event: Event) => string | null = (event) => {
  const eTags = getETags(event);
  let mainTag = eTags.find((tag) => {
    return tag[3] === 'reply';
  });

  if (!mainTag) {
    mainTag = eTags[eTags.length - 1];
  }
  
  return mainTag ? mainTag[1] : null;
};

export const getDirectReplies: (replies: Event[], event: Event) => Event[] = (replies, event) => {
  const expectedTags: number = getETags(event).length + 1;
  const filter = replies.filter((event) => {
    const eventETags = getETags(event);
    return eventETags.length === expectedTags;
  });

  return filter;
};

export const getETags: (event: Event) => string[][] = (event) => {
  return event.tags.filter((tag) => tag[0] === 'e');
};
