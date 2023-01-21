import * as React from 'react'
import { StyleSheet, View } from 'react-native'
import { Text } from 'react-native-paper'
import { nostrosLogoSvg } from '../../Constants/Theme'
import { SvgXml } from 'react-native-svg'

interface LogoProps {
  onlyIcon?: boolean
  size?: 'big' | 'large' | 'medium' | 'small'
}

export const Logo: React.FC<LogoProps> = ({ onlyIcon = false, size = 'small' }) => {
  const logoHeight = {
    small: 30,
    medium: 90,
    large: 120,
    big: 280,
  }
  return (
    <View style={styles.container}>
      <SvgXml height={logoHeight[size]} xml={nostrosLogoSvg} />
      {!onlyIcon && (
        <Text
          style={[styles.text, { paddingLeft: size === 'small' ? 0 : 16 }]}
          variant={size === 'small' ? 'headlineSmall' : 'displayMedium'}
        >
          NOSTROS
        </Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    fontFamily: 'Iceland-Regular',
    height: 60,
    textAlignVertical: 'center',
  },
})

export default Logo
