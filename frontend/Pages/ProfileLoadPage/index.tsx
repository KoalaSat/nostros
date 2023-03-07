import React, { useContext, useState } from 'react'
import { RelayPoolContext } from '../../Contexts/RelayPoolContext'
import { StyleSheet, View } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import FirstStep from './FirstStep'
import SecondStep from './SecondStep'

export const ProfileLoadPage: React.FC = () => {
  const { relayPool } = useContext(RelayPoolContext)
  const [step, setStep] = useState<number>(0)

  useFocusEffect(
    React.useCallback(() => {
      return () =>
        relayPool?.unsubscribe([
          'profile-load-meta',
          'profile-load-contacts',
          'profile-load-others',
          'profile-load-notes',
        ])
    }, []),
  )

  const nextStep: () => void = () => {
    setStep((prev) => prev + 1)
  }

  return (
    <View style={styles.container}>
      {step === 0 && <FirstStep nextStep={nextStep} />}
      {step === 1 && <SecondStep nextStep={nextStep} />}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    justifyContent: 'space-between',
    height: '100%',
  },
})

export default ProfileLoadPage
