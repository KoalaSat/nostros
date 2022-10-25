import moment from 'moment';
import { SQLiteDatabase } from 'react-native-sqlite-storage';
import RelayPool from '../../../lib/nostr/RelayPool/intex';
import { getUser, getUsers, User } from '../../DatabaseFunctions/Users';
import { Event } from '../../../lib/nostr/Events';

export const usersToTags: (users: User[]) => string[][] = (users) => {
  return users.map((user): string[] => {
    return ['p', user.id, user.main_relay ?? '', user.name ?? ''];
  });
};

export const tagsToUsers: (tags: string[][]) => User[] = (tags) => {
  return tags.map((tag): User => {
    return tagToUser(tag);
  });
};

export const tagToUser: (tag: string[]) => User = (tag) => {
  return {
    id: tag[1],
    main_relay: tag[2],
    name: tag[3],
  };
};

export const populatePets: (
  relayPool: RelayPool,
  database: SQLiteDatabase,
  publicKey: string,
) => void = (relayPool, database, publicKey) => {
  getUsers(database, { exludeIds: [publicKey], contacts: true }).then((results) => {
    if (results) {
      const event: Event = {
        content: '',
        created_at: moment().unix(),
        kind: 3,
        pubkey: publicKey,
        tags: usersToTags(results),
      };
      relayPool?.sendEvent(event);
    }
  });
};

export const populateProfile: (
  relayPool: RelayPool,
  database: SQLiteDatabase,
  publicKey: string,
) => void = (relayPool, database, publicKey) => {
  getUser(publicKey, database).then((result) => {
    if (result) {
      const profile = {
        name: result.name,
        main_relay: result.main_relay,
        picture: result.picture,
        about: result.about,
      };
      const event: Event = {
        content: JSON.stringify(profile),
        created_at: moment().unix(),
        kind: 0,
        pubkey: publicKey,
        tags: usersToTags([result]),
      };
      relayPool?.sendEvent(event);
    }
  });
};
