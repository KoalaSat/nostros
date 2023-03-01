import { NativeModules } from 'react-native'
const { DatabaseModule } = NativeModules

interface DatabaseModuleInterface {
  updateConversationRead: (conversationId: string) => void
  updateAllDirectMessagesRead: () => void
  updateUserContact: (userId: string, contact: boolean, callback: () => void) => void
  updateUserBlock: (userId: string, blocked: boolean, callback: () => void) => void
  updateUserMutesGroups: (userId: string, muted: boolean, callback: () => void) => void
  updateAllGroupMessagesRead: () => void
  updateGroupRead: (groupId: string) => void
  deleteGroup: (groupId: string) => void
  addGroup: (groupId: string, name: string, pubkey: string, callback: () => void) => void
  activateGroup: (groupId: string) => void
  desactivateResilientRelays: () => void
  activateResilientRelay: (url: string) => void
  createResilientRelay: (url: string) => void
  addUser: (id: string, callback: () => void) => void
}

export default DatabaseModule as DatabaseModuleInterface
