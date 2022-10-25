import React, { useContext, useEffect, useState } from 'react';
import Relay from '../lib/nostr/Relay';
import { Event, EventKind } from '../lib/nostr/Events';
import RelayPool from '../lib/nostr/RelayPool/intex';
import { AppContext } from './AppContext';
import { storeEvent } from '../Functions/DatabaseFunctions/Events';
import { getRelays, Relay as RelayEntity, storeRelay } from '../Functions/DatabaseFunctions/Relays';
import { showMessage } from 'react-native-flash-message';
import EncryptedStorage from 'react-native-encrypted-storage';
import { getPublickey } from '../lib/nostr/Bip';

export interface RelayPoolContextProps {
  relayPool?: RelayPool;
  setRelayPool: (relayPool: RelayPool) => void;
  publicKey?: string;
  setPublicKey: (privateKey: string) => void;
  privateKey?: string;
  setPrivateKey: (privateKey: string) => void;
  lastEventId?: string;
  setLastEventId: (lastEventId: string) => void;
}

export interface RelayPoolContextProviderProps {
  children: React.ReactNode;
}

export const initialRelayPoolContext: RelayPoolContextProps = {
  setPublicKey: () => {},
  setPrivateKey: () => {},
  setRelayPool: () => {},
  setLastEventId: () => {},
};

export const RelayPoolContextProvider = ({
  children,
}: RelayPoolContextProviderProps): JSX.Element => {
  const { database, loadingDb, setPage, page } = useContext(AppContext);

  const [publicKey, setPublicKey] = useState<string>();
  const [privateKey, setPrivateKey] = useState<string>();
  const [relayPool, setRelayPool] = useState<RelayPool>();
  const [lastEventId, setLastEventId] = useState<string>();
  const [lastPage, setLastPage] = useState<string>(page);

  const loadRelayPool: () => void = () => {
    if (database && privateKey) {
      getRelays(database).then((relays: RelayEntity[]) => {
        const initRelayPool = new RelayPool([], privateKey);
        if (relays.length > 0) {
          relays.forEach((relay) => {
            initRelayPool.add(relay.url);
          });
        } else {
          ['wss://relay.damus.io'].forEach((relayUrl) => {
            initRelayPool.add(relayUrl);
            storeRelay({ url: relayUrl }, database);
          });
        }

        initRelayPool?.on(
          'notice',
          'RelayPoolContextProvider',
          (relay: Relay, _subId?: string, event?: Event) => {
            showMessage({
              message: relay.url,
              description: event?.content ?? '',
              type: 'info',
            });
          },
        );
        initRelayPool?.on(
          'event',
          'RelayPoolContextProvider',
          (relay: Relay, _subId?: string, event?: Event) => {
            console.log('RELAYPOOL EVENT =======>', relay.url, event);
            if (database && event?.id && event.kind !== EventKind.petNames) {
              storeEvent(event, database).finally(() => setLastEventId(event.id));
            }
          },
        );
        setRelayPool(initRelayPool);
      });
    }
  };

  useEffect(() => {
    if (privateKey) {
      setPublicKey(getPublickey(privateKey));
    }
  }, [privateKey]);

  useEffect(() => {
    if (privateKey !== '' && !loadingDb && !relayPool) {
      loadRelayPool();
    }
  }, [privateKey, loadingDb]);

  useEffect(() => {
    if (relayPool && lastPage !== page) {
      relayPool.unsubscribeAll();
      relayPool.removeOn('event', lastPage);
      setLastPage(page);
    }
  }, [page]);

  useEffect(() => {
    EncryptedStorage.getItem('privateKey').then((result) => {
      if (result && result !== '') {
        loadRelayPool();
        setPage('home');
        setPrivateKey(result);
      } else {
        setPrivateKey('');
        setPage('landing');
      }
    });
  }, []);

  return (
    <RelayPoolContext.Provider
      value={{
        relayPool,
        setRelayPool,
        publicKey,
        setPublicKey,
        privateKey,
        setPrivateKey,
        lastEventId,
        setLastEventId,
      }}
    >
      {children}
    </RelayPoolContext.Provider>
  );
};

export const RelayPoolContext = React.createContext(initialRelayPoolContext);
