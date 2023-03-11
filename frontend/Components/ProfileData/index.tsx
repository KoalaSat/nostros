import * as React from 'react'
import { StyleSheet, View } from 'react-native'
import { Text, useTheme } from 'react-native-paper'
import { getNip05Domain, usernamePubKey } from '../../Functions/RelayFunctions/Users'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import NostrosAvatar from '../NostrosAvatar'
import { getNpub } from '../../lib/nostr/Nip19'
import { formatDate } from '../../Functions/NativeFunctions'
import { AppContext } from '../../Contexts/AppContext'

interface ProfileCardProps {
  username?: string
  publicKey?: string
  lnurl?: string
  lnAddress?: string
  validNip05?: number
  nip05?: string
  picture?: string
  avatarSize?: number
  timestamp?: number
  bitcoinTag?: string[]
}

export const ProfileData: React.FC<ProfileCardProps> = ({
  username,
  publicKey,
  lnurl,
  lnAddress,
  validNip05,
  nip05,
  picture,
  avatarSize,
  timestamp,
  bitcoinTag,
}) => {
  const theme = useTheme()
  const { signHeight } = React.useContext(AppContext)
  const nPub = React.useMemo(() => (publicKey ? getNpub(publicKey) : ''), [publicKey])
  const date = React.useMemo(() => formatDate(timestamp), [timestamp])

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <NostrosAvatar
          name={username}
          pubKey={nPub}
          src={picture}
          lnurl={lnurl}
          lnAddress={lnAddress}
          size={avatarSize}
        />
        <View style={[styles.contactData, { height: avatarSize }]}>
          <View style={styles.contactName}>
            <Text variant='titleSmall' numberOfLines={1}>
              {usernamePubKey(username, nPub)}
            </Text>
            {validNip05 ? (
              <MaterialCommunityIcons
                name='check-decagram-outline'
                color={theme.colors.onPrimaryContainer}
                style={styles.verifyIcon}
              />
            ) : (
              <></>
            )}
          </View>
          <Text numberOfLines={1}>
            {timestamp ? date : validNip05 ? getNip05Domain(nip05) : ''}
            {signHeight && bitcoinTag ? ` (${bitcoinTag[2]})` : ''}
          </Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  left: {
    flexDirection: 'row',
  },
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  contactName: {
    flexDirection: 'row',
  },
  contactData: {
    flexDirection: 'column',
    marginLeft: 12,
  },
  verifyIcon: {
    paddingTop: 5,
    paddingLeft: 5,
  },
})

export default ProfileData
