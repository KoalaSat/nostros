import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, View } from 'react-native'
import { Text, TouchableRipple, useTheme } from 'react-native-paper'

interface TabsProps {
  tabs: string[]
  activeTab: string
  setActiveTab: (activeTab: string) => void
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, setActiveTab }) => {
  const theme = useTheme()
  const { t } = useTranslation('common')

  return (
    <View style={styles.tabsNavigator}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {tabs.map((tabKey) => (
          <View
            key={tabKey}
            style={[
              styles.tab,
              {
                borderBottomColor: tabKey === activeTab ? theme.colors.primary : theme.colors.border,
                borderBottomWidth: tabKey === activeTab ? 3 : 1,
              },
            ]}
          >
            <TouchableRipple
              style={styles.textWrapper}
              onPress={() => {
                setActiveTab(tabKey)
              }}
            >
              <Text style={styles.tabText}>{t(`tabs.${tabKey}`)}</Text>
            </TouchableRipple>
          </View>
        ))}
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
