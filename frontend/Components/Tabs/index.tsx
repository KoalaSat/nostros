import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, View } from 'react-native'
import { Text, TouchableRipple, useTheme } from 'react-native-paper'

interface TabsProps {
  tabs: string[]
  setActiveTab: (activeTab: string) => void
  defaultTab?: string
}

export const Tabs: React.FC<TabsProps> = ({ tabs, setActiveTab, defaultTab }) => {
  const theme = useTheme()
  const { t } = useTranslation('common')

  const [tab, setTab] = React.useState<string>(defaultTab ?? tabs[0])

  React.useEffect(() => {
    setActiveTab(tab)
  }, [tab])

  const tabElements = React.useMemo(() => {
    return tabs.map((tabKey) => (
      <View
        key={tabKey}
        style={[
          styles.tab,
          {
            borderBottomColor: tabKey === tab ? theme.colors.primary : theme.colors.border,
            borderBottomWidth: tabKey === tab ? 3 : 1,
          },
        ]}
      >
        <TouchableRipple
          style={styles.textWrapper}
          onPress={() => {
            setTab(tabKey)
          }}
        >
          <Text style={styles.tabText}>{t(`tabs.${tabKey}`)}</Text>
        </TouchableRipple>
      </View>
    ))
  }, [tab])

  return (
    <View style={styles.tabsNavigator}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {tabElements}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  tabText: {
    textAlign: 'center',
  },
  tabsNavigator: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
  },
  tab: {
    width: 160,
  },
  textWrapper: {
    justifyContent: 'center',
    height: '100%',
    textAlign: 'center',
  },
})

export default Tabs
