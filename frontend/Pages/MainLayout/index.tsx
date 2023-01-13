import React, { useContext } from 'react'
import { AppContext } from '../../Contexts/AppContext'
import { createDrawerNavigator } from '@react-navigation/drawer';
import { Appbar } from 'react-native-paper'

export const MainLayout: React.FC = () => {
  const { page } = useContext(AppContext)

  // const pagination: Record<string, JSX.Element> = {
  //   '': <Loading />,
  //   mentions: <MentionsPage />,
  //   landing: <LandingPage />,
  //   home: <HomePage />,
  //   send: <SendPage />,
  //   profile: <ProfilePage />,
  //   contacts: <ContactsPage />,
  //   note: <NotePage />,
  //   config: <ConfigPage />,
  //   relays: <RelaysPage />,
  //   messages: <DirectMessagesPage />,
  //   conversation: <ConversationPage />,
  // }

  const breadcrump: string[] = page.split('%')
  const pageToDisplay: string = breadcrump[breadcrump.length - 1].split('#')[0]

  const DrawerNavigator = createDrawerNavigator<{ Home: undefined }>();

  return (
    // <>
    //   {pagination[pageToDisplay]}
    //   {pageToDisplay === 'landing' ? <></> : <NavigationBar />}
    // </>
    <Appbar.Header>
      <Appbar.BackAction onPress={() => {}} />
      <Appbar.Content title="Title" />
      <Appbar.Action icon="calendar" onPress={() => {}} />
      <Appbar.Action icon="magnify" onPress={() => {}} />
    </Appbar.Header>
  )
}

export default MainLayout
