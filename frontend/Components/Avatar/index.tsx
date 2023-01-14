import React from 'react'
import { StyleSheet } from 'react-native'
import { Avatar as PaperAvatar, useTheme } from 'react-native-paper'

interface AvatarProps {
  pubKey: string
  src?: string
  name?: string
  size?: number
  lud06?: string
}

export const NostrosAvatar: React.FC<AvatarProps> = ({ src, name, pubKey, size = 40, lud06 }) => {
  const theme = useTheme()
  const displayName = name && name !== '' ? name : pubKey
  const hasLud06 = lud06 && lud06 !== ''
  const validImage: () => boolean = () => {
    if (src) {
      const regexp = /^(https?:\/\/.*\.(?:png|jpg|jpeg))$/
      return regexp.test(src)
    } else {
      return false
    }
  }

  return (
    <>
      {validImage() ? (
        <PaperAvatar.Image size={size} source={{ uri: src }} />
      ) : (
        <PaperAvatar.Text size={size} label={displayName} />
      )}
      {hasLud06 && (
        <PaperAvatar.Icon
          size={14}
          icon='lightning-bolt'
          style={[
            styles.iconLightning,
            { right: -(size - 14), backgroundColor: theme.colors.secondaryContainer },
          ]}
          color='#F5D112'
        />
      )}
    </>
  )
}

const styles = StyleSheet.create({
  iconLightning: {
    top: -14,
  },
})

export default NostrosAvatar
