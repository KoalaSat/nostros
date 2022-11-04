import React from 'react'
import { Layout, useTheme } from '@ui-kitten/components'
import { Image, StyleSheet, Text } from 'react-native'
import { stringToColour } from '../../Functions/NativeFunctions'

interface AvatarProps {
  src?: string
  name?: string
  pubKey: string
  size?: number
}

export const Avatar: React.FC<AvatarProps> = ({ src, name, pubKey, size = 50 }) => {
  const theme = useTheme()
  const displayName = name && name !== '' ? name : pubKey
  const styles = StyleSheet.create({
    layout: {
      flexDirection: 'row',
      alignContent: 'center',
      width: size,
      height: size,
      backgroundColor: 'transparent',
    },
    image: {
      width: size,
      height: size,
      borderRadius: 100,
    },
    textAvatarLayout: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      width: size,
      height: size,
      borderRadius: 100,
      backgroundColor: stringToColour(pubKey),
    },
    textAvatar: {
      fontSize: size / 2,
      alignContent: 'center',
      color: theme['text-basic-color'],
      textTransform: 'uppercase',
    },
  })

  const validImage: () => boolean = () => {
    if (src) {
      const regexp = /^(https?:\/\/.*\.(?:png|jpg|jpeg))$/
      return regexp.test(src)
    } else {
      return false
    }
  }

  return (
    <Layout style={styles.layout}>
      {validImage() ? (
        <Image style={styles.image} source={{ uri: src }} />
      ) : (
        <Layout style={styles.textAvatarLayout}>
          <Text style={styles.textAvatar}>{displayName.substring(0, 2)}</Text>
        </Layout>
      )}
    </Layout>
  )
}

export default Avatar
