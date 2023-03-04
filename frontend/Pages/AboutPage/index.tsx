import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { FlatList, Linking, ListRenderItem, StyleSheet } from 'react-native'
import { Divider, List, Text, useTheme } from 'react-native-paper'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import VersionNumber from 'react-native-version-number'

interface ItemList {
  key: number
  title: string
  left?: JSX.Element
  right?: JSX.Element
  onPress: () => void
}

export const AboutPage: React.FC = () => {
  const { t } = useTranslation('common')
  const theme = useTheme()

  const items = React.useMemo(
    () => [
      {
        key: 1,
        title: 'Nostros',
        left: (
          <List.Icon
            icon={() => (
              <MaterialCommunityIcons
                name='web'
                size={25}
                color={theme.colors.onPrimaryContainer}
              />
            )}
          />
        ),
        onPress: async () => await Linking.openURL('https://nostros.net'),
      },
      {
        key: 2,
        title: t('aboutPage.gitHub'),
        left: (
          <List.Icon
            icon={() => (
              <MaterialCommunityIcons
                name='source-branch'
                size={25}
                color={theme.colors.onPrimaryContainer}
              />
            )}
          />
        ),
        onPress: async () => await Linking.openURL('https://github.com/KoalaSat/nostros'),
      },
      {
        key: 3,
        title: t('aboutPage.telegram'),
        left: (
          <List.Icon
            icon={() => (
              <MaterialCommunityIcons
                name='send-circle'
                size={25}
                color={theme.colors.onPrimaryContainer}
              />
            )}
          />
        ),
        onPress: async () => await Linking.openURL('https://t.me/+zhvZAE9L0X40ZjI0'),
      },
      {
        key: 4,
        title: t('aboutPage.nostr'),
        left: (
          <List.Icon
            icon={() => (
              <MaterialCommunityIcons
                name='file-tree-outline'
                size={25}
                color={theme.colors.onPrimaryContainer}
              />
            )}
          />
        ),
        onPress: async () => await Linking.openURL('https://www.nostr.how'),
      },
      {
        key: 5,
        title: t('aboutPage.nips'),
        left: (
          <List.Icon
            icon={() => (
              <MaterialCommunityIcons
                name='hammer-wrench'
                size={25}
                color={theme.colors.onPrimaryContainer}
              />
            )}
          />
        ),
        right: <></>,
        onPress: async () => await Linking.openURL('https://github.com/nostr-protocol/nips'),
      },
      {
        key: 6,
        title: t('aboutPage.version'),
        left: (
          <List.Icon
            icon={() => (
              <MaterialCommunityIcons
                name='android'
                size={25}
                color={theme.colors.onPrimaryContainer}
              />
            )}
          />
        ),
        right: <Text>{VersionNumber.appVersion}</Text>,
        onPress: () => {},
      },
    ],
    [],
  )

  const renderItem: ListRenderItem<ItemList> = ({ item }) => {
    return (
      <List.Item
        key={item.key}
        title={item.title}
        onPress={item.onPress}
        left={() => item.left}
        right={() => item.right}
      />
    )
  }

  return (
    <FlatList
      style={styles.container}
      showsVerticalScrollIndicator={false}
      ItemSeparatorComponent={Divider}
      data={items}
      renderItem={renderItem}
    />
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
})

export default AboutPage
