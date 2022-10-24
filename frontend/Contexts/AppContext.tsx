import React, { useEffect, useState } from 'react';
import { SQLiteDatabase } from 'react-native-sqlite-storage';
import { initDatabase } from '../Functions/DatabaseFunctions';
import { createInitDatabase } from '../Functions/DatabaseFunctions/Migrations';
import FlashMessage from 'react-native-flash-message';

export interface AppContextProps {
  page: string;
  setPage: (page: string) => void;
  runMigrations: () => void;
  loadingDb: boolean;
  database: SQLiteDatabase | null;
}

export interface AppContextProviderProps {
  children: React.ReactNode;
}

export const initialAppContext: AppContextProps = {
  page: 'landing',
  setPage: () => {},
  runMigrations: () => {},
  loadingDb: true,
  database: null,
};

export const AppContextProvider = ({ children }: AppContextProviderProps): JSX.Element => {
  const [page, setPage] = useState<string>(initialAppContext.page);
  const [database, setDatabase] = useState<SQLiteDatabase | null>(null);
  const [loadingDb, setLoadingDb] = useState<boolean>(initialAppContext.loadingDb);

  const runMigrations: () => void = async () => {
    const db = initDatabase()
    setDatabase(db)
    createInitDatabase(db).then(() => {
      setLoadingDb(false);
    });
  };

  return (
    <AppContext.Provider
      value={{
        page,
        setPage,
        loadingDb,
        database,
        runMigrations,
      }}
    >
      {children}
      <FlashMessage position='top' />
    </AppContext.Provider>
  );
};

export const AppContext = React.createContext(initialAppContext);
