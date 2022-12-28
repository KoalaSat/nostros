import React, { useContext } from 'react'
import { Layout, Text, useTheme } from '@ui-kitten/components'
import { Linking, StyleSheet, TouchableOpacity } from 'react-native'
import Loading from '../Loading'
import Logger from './Logger'
import Loader from './Loader'
import Icon from 'react-native-vector-icons/FontAwesome5'
import { RelayPoolContext } from '../../Contexts/RelayPoolContext'

export const LandingPage: React.FC = () => {
  const { publicKey } = useContext(RelayPoolContext)
  const theme = useTheme()

  const onPressQuestion: () => void = () => {
    Linking.openURL('https://usenostr.org')
  }

  const styles = StyleSheet.create({
    tab: {
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
    },
    info: {
      alignItems: 'flex-end',
      flexDirection: 'row',
      padding: 24,
      paddingBottom: -12,
    },
    svg: {
      height: 340,
      width: 340,
    },
    icon: {
      marginRight: 24,
    },
    title: {
      marginTop: -40,
      marginBottom: -20,
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 45,
    },
    action: {
      backgroundColor: 'transparent',
      marginTop: 30,
    },
  })

  return (
    <>
      <Layout style={styles.info}>
        <TouchableOpacity onPress={onPressQuestion}>
          <Icon name='question' style={styles.icon} size={24} color={theme['text-basic-color']} />
        </TouchableOpacity>
      </Layout>
      <Layout style={styles.tab}>
        <Layout style={styles.svg}>
          <Loading />
        </Layout>
        {!publicKey ? (
          <>
            <Text style={styles.title}>NOSTROS</Text>
            <Logger />
          </>
        ) : (
          <Loader />
        )}
      </Layout>
    </>
  )
}

export default LandingPage
