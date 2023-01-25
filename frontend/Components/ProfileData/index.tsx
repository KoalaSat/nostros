import * as React from 'react'
import { StyleSheet, View } from 'react-native'
import { Text, useTheme } from 'react-native-paper'
import { getNip05Domain, usernamePubKey } from '../../Functions/RelayFunctions/Users'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import NostrosAvatar from '../NostrosAvatar'
import { fromUnixTime, formatDistance } from 'date-fns'
import { getNpub } from '../../lib/nostr/Nip19'

interface ProfileCardProps {
  username?: string
  publicKey?: string
  lud06?: string
  validNip05?: boolean
  nip05?: string
  picture?: string
  avatarSize?: number
  timestamp?: number
}

export const ProfileData: React.FC<ProfileCardProps> = ({
  username,
  publicKey,
  lud06,
  validNip05,
  nip05,
  picture,
  avatarSize,
  timestamp,
}) => {
  const theme = useTheme()
  const nPub = React.useMemo(() => (publicKey ? getNpub(publicKey) : ''), [publicKey])
  const date = React.useMemo(
    () =>
      timestamp ? formatDistance(fromUnixTime(timestamp), new Date(), { addSuffix: true }) : null,
    [timestamp],
  )

  return (
    <View style={styles.container}>
      <NostrosAvatar name={username} pubKey={nPub} src={picture} lud06={lud06} size={avatarSize} />
      <View style={styles.contactData}>
        <View style={styles.contactName}>
          <Text variant='titleSmall' numberOfLines={1}>{usernamePubKey(username, nPub)}</Text>
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
        {validNip05 ? <Text numberOfLines={1}>{getNip05Domain(nip05)}</Text> : <></>}
        {date ? <Text numberOfLines={1}>{date}</Text> : <></>}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
  },
  contactName: {
    flexDirection: 'row'
  },
  contactData: {
    flexDirection: 'column',
    marginLeft: 8,
  },
  verifyIcon: {
    paddingTop: 5,
    paddingLeft: 5,
  },
})

export default ProfileData
