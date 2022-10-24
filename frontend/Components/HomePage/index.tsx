import { Card, Layout, List, useTheme } from '@ui-kitten/components';
import React, { useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';
import { AppContext } from '../../Contexts/AppContext';
import { getNotes, Note } from '../../Functions/DatabaseFunctions/Notes';
import NoteCard from '../NoteCard';
import ActionButton from 'react-native-action-button';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { RelayPoolContext } from '../../Contexts/RelayPoolContext';
import { EventKind } from '../../lib/nostr/Events';
import { RelayFilters } from '../../lib/nostr/Relay';
import { getReplyEventId } from '../../Functions/RelayFunctions/Events';
import { getUsers } from '../../Functions/DatabaseFunctions/Users';

export const HomePage: React.FC = () => {
  const { database, setPage, page } = useContext(AppContext);
  const { lastEventId, setLastEventId, relayPool, publicKey } = useContext(RelayPoolContext);
  const theme = useTheme();
  const [notes, setNotes] = useState<Note[]>([]);
  const { t } = useTranslation('common');

  const loadNotes: () => void = () => {
    if (database) {
      getNotes(database, { contacts: true }).then((notes) => {
        setNotes(notes);
      });
    }
  };

  const subscribeNotes: () => void = () => {
    if (database) {
      getNotes(database, { limit: 1 }).then((notes) => {
        getUsers(database, { contacts: true }).then((users) => {
          let message: RelayFilters = {
            kinds: [EventKind.textNote, EventKind.recommendServer],
            authors: [publicKey, ...users.map((user) => user.id)],
            limit: 20,
          };

          if (notes.length > 0) {
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
    loadNotes()
  }, [lastEventId]);

  useEffect(() => {
    loadNotes();
    subscribeNotes();
  }, []);

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
        <List data={notes} renderItem={(item) => itemCard(item.item)} />
      </Layout>
      <ActionButton
        buttonColor={theme['color-primary-400']}
        useNativeFeedback={true}
        fixNativeFeedbackRadius={true}
      >
        <ActionButton.Item
          buttonColor={theme['color-warning-500']}
          title={t('homePage.send')}
          onPress={() => setPage(`${page}%send`)}
        >
          <Icon name='paper-plane' size={30} color={theme['text-basic-color']} solid />
        </ActionButton.Item>
      </ActionButton>
    </>
  );
};

export default HomePage;
