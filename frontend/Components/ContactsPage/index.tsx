import { Button, Card, Input, Layout, Modal, useTheme } from '@ui-kitten/components';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet } from 'react-native';
import ActionButton from 'react-native-action-button';
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
import { populatePets, tagToUser } from '../../Functions/RelayFunctions/Users';

export const ContactsPage: React.FC = () => {
  const { database } = useContext(AppContext);
  const { relayPool, publicKey, lastEventId, setLastEventId } = useContext(RelayPoolContext);
  const theme = useTheme();
  const [users, setUsers] = useState<User[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddContact, setShowAddContant] = useState<boolean>(false);
  const [contactInput, setContactInput] = useState<string>();
  const { t } = useTranslation('common');

  useEffect(() => {
    if (database && publicKey) {
      getUsers(database, { contacts: true }).then((results) => {
        if (results) setUsers(results);
      });
    }
  }, [lastEventId]);

  useEffect(() => {
    subscribeContacts();
  }, []);

  const subscribeContacts: () => Promise<void> = async () => {
    return await new Promise<void>((resolve, _reject) => {
      relayPool?.unsubscribeAll();
      relayPool?.on('event', 'contacts', (relay: Relay, _subId?: string, event?: Event) => {
        console.log('CONTACTS PAGE EVENT =======>', relay.url, event);
        if (database && event?.id && event.kind === EventKind.petNames) {
          insertUserContact(event, database).finally(() => setLastEventId(event?.id ?? ''));
          relayPool?.subscribe('main-channel', {
            kinds: [EventKind.meta],
            authors: event.tags.map((tag) => tagToUser(tag).id),
          });
          relayPool?.removeOn('event', 'contacts');
        }
      });
      if (publicKey) {
        relayPool?.subscribe('main-channel', {
          kinds: [EventKind.petNames],
          authors: [publicKey],
        });
      }
      resolve();
    });
  };

  const onPressAddContact: () => void = () => {
    if (contactInput && relayPool && database && publicKey) {
      addContact(contactInput, database).then(() => {
        populatePets(relayPool, database, publicKey);
        setShowAddContant(false);
      });
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    relayPool?.unsubscribeAll();
    subscribeContacts().finally(() => setRefreshing(false));
  }, []);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    actionContainer: {
      marginTop: 30,
      marginBottom: 30,
      paddingLeft: 12,
      paddingRight: 12,
    },
    button: {
      marginTop: 30,
    },
    icon: {
      width: 32,
      height: 32,
    },
    modal: {
      paddingLeft: 32,
      paddingRight: 32,
      width: '100%',
    },
    backdrop: {
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
  });

  return (
    <>
      <Layout style={styles.container} level='3'>
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {users.map((user) => (
            <UserCard user={user} key={user.id} />
          ))}
        </ScrollView>
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
      {/* <ActionButton
        buttonColor={theme['color-primary-400']}
        useNativeFeedback={true}
        fixNativeFeedbackRadius={true}
      >
        <ActionButton.Item
          buttonColor={theme['color-warning-500']}
          title={t('contactsPage.add')}
          onPress={() => setShowAddContant(true)}
        >
          <Icon name='user-plus' size={30} color={theme['text-basic-color']} solid />
        </ActionButton.Item>
      </ActionButton> */}
    </>
  );
};

export default ContactsPage;
