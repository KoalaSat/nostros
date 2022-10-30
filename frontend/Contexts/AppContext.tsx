import React, { useEffect, useState } from 'react';
import { SQLiteDatabase } from 'react-native-sqlite-storage';
import { initDatabase } from '../Functions/DatabaseFunctions';
import { createInitDatabase } from '../Functions/DatabaseFunctions/Migrations';
import FlashMessage from 'react-native-flash-message';
// import EncryptedStorage from 'react-native-encrypted-storage';

export interface AppContextProps {
  page: string;
  goToPage: (path: string, root?: boolean) => void;
  goBack: () => void;
  init: () => void;
  loadingDb: boolean;
  database: SQLiteDatabase | null;
}

export interface AppContextProviderProps {
  children: React.ReactNode;
}

export const initialAppContext: AppContextProps = {
  page: '',
  init: () => {},
  goToPage: () => {},
  goBack: () => {},
  loadingDb: true,
  database: null,
};

export const AppContextProvider = ({ children }: AppContextProviderProps): JSX.Element => {
  const [page, setPage] = useState<string>(initialAppContext.page);
  const [database, setDatabase] = useState<SQLiteDatabase | null>(null);
  const [loadingDb, setLoadingDb] = useState<boolean>(initialAppContext.loadingDb);

  const init: () => void = () => {
    const result = '';
    // EncryptedStorage.getItem('privateKey').then((result) => {
      const db = initDatabase();
      setDatabase(db);
      if (!result || result === '') {
        createInitDatabase(db).then(() => {
          setLoadingDb(false);
        });
      } else {
        setLoadingDb(false);
      }
    // });
  };

  useEffect(init, []);

  const goToPage: (path: string, root?: boolean) => void = (path, root) => {
    if (page !== '' && !root) {
      setPage(`${page}%${path}`);
    } else {
      setPage(path);
    }
  };

  const goBack: () => void = () => {
    const breadcrump = page.split('%');
    setPage(breadcrump.slice(0, -1).join('%') || 'home');
  };

  return (
    <AppContext.Provider
      value={{
        page,
        init,
        goToPage,
        goBack,
        loadingDb,
        database,
      }}
    >
      {children}
      <FlashMessage position='top' />
    </AppContext.Provider>
  );
};

export const AppContext = React.createContext(initialAppContext);
