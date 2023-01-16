import React from 'react'
import { StyleSheet } from 'react-native'
import { Snackbar } from 'react-native-paper'

interface NostrosNotificationProps {
  children: React.ReactNode
  showNotification: string | undefined
  setShowNotification: (showNotification: string | undefined) => void
}

export const NostrosNotification: React.FC<NostrosNotificationProps> = ({
  children,
  showNotification,
  setShowNotification,
}) => {
  return (
    <Snackbar
      style={styles.snackbar}
      visible={showNotification !== undefined}
      duration={Snackbar.DURATION_SHORT}
      onIconPress={() => setShowNotification(undefined)}
      onDismiss={() => setShowNotification(undefined)}
    >
      {children}
    </Snackbar>
  )
}

const styles = StyleSheet.create({
  snackbar: {
    margin: 16,
    bottom: 70,
  },
})

export default NostrosNotification
