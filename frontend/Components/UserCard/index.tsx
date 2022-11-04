import React, { useContext } from 'react'
import { Card, Layout, Text } from '@ui-kitten/components'
import { User } from '../../Functions/DatabaseFunctions/Users'
import { StyleSheet } from 'react-native'
import { AppContext } from '../../Contexts/AppContext'
import Avatar from '../Avatar'

interface NoteCardProps {
  user: User
}

export const NoteCard: React.FC<NoteCardProps> = ({ user }) => {
  const { goToPage } = useContext(AppContext)

  const styles = StyleSheet.create({
    layout: {
      flex: 1,
      flexDirection: 'row',
      backgroundColor: 'transparent',
    },
    profile: {
      flex: 1,
      width: 38,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'transparent',
    },
    content: {
      flex: 5,
      backgroundColor: 'transparent',
    },
    actions: {
      flex: 1,
      backgroundColor: 'transparent',
    },
  })

  return (
    user && (
      <Card onPress={() => goToPage(`profile#${user.id}`)}>
        <Layout style={styles.layout} level='2'>
          <Layout style={styles.profile}>
            <Avatar name={user.name} src={user.picture} pubKey={user.id} />
          </Layout>
          <Layout style={styles.content} level='2'>
            <Text>{user.name}</Text>
            <Text appearance='hint'>{user.id}</Text>
          </Layout>
        </Layout>
      </Card>
    )
  )
}

export default NoteCard
