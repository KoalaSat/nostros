import { SQLiteDatabase } from 'react-native-sqlite-storage'
import RelayPool from '../../lib/nostr/RelayPool/intex'
import { populatePets, populateProfile } from './Users'

export const populateRelay: (
  relayPool: RelayPool,
  database: SQLiteDatabase,
  publicKey: string,
) => void = (relayPool, database, publicKey) => {
  populateProfile(relayPool, database, publicKey)
  populatePets(relayPool, database, publicKey)
}
