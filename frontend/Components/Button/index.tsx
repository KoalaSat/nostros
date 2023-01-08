import React, { ReactElement } from 'react'
import { View } from 'react-native'
import { Button as UIKButton, ButtonProps as UIKButtonProps, Spinner } from '@ui-kitten/components'

interface ButtonProps extends UIKButtonProps {
  /** Indicates if the button is in "Loading" mode, which will disable it. */
  loading?: boolean
}

const LoadingIndicator = (): ReactElement => (
  <View>
    <Spinner size='small' />
  </View>
)

/**
 * Extension of the UI-Kitten button, with more features.
 * @param param0 
 * @returns 
 */
export const Button: React.FC<ButtonProps> = ({
  disabled,
  loading = false,
  children,
  accessoryLeft,
  ...otherProps
}) => {
  console.log('Is loading', loading)
  return (
    <UIKButton
      disabled={disabled ?? loading}
      accessoryLeft={loading ? LoadingIndicator : accessoryLeft}
      {...otherProps}
    >
      {children}
    </UIKButton>
  )
}
