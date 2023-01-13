import * as React from 'react'
import { StyleSheet } from 'react-native'
import { DrawerContentScrollView } from '@react-navigation/drawer'
import { Button, Drawer, Text, useTheme } from 'react-native-paper'
import Logo from '../Logo'
import { useTranslation } from 'react-i18next'
import SInfo from 'react-native-sensitive-info'
import { RelayPoolContext } from '../../Contexts/RelayPoolContext'
import { dropTables } from '../../Functions/DatabaseFunctions'
import { AppContext } from '../../Contexts/AppContext'
import { DrawerNavigationHelpers } from '@react-navigation/drawer/lib/typescript/src/types'

interface ItemList {
  label: string
  icon: string
  key: number 
  right?: () => JSX.Element
}

interface MenuItemsProps {
  navigation: DrawerNavigationHelpers;
}

export const MenuItems: React.FC<MenuItemsProps> = ({ navigation }) => {
  const [drawerItemIndex, setDrawerItemIndex] = React.useState<number>(-1)
  const { goToPage, database, init } = React.useContext(AppContext)
  const { setPrivateKey, setPublicKey, relayPool, publicKey } = React.useContext(RelayPoolContext)
  const { t } = useTranslation('common')
  const theme = useTheme()

  const onPressLogout: () => void = () => {
    if (database) {
      relayPool?.unsubscribeAll()
      setPrivateKey(undefined)
      setPublicKey(undefined)
      dropTables(database).then(() => {
        SInfo.deleteItem('privateKey', {}).then(() => {
          SInfo.deleteItem('publicKey', {}).then(() => {
            init()
            goToPage('landing', true)
          })
        })
      })
    }
  }

  const onPressItem: (index:number) => void = (index) => {
    setDrawerItemIndex(index)
    const pagesIndex = [
      'Relays',
      'Config',
      'About'
    ]
    navigation.navigate(pagesIndex[index])
  }

  const relaysRightButton: () => JSX.Element = () => {
    if (!relayPool || relayPool?.relays.length < 1) {
      return <Text style={{color: theme.colors.error}}>{t('menuItems.notConnected')}</Text>
    }
    return <Text style={{color: theme.colors.inversePrimary}}>{t('menuItems.connectedRelays', { number: relayPool?.relays.length.toString()})}</Text> 
  }

  const DrawerItemsData = React.useMemo(
    () => {
      if (!publicKey) return []

      const defaultList: ItemList[] = [
        { label: t('menuItems.relays'), icon: 'message-question-outline', key: 0, right: relaysRightButton},
        { label: t('menuItems.configuration'), icon: 'cog-outline', key: 1 }
      ]

      return defaultList
    },
    [publicKey],
  )
  const DrawerBottomItemsData = React.useMemo(
    () => [{ label: t('menuItems.about'), icon: 'message-question-outline', key: 2 }],
    [],
  )

  return (
    <>
      <DrawerContentScrollView
        alwaysBounceVertical={false}
        style={[
          styles.drawerContent,
          {
            backgroundColor: theme.colors.background,
            borderBottomRightRadius: publicKey ? 0 : 28,
          },
        ]}
      >
        <Drawer.Section showDivider={false}>
          <Logo />
        </Drawer.Section>
        <Drawer.Section showDivider={publicKey !== undefined}>
          {DrawerItemsData.map((props, index) => (
            <Drawer.Item
              label={props.label}
              icon={props.icon}
              key={props.key}
              active={drawerItemIndex === index}
              onPress={() => onPressItem(index)}
              onTouchEnd={() => setDrawerItemIndex(-1)}
              right={props.right}
            />
          ))}
        </Drawer.Section>
        <Drawer.Section showDivider={false}>
          {DrawerBottomItemsData.map((props, index) => (
            <Drawer.Item
              label={props.label}
              icon={props.icon}
              key={props.key}
              active={drawerItemIndex === DrawerItemsData.length + index}
              onPress={() => onPressItem(DrawerItemsData.length + index)}
              onTouchEnd={() => setDrawerItemIndex(-1)}
            />
          ))}
        </Drawer.Section>
      </DrawerContentScrollView>
      {publicKey && (
        <Drawer.Section
          style={[
            styles.bottomSection,
            {
              backgroundColor: theme.colors.background,
            },
          ]}
          showDivider={false}
        >
          <Button mode='outlined' onPress={onPressLogout}>
            {t('menuItems.logout')}
          </Button>
        </Drawer.Section>
      )}
    </>
  )
}

const styles = StyleSheet.create({
  drawerContent: {
    flex: 1,
    borderTopRightRadius: 28
  },
  bottomSection: {
    padding: 24,
    marginBottom: 0,
    borderBottomRightRadius: 28
  },
})

export default MenuItems
