import RelayPool from '../../lib/nostr/RelayPool/intex'
import { QuickSQLiteConnection } from 'react-native-quick-sqlite'
import { populatePets, populateProfile } from './Users'

export const populateRelay: (
  relayPool: RelayPool,
  database: QuickSQLiteConnection,
  publicKey: string,
) => void = (relayPool, database, publicKey) => {
  populateProfile(relayPool, database, publicKey)
  populatePets(relayPool, database, publicKey)
}
