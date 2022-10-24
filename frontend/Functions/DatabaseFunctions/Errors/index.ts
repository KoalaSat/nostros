import { SQLError, Transaction } from 'react-native-sqlite-storage';

export const errorCallback: (
  query: string,
  reject?: (reason?: any) => void,
) => (transaction: Transaction, error: SQLError) => void = (query, reject) => {
  const callback: (transaction: Transaction, error: SQLError) => void = (_transaction, error) => {
    console.log('SQL ERROR =========>', query, error);
    if (reject) reject(error);
  };

  return callback;
};
