import React, { useContext, useState } from 'react'
import { RelayPoolContext } from '../../Contexts/RelayPoolContext'
import { StyleSheet, View } from 'react-native'
import { useFocusEffect, useTheme } from '@react-navigation/native'
import FirstStep from './FirstStep'
import SecondStep from './SecondStep'
import ThirdStep from './ThirdStep'
import RBSheet from 'react-native-raw-bottom-sheet'
import { Button, Text } from 'react-native-paper'
import { useTranslation } from 'react-i18next'
import { UserContext } from '../../Contexts/UserContext'

export const ProfileLoadPage: React.FC = () => {
  const theme = useTheme()
  const { t } = useTranslation('common')
  const { setUserState } = useContext(UserContext)
  const { relayPool } = useContext(RelayPoolContext)
  const [step, setStep] = useState<number>(0)
  const bottomSkipRef = React.useRef<RBSheet>(null)

  useFocusEffect(
    React.useCallback(() => {
      return () => relayPool?.unsubscribe(['profile-load-meta', 'profile-load-contacts'])
    }, []),
  )

  const nextStep: () => void = () => {
    setStep((prev) => prev + 1)
  }

  const skip: () => void = () => {
    bottomSkipRef.current?.open()
  }

  const bottomSheetStyles = React.useMemo(() => {
    return {
      container: {
        backgroundColor: theme.colors.background,
        paddingTop: 16,
        paddingRight: 16,
        paddingBottom: 32,
        paddingLeft: 16,
        borderTopRightRadius: 28,
        borderTopLeftRadius: 28,
        height: 'auto',
      },
    }
  }, [])

  return (
    <View style={styles.container}>
      {step === 0 && <FirstStep nextStep={nextStep} skip={skip} />}
      {step === 1 && <SecondStep nextStep={nextStep} skip={skip} />}
      {step === 2 && <ThirdStep nextStep={nextStep} skip={skip} />}
      <RBSheet ref={bottomSkipRef} closeOnDragDown={true} customStyles={bottomSheetStyles}>
        <View style={styles.drawerParagraph}>
          <Text variant='headlineSmall'>{t('profileLoadPage.skipTitle')}</Text>
        </View>
        <View style={styles.drawerParagraph}>
          <Text variant='bodyMedium' style={{ color: theme.colors.onSurfaceVariant }}>
            {t('profileLoadPage.skipDescription')}
          </Text>
        </View>
        <View style={styles.buttons}>
          <Button style={styles.button} mode='outlined' onPress={() => setUserState('ready')}>
            {t('profileLoadPage.skip')}
          </Button>
          <Button mode='contained' onPress={() => bottomSkipRef.current?.close()}>
            {t('profileLoadPage.continueLogin')}
          </Button>
        </View>
      </RBSheet>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    justifyContent: 'space-between',
    height: '100%',
  },
  drawerParagraph: {
    marginBottom: 16,
  },
  buttons: {
    justifyContent: 'space-between',
  },
  button: {
    marginBottom: 16,
  },
})

export default ProfileLoadPage
