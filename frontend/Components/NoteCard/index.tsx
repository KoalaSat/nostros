import React, { useContext, useState } from 'react';
import { Button, Layout, Text, useTheme } from '@ui-kitten/components';
import { Note } from '../../Functions/DatabaseFunctions/Notes';
import { StyleSheet, TouchableOpacity } from 'react-native';
import UserAvatar from 'react-native-user-avatar';
import Markdown from 'react-native-markdown-display';
import { EventKind } from '../../lib/nostr/Events';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { RelayPoolContext } from '../../Contexts/RelayPoolContext';
import { storeRelay } from '../../Functions/DatabaseFunctions/Relays';
import { AppContext } from '../../Contexts/AppContext';
import { showMessage } from 'react-native-flash-message';
import { t } from 'i18next';
import { getReplyEventId } from '../../Functions/RelayFunctions/Events';
import moment from 'moment';
import { populateRelay } from '../../Functions/RelayFunctions';

interface NoteCardProps {
  note: Note;
}

export const NoteCard: React.FC<NoteCardProps> = ({ note }) => {
  const theme = useTheme();
  const { relayPool, setRelayPool, publicKey } = useContext(RelayPoolContext);
  const { database, setPage, page } = useContext(AppContext);
  const [relayAdded, setRelayAdded] = useState<boolean>(
    Object.keys(relayPool?.relays ?? {}).includes(note.content),
  );

  const textNote: () => JSX.Element = () => {
    return (
      <>
        <Layout style={styles.profile} level='2'>
          <TouchableOpacity onPress={onPressUser}>
            <UserAvatar
              name={note.name && note.name !== '' ? note.name : note.pubkey}
              src={note.picture}
              size={38}
              textColor={theme['text-basic-color']}
            />
          </TouchableOpacity>
        </Layout>
        <Layout style={styles.contentNoAction} level='2'>
          <Layout style={styles.titleText}>
            <TouchableOpacity onPress={onPressUser}>
              <Layout style={styles.pubkey}>
                <Text appearance='hint'>
                  {note.name}
                  {note.name && ' - '}
                  {`${note.pubkey.slice(0, 6)}...${note.pubkey.slice(-6)}`}
                </Text>
              </Layout>
            </TouchableOpacity>
            <Layout style={styles.tags}>
              {getReplyEventId(note) && (
                <Icon name='comment-dots' size={16} color={theme['text-basic-color']} solid />
              )}
            </Layout>
          </Layout>
          <Layout style={styles.text}>
            <Markdown style={markdownStyle}>{note.content}</Markdown>
          </Layout>
          <Layout style={styles.footer}>
            <Text appearance='hint'>{moment.unix(note.created_at).format('DD-MM-YYYY hh:mm')}</Text>
          </Layout>
        </Layout>
      </>
    );
  };

  const relayNote: () => JSX.Element = () => {
    const relayName = note.content.split('wss://')[1].split('/')[0];

    const addRelay: () => void = () => {
      if (relayPool) {
        relayPool.add(note.content);
        setRelayPool(relayPool);
        storeRelay({ url: note.content }, database);
        populateRelay(relayPool, database, publicKey)
        showMessage({
          message: t('alerts.relayAdded'),
          description: note.content,
          type: 'success',
        });
        setRelayAdded(true);
      }
    };

    return (
      <>
        <Layout style={styles.profile} level='2'>
          <Icon name='server' size={30} color={theme['text-basic-color']} solid />
        </Layout>
        <Layout style={styles.content} level='2'>
          <Text appearance='hint'>{note.name}</Text>
          <Text>{relayName}</Text>
        </Layout>
        <Layout style={styles.actions} level='2'>
          {!relayAdded && (
            <Button
              status='success'
              onPress={addRelay}
              accessoryLeft={
                <Icon name='plus-circle' size={16} color={theme['text-basic-color']} solid />
              }
            />
          )}
        </Layout>
      </>
    );
  };

  const onPressUser: () => void = () => {
    setPage(`${page}%profile#${note.pubkey}`);
  };

  const styles = StyleSheet.create({
    layout: {
      flexDirection: 'row',
      backgroundColor: 'transparent',
    },
    profile: {
      flex: 1,
      width: 38,
      alignItems: 'center',
      backgroundColor: 'transparent',
    },
    content: {
      flex: 4,
      backgroundColor: 'transparent',
      paddingLeft: 16,
      paddingRight: 16,
    },
    contentNoAction: {
      flex: 5,
      backgroundColor: 'transparent',
      paddingLeft: 16,
      paddingRight: 16,
    },
    actions: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    pubkey: {
      backgroundColor: 'transparent',
    },
    footer: {
      backgroundColor: 'transparent',
    },
    tags: {
      backgroundColor: 'transparent',
      marginLeft: 12,
    },
    titleText: {
      backgroundColor: 'transparent',
      flexDirection: 'row',
    },
    text: {
      backgroundColor: 'transparent',
      paddingRight: 10,
    },
  });

  const markdownStyle = {
    text: {
      color: theme['text-basic-color'],
    },
    tr: {
      borderColor: theme['border-primary-color-5'],
    },
    table: {
      borderColor: theme['border-primary-color-5'],
    },
    blocklink: {
      borderColor: theme['border-primary-color-5'],
    },
    hr: {
      backgroundColor: theme['background-basic-color-3'],
    },
    blockquote: {
      backgroundColor: theme['background-basic-color-3'],
      borderColor: theme['border-primary-color-5'],
      color: theme['text-basic-color'],
    },
    code_inline: {
      borderColor: theme['border-primary-color-5'],
      backgroundColor: theme['background-basic-color-3'],
      color: theme['text-basic-color'],
    },
    code_block: {
      borderColor: theme['border-primary-color-5'],
      backgroundColor: theme['background-basic-color-3'],
      color: theme['text-basic-color'],
    },
    fence: {
      borderColor: theme['border-primary-color-5'],
      backgroundColor: theme['background-basic-color-3'],
      color: theme['text-basic-color'],
    },
  };

  return (
    note && (
      <Layout style={styles.layout} level='2'>
        {note.kind === EventKind.recommendServer ? relayNote() : textNote()}
      </Layout>
    )
  );
};

export default NoteCard;
