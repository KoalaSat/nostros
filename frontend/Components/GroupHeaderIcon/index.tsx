import React, { useContext, useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import RBSheet from 'react-native-raw-bottom-sheet'
import { Avatar as PaperAvatar, TouchableRipple, useTheme } from 'react-native-paper'
import { getGroup, Group } from '../../Functions/DatabaseFunctions/Groups'
import { AppContext } from '../../Contexts/AppContext'
import { validImageUrl } from '../../Functions/NativeFunctions'
import FastImage from 'react-native-fast-image'

interface GroupHeaderIconProps {
  groupId: string
}

export const GroupHeaderIcon: React.FC<GroupHeaderIconProps> = ({ groupId }) => {
  const { database } = useContext(AppContext)
  const theme = useTheme()
  const [group, setGroup] = useState<Group>()
  const bottomSheetEditGroupRef = React.useRef<RBSheet>(null)

  useEffect(() => {
    if (database && groupId) {
      getGroup(database, groupId).then(setGroup)
    }
  }, [])

  const bottomSheetStyles = React.useMemo(() => {
    return {
      container: {
        backgroundColor: theme.colors.background,
        paddingTop: 16,
        paddingRight: 16,
        paddingBottom: 32,
        paddingLeft: 16,
        borderTopRightRadius: 28,
        borderTopLeftRadius: 28,
        height: 'auto',
      },
    }
  }, [])

  return (
    <View style={styles.container}>
      <TouchableRipple onPress={() => {}}>
       {validImageUrl(group?.picture) ? (
          <FastImage
            style={[
              {
                backgroundColor: theme.colors.backdrop,
                borderRadius: 33,
                width: 35,
                height: 35,
              },
            ]}
            source={{
              uri: group?.picture,
              priority: FastImage.priority.normal,
            }}
            resizeMode={FastImage.resizeMode.contain}
          />
        ) : (
          <PaperAvatar.Text size={35} label={group?.name ?? group?.id ?? ''} />
        )}
      </TouchableRipple>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingRight: 8,
  },
})

export default GroupHeaderIcon

