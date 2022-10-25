import { Card, Layout, List, useTheme } from '@ui-kitten/components';
import React, { useContext, useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { AppContext } from '../../Contexts/AppContext';
import { getNotes, Note } from '../../Functions/DatabaseFunctions/Notes';
import NoteCard from '../NoteCard';
import Fab from 'rn-fab';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { RelayPoolContext } from '../../Contexts/RelayPoolContext';
import { EventKind } from '../../lib/nostr/Events';
import { RelayFilters } from '../../lib/nostr/Relay';
import { getReplyEventId } from '../../Functions/RelayFunctions/Events';
import { getUsers } from '../../Functions/DatabaseFunctions/Users';
import Loading from '../Loading';

export const HomePage: React.FC = () => {
  const { database, setPage, page } = useContext(AppContext);
  const { lastEventId, relayPool, publicKey } = useContext(RelayPoolContext);
  const theme = useTheme();
  const [notes, setNotes] = useState<Note[]>([]);
  const [totalContacts, setTotalContacts] = useState<number>(-1);

  const loadNotes: () => void = () => {
    if (database && publicKey) {
      getNotes(database, { contacts: true, includeIds: [publicKey] }).then((notes) => {
        setNotes(notes);
      });
    }
  };

  const subscribeNotes: () => void = () => {
    if (database && publicKey) {
      getNotes(database, { limit: 1 }).then((notes) => {
        getUsers(database, { contacts: true, includeIds: [publicKey] }).then((users) => {
          setTotalContacts(users.length);
          let message: RelayFilters = {
            kinds: [EventKind.textNote, EventKind.recommendServer],
            authors: users.map((user) => user.id),
            limit: 20,
          };

          if (notes.length !== 0) {
            message = {
              ...message,
              since: notes[0].created_at,
            };
          }

          relayPool?.subscribe('main-channel', message);
        });
      });
    }
  };

  useEffect(() => {
    loadNotes();
  }, [lastEventId]);

  useEffect(() => {
    loadNotes();
    subscribeNotes();
  }, [database]);

  const onPress: (note: Note) => void = (note) => {
    if (note.kind !== EventKind.recommendServer) {
      const replyEventId = getReplyEventId(note);
      if (replyEventId) {
        setPage(`${page}%note#${replyEventId}`);
      } else if (note.id) {
        setPage(`${page}%note#${note.id}`);
      }
    }
  };

  const itemCard: (note: Note) => JSX.Element = (note) => {
    return (
      <Card onPress={() => onPress(note)}>
        <NoteCard note={note} />
      </Card>
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    icon: {
      width: 32,
      height: 32,
    },
  });

  return (
    <>
      <Layout style={styles.container} level='4'>
        {notes.length === 0 && totalContacts !== 0 ? (
          <Loading />
        ) : (
          <List data={notes} renderItem={(item) => itemCard(item.item)} />
        )}
      </Layout>
      <Fab
        actions={[
          {
            icon: <Icon name='plus' size={20} color={theme['text-basic-color']} />,
            name: 'btn_plus',
            color: theme['color-primary-400'],
          },
          {
            icon: <Icon name='paper-plane' size={20} color={theme['text-basic-color']} solid />,
            name: 'send',
            color: theme['color-warning-500'],
          },
        ]}
        style={{ right: 40, bottom: 80 }}
        rotation={'45deg'}
        onPress={(name: string) => {
          if (name === 'send') {
            setPage(`${page}%send`);
          }
        }}
      />
    </>
  );
};

export default HomePage;
