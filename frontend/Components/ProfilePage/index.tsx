import {
  Card,
  Layout,
  List,
  Spinner,
  Text,
  TopNavigation,
  TopNavigationAction,
  useTheme,
} from '@ui-kitten/components';
import React, { useContext, useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { AppContext } from '../../Contexts/AppContext';
import UserAvatar from 'react-native-user-avatar';
import { getNotes, Note } from '../../Functions/DatabaseFunctions/Notes';
import NoteCard from '../NoteCard';
import { RelayPoolContext } from '../../Contexts/RelayPoolContext';
import {
  getUser,
  getUsers,
  removeContact,
  addContact,
  User,
} from '../../Functions/DatabaseFunctions/Users';
import { EventKind, Event } from '../../lib/nostr/Events';
import Relay from '../../lib/nostr/Relay';
import Icon from 'react-native-vector-icons/FontAwesome5';
import ActionButton from 'react-native-action-button';
import { useTranslation } from 'react-i18next';
import { populatePets, tagToUser } from '../../Functions/RelayFunctions/Users';
import { getReplyEventId } from '../../Functions/RelayFunctions/Events';
import Loading from '../Loading';
import { storeEvent } from '../../Functions/DatabaseFunctions/Events';

export const ProfilePage: React.FC = () => {
  const { database, page, setPage } = useContext(AppContext);
  const { publicKey, lastEventId, relayPool, setLastEventId } = useContext(RelayPoolContext);
  const theme = useTheme();
  const [notes, setNotes] = useState<Note[]>([]);
  const { t } = useTranslation('common');
  const [user, setUser] = useState<User | null>(null);
  const [contacts, setContactsIds] = useState<string[]>();
  const [isContact, setIsContact] = useState<boolean>();
  const breadcrump = page.split('%');
  const userId = breadcrump[breadcrump.length - 1].split('#')[1] ?? publicKey;
  const username = user?.name === '' ? user?.id : user?.name;

  useEffect(() => {
    setUser(null)
    setNotes([])
    relayPool?.on('event', 'profile', (_relay: Relay, _subId?: string, event?: Event) => {
      console.log('PROFILE EVENT =======>', event);
      if (database && event?.id && event.pubkey === userId) {
        if (event.kind === EventKind.petNames) {
          const ids = event.tags.map((tag) => tagToUser(tag).id);
          setContactsIds(ids);
        } else if (event.kind === EventKind.meta) {
          storeEvent(event, database).finally(() => {
            if (event?.id) setLastEventId(event.id)
          });
        }
      }
    });
    if (database) {
      getNotes(database, { filters: { pubkey: userId }, limit: 1 }).then((notes) => {
        if (notes) {
          relayPool?.subscribe('main-channel', {
            kinds: [EventKind.textNote, EventKind.recommendServer],
            authors: [userId],
            limit: 10,
            since: notes[0]?.created_at,
          });
        }
      });
    }
    relayPool?.subscribe('main-channel', {
      kinds: [EventKind.meta, EventKind.petNames],
      authors: [userId],
    });
  }, [page]);

  useEffect(() => {
    if (database) {
      getUser(userId, database).then((user) => {
        setUser(user);
        setIsContact(user?.contact);
      });
      if (userId === publicKey) {
        getUsers(database, { contacts: true }).then((users) => {
          setContactsIds(users.map((user) => user.id));
        });
      }
      getNotes(database, { filters: { pubkey: userId } }).then((notes) => {
        if (notes) {
          setNotes(notes);
        }
      });
    }
  }, [lastEventId, page]);

  const removeAuthor: () => void = () => {
    if (relayPool && database) {
      removeContact(userId, database).then(() => {
        populatePets(relayPool, database, publicKey)
        setIsContact(false)
      });
    }
  };

  const addAuthor: () => void = () => {
    if (relayPool && database) {
      addContact(userId, database).then(() => {
        populatePets(relayPool, database, publicKey)
        setIsContact(true)
      });
    }
  };

  const renderOptions: () => JSX.Element = () => {
    if (publicKey === userId) {
      return (
            <TopNavigationAction
              icon={<Icon name='dna' size={16} color={theme['text-basic-color']} solid />}
              onPress={() => setPage('config')}
            />
          );
    } else {
      if (user) {
        if (isContact) {
          return (
            <TopNavigationAction
              icon={<Icon name='user-minus' size={16} color={theme['color-danger-500']} solid />}
              onPress={removeAuthor}
            />
          );
        } else {
          return (
            <TopNavigationAction
              icon={<Icon name='user-plus' size={16} color={theme['color-success-500']} solid />}
              onPress={addAuthor}
            />
          );
        }
      } else {
        return <Spinner size='tiny' />;
      }
    }
  };

  const onPressBack: () => void = () => {
    setPage(breadcrump.slice(0, -1).join('%'));
  };

  const renderBackAction = (): JSX.Element => {
    if (publicKey === userId) {
      return <></>;
    } else {
      return (
        <TopNavigationAction
          icon={<Icon name='arrow-left' size={16} color={theme['text-basic-color']} />}
          onPress={onPressBack}
        />
      );
    }
  };

  const styles = StyleSheet.create({
    list: {
      flex: 1,
    },
    icon: {
      width: 32,
      height: 32,
    },
    settingsIcon: {
      width: 48,
      height: 48,
    },
    avatar: {
      width: 140,
      marginBottom: 16,
    },
    profile: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 2,
      paddingLeft: 32,
      paddingRight: 32,
    },
    loading: {
      maxHeight: 160,
    },
    about: {
      flex: 4,
      maxHeight: 200,
    },
    stats: {
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
    },
    description: {
      marginTop: 16,
      flexDirection: 'row',
    },
  });

  const itemCard: (note: Note) => JSX.Element = (note) => {
    return (
      <Card onPress={() => onPressNote(note)}>
        <NoteCard note={note} />
      </Card>
    );
  };

  const onPressNote: (note: Note) => void = (note) => {
    if (note.kind !== EventKind.recommendServer) {
      const mainEventId = getReplyEventId(note);
      if (mainEventId) {
        setPage(`note#${mainEventId}`);
      } else if (note.id) {
        setPage(`note#${note.id}`);
      }
    }
  };

  const onPressId: () => void = () => {
    // FIXME
    // Clipboard.setString(user?.id ?? '');
  };

  const profile: JSX.Element = (
    <Layout style={styles.profile} level='3'>
      <Layout style={styles.avatar} level='3'>
        {user ? (
          <UserAvatar
            name={user?.name && user?.name !== '' ? user?.name : user.id}
            src={user?.picture}
            size={140}
            textColor={theme['text-basic-color']}
          />
        ) : (
          <Loading style={styles.loading} />
        )}
      </Layout>
      <TouchableOpacity onPress={onPressId}>
        <Text appearance='hint'>{user?.id}</Text>
      </TouchableOpacity>
      <Layout style={styles.description} level='3'>
        {user && (
          <>
            <Layout style={styles.stats} level='3'>
              <Text>{contacts?.length ?? <Spinner size='tiny' />} </Text>
              <Icon name='address-book' size={16} color={theme['text-basic-color']} solid />
            </Layout>
            <Layout style={styles.about} level='3'>
              <Text numberOfLines={5} ellipsizeMode='tail'>
                {user?.about}
              </Text>
            </Layout>
          </>
        )}
      </Layout>
    </Layout>
  );

  return (
    <>
      <TopNavigation
        alignment='center'
        title={username}
        accessoryLeft={renderBackAction}
        accessoryRight={renderOptions}
      />
      {profile}
      <Layout style={styles.list} level='3'>
        <List data={notes} renderItem={(item) => itemCard(item.item)} />
      </Layout>
      {publicKey === userId && (
        <ActionButton
          buttonColor={theme['color-primary-400']}
          useNativeFeedback={true}
          fixNativeFeedbackRadius={true}
        >
          <ActionButton.Item
            buttonColor={theme['color-warning-500']}
            title={t('profilePage.send')}
            onPress={() => setPage('send')}
          >
            <Icon name='paper-plane' size={30} color={theme['text-basic-color']} solid />
          </ActionButton.Item>
        </ActionButton>
      )}
    </>
  );
};

export default ProfilePage;
