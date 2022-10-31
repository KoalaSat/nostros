import React, { useContext } from 'react'
import { Layout } from '@ui-kitten/components'
import { StyleSheet } from 'react-native'
import { AppContext } from '../../Contexts/AppContext'
import HomePage from '../HomePage'
import ProfilePage from '../ProfilePage'
import NavigationBar from '../NavigationBar'
import SendPage from '../SendPage'
import ContactsPage from '../ContactsPage'
import NotePage from '../NotePage'
import LandingPage from '../LandingPage'
import ConfigPage from '../ConfigPage'

export const MainLayout: React.FC = () => {
  const { page } = useContext(AppContext)

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
  })

  const pagination: { [pageName: string]: JSX.Element } = {
    landing: <LandingPage />,
    home: <HomePage />,
    send: <SendPage />,
    profile: <ProfilePage />,
    contacts: <ContactsPage />,
    note: <NotePage />,
    config: <ConfigPage />,
  }

  const breadcrump: string[] = page.split('%')
  const pageToDisplay: string = breadcrump[breadcrump.length - 1].split('#')[0]

  const view: () => JSX.Element = () => {
    if (page === '') {
      return <Layout style={styles.container} level='4' />
    } else if (page === 'landing') {
      return (
        <Layout style={styles.container} level='4'>
          <LandingPage />
        </Layout>
      )
    } else {
      return (
        <>
          <Layout style={styles.container} level='4'>
            {pagination[pageToDisplay]}
          </Layout>
          <NavigationBar />
        </>
      )
    }
  }

  return <>{view()}</>
}

export default MainLayout
