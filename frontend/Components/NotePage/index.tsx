import {
  Card,
  Layout,
  List,
  TopNavigation,
  TopNavigationAction,
  useTheme,
} from '@ui-kitten/components';
import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../../Contexts/AppContext';
import { getNotes, Note } from '../../Functions/DatabaseFunctions/Notes';
import { RelayPoolContext } from '../../Contexts/RelayPoolContext';
import Icon from 'react-native-vector-icons/FontAwesome5';
import NoteCard from '../NoteCard';
import { EventKind } from '../../lib/nostr/Events';
import { RelayFilters } from '../../lib/nostr/Relay';
import { StyleSheet } from 'react-native';
import Loading from '../Loading';
import ActionButton from 'react-native-action-button';
import { useTranslation } from 'react-i18next';
import { getDirectReplies, getReplyEventId } from '../../Functions/RelayFunctions/Events';

export const NotePage: React.FC = () => {
  const { page, goBack, goToPage, database } = useContext(AppContext);
  const { lastEventId, relayPool } = useContext(RelayPoolContext);
  const [note, setNote] = useState<Note>();
  const [replies, setReplies] = useState<Note[]>([]);
  const theme = useTheme();
  const { t } = useTranslation('common');
  const breadcrump = page.split('%');
  const eventId = breadcrump[breadcrump.length - 1].split('#')[1];

  useEffect(() => {
    relayPool?.unsubscribeAll();
    relayPool?.subscribe('main-channel', {
      kinds: [EventKind.textNote, EventKind.recommendServer],
      ids: [eventId],
    });
    relayPool?.subscribe('main-channel', {
      kinds: [EventKind.textNote, EventKind.recommendServer],
      '#e': [eventId],
    });
  }, []);

  useEffect(() => {
    if (database) {
      getNotes(database, { filters: { id: eventId } }).then((events) => {
        if (events.length > 0) {
          const event = events[0];
          setNote(event);
          getNotes(database, { filters: { reply_event_id: eventId } }).then((notes) => {
            const rootReplies = getDirectReplies(notes, event);
            if (rootReplies.length > 0) {
              setReplies(rootReplies as Note[]);
              const message: RelayFilters = {
                kinds: [EventKind.meta],
                authors: rootReplies.map((note) => note.pubkey),
              };
              relayPool?.subscribe('main-channel', message);
            } else {
              setReplies([]);
            }
          });
        }
      });
    }
  }, [lastEventId, page]);

  const onPressBack: () => void = () => {
    goBack();
  };

  const renderBackAction = (): JSX.Element => {
    return (
      <TopNavigationAction
        icon={<Icon name='arrow-left' size={16} color={theme['text-basic-color']} />}
        onPress={onPressBack}
      />
    );
  };

  const onPressNote: (note: Note) => void = (note) => {
    if (note.kind !== EventKind.recommendServer) {
      const replyEventId = getReplyEventId(note);
      if (replyEventId && replyEventId !== eventId) {
        goToPage(`note#${replyEventId}`);
      } else if (note.id) {
        goToPage(`note#${note.id}`);
      }
      setReplies([]);
    }
  };

  const ItemCard: (note?: Note) => JSX.Element = (note) => {
    if (note?.id === eventId) {
      return (
        <Layout style={styles.main} level='2'>
          <NoteCard note={note} />
        </Layout>
      );
    } else if (note) {
      return (
        <Card onPress={() => onPressNote(note)}>
          <NoteCard note={note} />
        </Card>
      );
    } else {
      return <></>;
    }
  };

  const styles = StyleSheet.create({
    main: {
      paddingBottom: 32,
      paddingTop: 26,
      paddingLeft: 26,
      paddingRight: 26,
    },
    loading: {
      maxHeight: 160,
    },
  });

  return (
    <>
      <TopNavigation
        alignment='center'
        title={`${eventId.slice(0, 12)}...${eventId.slice(-12)}`}
        accessoryLeft={renderBackAction}
      />
      <Layout level='4'>
        {note ? (
          <List data={[note, ...replies]} renderItem={(item) => ItemCard(item?.item)} />
        ) : (
          <Loading style={styles.loading} />
        )}
      </Layout>
      <ActionButton
        buttonColor={theme['color-primary-400']}
        useNativeFeedback={true}
        fixNativeFeedbackRadius={true}
      >
        <ActionButton.Item
          buttonColor={theme['color-warning-500']}
          title={t('notePage.reply')}
          onPress={() => goToPage(`send#${eventId}`)}
        >
          <Icon name='reply' size={30} color={theme['text-basic-color']} solid />
        </ActionButton.Item>
      </ActionButton>
    </>
  );
};

export default NotePage;
