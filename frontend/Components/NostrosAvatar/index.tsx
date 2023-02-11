import React from 'react'
import { StyleSheet, View } from 'react-native'
import { Avatar as PaperAvatar, useTheme } from 'react-native-paper'
import { validImageUrl } from '../../Functions/NativeFunctions'
import FastImage from 'react-native-fast-image'
import { formatPubKey } from '../../Functions/RelayFunctions/Users'

interface NostrosAvatarProps {
  pubKey?: string
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
  const displayName = name && name !== '' ? name : formatPubKey(pubKey) ?? ''
  const hasLud06 = lud06 && lud06 !== ''
  const lud06IconSize = size / 2.85

  return (
    <View>
      <View style={{ borderRadius: size / 2, overflow: 'hidden' }}>
        {validImageUrl(src) ? (
          <FastImage
            style={[
              {
                backgroundColor: theme.colors.backdrop,
                borderRadius: size / 2,
                width: size,
                height: size,
              },
            ]}
            source={{
              uri: src,
              priority: FastImage.priority.normal,
            }}
            resizeMode={FastImage.resizeMode.contain}
          />
        ) : (
          <PaperAvatar.Text size={size} label={displayName.substring(0, 2).toUpperCase()} />
        )}
      </View>
      {hasLud06 && (
        <PaperAvatar.Icon
          size={lud06IconSize}
          icon='lightning-bolt'
          style={[
            styles.iconLightning,
            {
              right: -(size - lud06IconSize),
              backgroundColor: theme.colors.secondaryContainer,
              top: lud06IconSize * -1,
            },
          ]}
          color='#F5D112'
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  iconLightning: {
    marginBottom: -16,
  },
})

export default NostrosAvatar
