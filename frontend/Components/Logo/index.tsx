import * as React from 'react'
import { StyleSheet, View } from 'react-native'
import { Text } from 'react-native-paper'
import { nostrosLogoSvg } from '../../Constants/Theme'
import { SvgXml } from 'react-native-svg'

interface LogoProps {
  onlyIcon?: boolean
  size?: 'large' | 'small'
}

export const Logo: React.FC<LogoProps> = ({onlyIcon = false, size = 'small' }) => {
  return (
    <View style={styles.container}>
      <SvgXml xml={nostrosLogoSvg} style={size === 'small' ? styles.logoSmall : styles.logoLarge} />
      {!onlyIcon && (
        <Text style={styles.text} variant={size === 'small' ? 'headlineSmall' : 'displayMedium'}>
          NOSTROS
        </Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  logoSmall: {
    maxHeight: 120,
    flex: 1,
    height: 40
  },
  logoLarge: {
    maxHeight: 120,
    flex: 1,
    height: 60,
  },
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  text: {
    fontFamily: 'SpaceGrotesk-Bold',
    flex: 2,
    height: 60,
    textAlignVertical: 'center',
  },
})

export default Logo
