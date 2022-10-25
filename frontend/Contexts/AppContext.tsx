import React, { useEffect, useState } from 'react';
import { SQLiteDatabase } from 'react-native-sqlite-storage';
import { initDatabase } from '../Functions/DatabaseFunctions';
import { createInitDatabase } from '../Functions/DatabaseFunctions/Migrations';
import FlashMessage from 'react-native-flash-message';
import EncryptedStorage from 'react-native-encrypted-storage';

export interface AppContextProps {
  page: string;
  setPage: (page: string) => void;
  loadingDb: boolean;
  database: SQLiteDatabase | null;
}

export interface AppContextProviderProps {
  children: React.ReactNode;
}

export const initialAppContext: AppContextProps = {
  page: '',
  setPage: () => {},
  loadingDb: true,
  database: null,
};

export const AppContextProvider = ({ children }: AppContextProviderProps): JSX.Element => {
  const [page, setPage] = useState<string>(initialAppContext.page);
  const [database, setDatabase] = useState<SQLiteDatabase | null>(null);
  const [loadingDb, setLoadingDb] = useState<boolean>(initialAppContext.loadingDb);

  useEffect(() => {
    EncryptedStorage.getItem('privateKey').then((result) => {
      const db = initDatabase();
      setDatabase(db);
      if (!result || result === '') {
        createInitDatabase(db).then(() => {
          setLoadingDb(false);
        });
      }
    });
  }, []);

  return (
    <AppContext.Provider
      value={{
        page,
        setPage,
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
