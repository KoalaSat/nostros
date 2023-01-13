import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { FlatList, Linking, ListRenderItem, StyleSheet } from 'react-native'
import { Divider, List } from 'react-native-paper'

interface ItemList {
  key: number
  title: string
  left?: () => JSX.Element
  onPress: () => void
}

export const AboutPage: React.FC = () => {
  const { t } = useTranslation('common')

  const items = React.useMemo(
    () => [
      {
        key: 1,
        title: t('aboutPage.gitHub'),
        left: () => <List.Icon icon='chart-tree' />,
        onPress: async () => await Linking.openURL('https://github.com/KoalaSat/nostros'),
      },
      {
        key: 2,
        title: t('aboutPage.nostr'),
        left: () => <List.Icon icon='chart-tree' />,
        onPress: async () => await Linking.openURL('https://usenostr.org'),
      },
      {
        key: 3,
        title: t('aboutPage.nips'),
        left: () => <List.Icon icon='chart-tree' />,
        onPress: async () => await Linking.openURL('https://github.com/nostr-protocol/nips'),
      },
    ],
    [],
  )

  const renderItem: ListRenderItem<ItemList> = ({ item }) => {
    return <List.Item key={item.key} title={item.title} onPress={item.onPress} left={item.left} />
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
