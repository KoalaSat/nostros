import { Button, Card, Input, Layout, List, Modal, useTheme } from '@ui-kitten/components';
import React, { useContext, useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import Fab from 'rn-fab';
import { AppContext } from '../../Contexts/AppContext';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { Event, EventKind } from '../../lib/nostr/Events';
import { useTranslation } from 'react-i18next';
import {
  addContact,
  getUsers,
  insertUserContact,
  User,
} from '../../Functions/DatabaseFunctions/Users';
import UserCard from '../UserCard';
import { RelayPoolContext } from '../../Contexts/RelayPoolContext';
import Relay from '../../lib/nostr/Relay';
import { populatePets } from '../../Functions/RelayFunctions/Users';

export const ContactsPage: React.FC = () => {
  const { database } = useContext(AppContext);
  const { relayPool, publicKey, lastEventId, setLastEventId } = useContext(RelayPoolContext);
  const theme = useTheme();
  const [users, setUsers] = useState<User[]>([]);
  const [showAddContact, setShowAddContant] = useState<boolean>(false);
  const [contactInput, setContactInput] = useState<string>();
  const { t } = useTranslation('common');

  useEffect(() => {
    if (database && publicKey) {
      getUsers(database, { contacts: true }).then((results) => {
        if (results) {
          setUsers(results);
          relayPool?.subscribe('main-channel', {
            kinds: [EventKind.petNames],
            authors: [publicKey],
          });
        }
      });
    }
  }, [lastEventId]);

  useEffect(() => {
    relayPool?.on('event', 'contacts', (relay: Relay, _subId?: string, event?: Event) => {
      console.log('RELAYPOOL EVENT =======>', relay.url, event);
      if (database && event?.id && event.kind === EventKind.petNames) {
        insertUserContact(event, database).finally(() => setLastEventId(event?.id ?? ''));
      }
    });
  }, []);

  const onPressAddContact: () => void = () => {
    if (contactInput && relayPool && database && publicKey) {
      addContact(contactInput, database).then(() => {
        populatePets(relayPool, database, publicKey);
        setShowAddContant(false);
      });
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    actionContainer: {
      marginTop: 30,
      paddingLeft: 32,
      paddingRight: 32,
    },
    button: {
      marginTop: 30,
    },
    icon: {
      width: 32,
      height: 32,
    },
    modal: {
      marginTop: -120,
      paddingLeft: 32,
      paddingRight: 32,
    },
    backdrop: {
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
  });

  return (
    <>
      <Layout style={styles.container} level='3'>
        <List data={users} renderItem={(item) => <UserCard user={item.item} />} />
      </Layout>
      <Modal
        style={styles.modal}
        visible={showAddContact}
        backdropStyle={styles.backdrop}
        onBackdropPress={() => setShowAddContant(false)}
      >
        <Card disabled={true}>
          <Layout style={styles.actionContainer}>
            <Layout>
              <Input
                placeholder={t('contactsPage.addContact.placeholder')}
                value={contactInput}
                onChangeText={setContactInput}
                size='large'
              />
            </Layout>
            <Layout style={styles.button}>
              <Button onPress={onPressAddContact}>{t('contactsPage.addContact.add')}</Button>
            </Layout>
          </Layout>
        </Card>
      </Modal>
      <Fab
        actions={[
          {
            icon: <Icon name='plus' size={20} color={theme['text-basic-color']} />,
            name: 'btn_plus',
            color: theme['color-primary-400'],
          },
          {
            icon: <Icon name='user-plus' size={20} color={theme['text-basic-color']} solid />,
            name: 'addContact',
            color: theme['color-warning-500'],
          },
        ]}
        style={{ right: 40, bottom: 80 }}
        rotation={'45deg'}
        onPress={(name: string) => {
          if (name === 'addContact') {
            setShowAddContant(true);
          }
        }}
      />
    </>
  );
};

export default ContactsPage;
