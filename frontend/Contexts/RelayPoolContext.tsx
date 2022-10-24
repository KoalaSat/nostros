import React, { useContext, useEffect, useState } from 'react';
import Relay from '../lib/nostr/Relay';
import { Event, EventKind } from '../lib/nostr/Events';
import RelayPool from '../lib/nostr/RelayPool/intex';
import { AppContext } from './AppContext';
import { storeEvent } from '../Functions/DatabaseFunctions/Events';
import { getRelays, Relay as RelayEntity, storeRelay } from '../Functions/DatabaseFunctions/Relays';
import { showMessage } from 'react-native-flash-message';

export interface RelayPoolContextProps {
  relayPool?: RelayPool;
  setRelayPool: (relayPool: RelayPool) => void;
  publicKey: string;
  setPublicKey: (privateKey: string) => void;
  privateKey: string;
  setPrivateKey: (privateKey: string) => void;
  lastEventId?: string;
  setLastEventId: (lastEventId: string) => void;
  loadingRelays: boolean;
  initRelays: () => void;
  loadRelays: () => void;
}

export interface RelayPoolContextProviderProps {
  children: React.ReactNode;
}

export const initialRelayPoolContext: RelayPoolContextProps = {
  publicKey: '',
  setPublicKey: () => {},
  privateKey: '',
  setPrivateKey: () => {},
  setRelayPool: () => {},
  setLastEventId: () => {},
  loadingRelays: true,
  initRelays: () => {},
  loadRelays: () => {},
};

export const RelayPoolContextProvider = ({
  children,
}: RelayPoolContextProviderProps): JSX.Element => {
  const { database, loadingDb } = useContext(AppContext);

  const [publicKey, setPublicKey] = useState<string>('');
  const [privateKey, setPrivateKey] = useState<string>('');
  const [relayPool, setRelayPool] = useState<RelayPool>();
  const [lastEventId, setLastEventId] = useState<string>();
  const [loadingRelays, setLoadingRelays] = useState<boolean>(true);

  const initRelays: () => void = () => {
    relayPool?.on(
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
    relayPool?.on(
      'event',
      'RelayPoolContextProvider',
      (relay: Relay, _subId?: string, event?: Event) => {
        console.log('RELAYPOOL EVENT =======>', relay.url, event);
        if (database && event?.id && event.kind !== EventKind.petNames) {
          storeEvent(event, database).finally(() => setLastEventId(event.id));
        }
      },
    );

    setLoadingRelays(false);
  };

  const loadRelays: () => void = () => {
    if (database) {
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
        setRelayPool(initRelayPool);
      })
    }
  }

  useEffect(() => {
    if (privateKey !== '' && !loadingDb && loadingRelays) {
      loadRelays()
    }
  }, [privateKey, loadingDb])

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
        loadingRelays,
        initRelays,
        loadRelays,
      }}
    >
      {children}
    </RelayPoolContext.Provider>
  );
};

export const RelayPoolContext = React.createContext(initialRelayPoolContext);
