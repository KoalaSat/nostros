import React from 'react'
import { StyleSheet, View } from 'react-native'
import { Avatar as PaperAvatar, useTheme } from 'react-native-paper'
import { validImageUrl } from '../../Functions/NativeFunctions'

interface NostrosAvatarProps {
  pubKey: string
  src?: string
  name?: string
  size?: number
  lud06?: string
}

export const NostrosAvatar: React.FC<NostrosAvatarProps> = ({
  src,
  name,
  pubKey,
  size = 40,
  lud06,
}) => {
  const theme = useTheme()
  const displayName = name && name !== '' ? name : pubKey ?? ''
  const hasLud06 = lud06 && lud06 !== ''
  const lud06IconSize = size / 2.85

  return (
    <View>
      {validImageUrl(src) ? (
        <PaperAvatar.Image size={size} source={{ uri: src }} />
      ) : (
        <PaperAvatar.Text size={size} label={displayName.substring(0, 2).toUpperCase()} />
      )}
      {hasLud06 ? (
        <PaperAvatar.Icon
          size={lud06IconSize}
          icon='lightning-bolt'
          style={[
            {
              right: -(size - lud06IconSize),
              backgroundColor: theme.colors.secondaryContainer,
              top: lud06IconSize * -1,
            },
          ]}
          color='#F5D112'
        />
      ) : (
        <View style={styles.iconLightning} />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  iconLightning: {
    marginBottom: 16,
  },
})

export default NostrosAvatar
