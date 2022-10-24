import React, { useContext, useEffect, useState } from 'react';
import { Button, Input, Layout, Text } from '@ui-kitten/components';
import { StyleSheet } from 'react-native';
import Loading from '../Loading';
import { RelayPoolContext } from '../../Contexts/RelayPoolContext';
import { useTranslation } from 'react-i18next';
import { tagToUser } from '../../Functions/RelayFunctions/Users';
import Relay, { RelayFilters } from '../../lib/nostr/Relay';
import { Event, EventKind } from '../../lib/nostr/Events';
import { AppContext } from '../../Contexts/AppContext';
import { getUsers, insertUserContact } from '../../Functions/DatabaseFunctions/Users';
import { getPublickey } from '../../lib/nostr/Bip';
import EncryptedStorage from 'react-native-encrypted-storage';
import { SQLiteDatabase } from 'react-native-sqlite-storage';

export const LandingPage: React.FC = () => {
  const { privateKey, setPrivateKey, publicKey, setPublicKey, relayPool, initRelays } =
    useContext(RelayPoolContext);
  const { database, setPage, runMigrations, loadingDb } = useContext(AppContext);
  const { t } = useTranslation('common');
  const [init, setInit] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [status, setStatus] = useState<number>(0);
  const [totalPets, setTotalPets] = useState<number>();
  const [loadedUsers, setLoadedUsers] = useState<number>(0);
  const [usersReady, setUsersReady] = useState<boolean>(false);
  const styles = StyleSheet.create({
    tab: {
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
    },
    svg: {
      height: 340,
      width: 340,
    },
    title: {
      marginTop: -40,
      marginBottom: -20,
      fontFamily: 'SpaceGrotesk-Bold',
    },
    input: {
      marginVertical: 2,
      padding: 32,
    },
  });

  useEffect(() => { // #1 STEP
    if (init) {
      EncryptedStorage.getItem('privateKey').then((result) => {
        if (result && result !== '') {
          setPrivateKey(result);
          setPublicKey(getPublickey(result));
          setUsersReady(true);
        } if (!loadingDb) {
          setInit(false);
        } else {
          runMigrations();
        }
      });
    }
  }, [init, relayPool, loadingDb]);

  useEffect(() => {
    if (usersReady && relayPool) {
      initRelays()
      setPage('home');
    }
  }, [usersReady, relayPool]);

  useEffect(() => {
    if (loading && publicKey !== '') {
      initEvents();
    }
  }, [loading, publicKey]);

  useEffect(() => {
    if (loading && loadedUsers) {
      loadUsers();
    }
  }, [loading, totalPets, loadedUsers]);

  const initEvents: () => void = () => {
    relayPool?.on('event', 'landing', (_relay: Relay, _subId?: string, event?: Event) => {
      if (database && event) {
        if (event.kind === EventKind.petNames) {
            loadPets(event);
        } else {     
          if (event.kind === EventKind.meta && event.pubkey !== publicKey) {
            setLoadedUsers((prev) => prev + 1)
          }
        }
      }
    });
    relayPool?.subscribe('main-channel', {
      kinds: [EventKind.meta, EventKind.petNames],
      authors: [publicKey],
    });
  };

  const loadPets: (event: Event) => void = (event) => {
    if (database) {
      setTotalPets(event.tags.length);
      insertUserContact(event, database).then(() => {
        relayPool?.subscribe('main-channel', {
          kinds: [EventKind.meta],
          authors: event.tags.map((tag) => tagToUser(tag).id),
        });
      })
      setStatus(2);
    }
  };

  const requestUsers: (database: SQLiteDatabase) => void = () => {
    if (database && status < 3) {
      setUsersReady(true);
      getUsers(database, { exludeIds: [publicKey], contacts: true }).then((users) => {
        const message: RelayFilters = {
          kinds: [EventKind.textNote, EventKind.recommendServer],
          authors: [publicKey, ...users.map((user) => user.id)],
          limit: 15,
        };
        relayPool?.subscribe('main-channel', message);
        setStatus(3);
      })
    }
  }

  const loadUsers: () => void = () => {
    if (database) {
      getUsers(database, { exludeIds: [publicKey], contacts: true }).then((users) => {
        if (loadedUsers === totalPets) {
          requestUsers(database)
        }
      });
      setTimeout(() => requestUsers(database), 10000);
    }
  };

  const onPress: () => void = () => {
    setLoading(true);
    setPublicKey(getPublickey(privateKey));
    setStatus(1);
    EncryptedStorage.setItem('privateKey', privateKey);
  };

  const statusName: { [status: number]: string } = {
    0: t('landing.connect'),
    1: t('landing.connecting'),
    2: `${t('landing.loadingContacts')} ${loadedUsers}/${totalPets ?? 0}`,
    3: t('landing.loadingTimeline'),
  };

  return (
    <Layout style={styles.tab}>
      <Layout style={styles.svg}>
        <Loading />
      </Layout>
      <Text style={styles.title} category='h1'>
        NOSTROS
      </Text>
      {!init && (
        <>
          <Input
            style={styles.input}
            size='medium'
            label={t('landing.privateKey')}
            secureTextEntry={true}
            onChangeText={setPrivateKey}
            value={privateKey}
            disabled={loading}
          />
          <Button onPress={onPress} disabled={loading}>
            {statusName[status]}
          </Button>
        </>
      )}
    </Layout>
  );
};

export default LandingPage;
