import React from 'react'
import { Layout, Text, useTheme } from '@ui-kitten/components'
import { Linking, StyleSheet, TouchableOpacity } from 'react-native'
import Loading from '../Loading'
import Logger from './Logger'
import Icon from 'react-native-vector-icons/FontAwesome5'

export const LandingPage: React.FC = () => {
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
      padding: 12,
      paddingBottom: -12,
    },
    svg: {
      height: 340,
      width: 340,
    },
    title: {
      marginTop: -40,
      marginBottom: -20,
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 45,
    },
  })

  return (
    <>
      <Layout style={styles.info}>
        <TouchableOpacity onPress={onPressQuestion}>
          <Icon name='question' size={24} color={theme['text-basic-color']} />
        </TouchableOpacity>
      </Layout>
      <Layout style={styles.tab}>
        <Layout style={styles.svg}>
          <Loading />
        </Layout>
        <Text style={styles.title}>NOSTROS</Text>
        <Logger />
      </Layout>
    </>
  )
}

export default LandingPage
