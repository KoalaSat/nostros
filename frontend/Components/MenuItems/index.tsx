import * as React from 'react'
import { StyleSheet, View } from 'react-native'
import { DrawerContentScrollView } from '@react-navigation/drawer'
import { Button, Card, Chip, Drawer, IconButton, Text, useTheme } from 'react-native-paper'
import Logo from '../Logo'
import { useTranslation } from 'react-i18next'
import SInfo from 'react-native-sensitive-info'
import { RelayPoolContext } from '../../Contexts/RelayPoolContext'
import { dropTables } from '../../Functions/DatabaseFunctions'
import { AppContext } from '../../Contexts/AppContext'
import { DrawerNavigationHelpers } from '@react-navigation/drawer/lib/typescript/src/types'
import { navigate } from '../../lib/Navigation'
import NostrosAvatar from '../Avatar'
import {
  getContactsCount,
  getFollowersCount,
  getUser,
  User,
} from '../../Functions/DatabaseFunctions/Users'
import { formatPubKey } from '../../Functions/RelayFunctions/Users'

interface MenuItemsProps {
  navigation: DrawerNavigationHelpers
}

export const MenuItems: React.FC<MenuItemsProps> = ({ navigation }) => {
  const [drawerItemIndex, setDrawerItemIndex] = React.useState<number>(-1)
  const { database, init } = React.useContext(AppContext)
  const { setPrivateKey, setPublicKey, relayPool, publicKey, relays } = React.useContext(RelayPoolContext)
  const [user, setUser] = React.useState<User>()
  const [contactsCount, setContantsCount] = React.useState<number>()
  const [followersCount, setFollowersCount] = React.useState<number>()
  const { t } = useTranslation('common')
  const theme = useTheme()

  React.useEffect(() => {
    if (database && publicKey) {
      getUser(publicKey, database).then((result) => {
        if (result) setUser(result)
      })
      getContactsCount(database).then(setContantsCount)
      getFollowersCount(database).then(setFollowersCount)
    }
  }, [publicKey, database])

  const onPressLogout: () => void = () => {
    if (database) {
      relayPool?.unsubscribeAll()
      setPrivateKey(undefined)
      setPublicKey(undefined)
      dropTables(database).then(() => {
        SInfo.deleteItem('privateKey', {}).then(() => {
          SInfo.deleteItem('publicKey', {}).then(() => {
            init()
            navigate('Home', { screen: 'ProfileConnect' })
          })
        })
      })
    }
  }

  const onPressItem: (key: string, index: number) => void = (key, index) => {
    setDrawerItemIndex(index)
    if (key === 'relays') {
      navigate('Relays')
    } else if (key === 'config') {
      navigate('Feed', { page: 'Config' })
    } else if (key === 'about') {
      navigate('About')
    }
  }

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
        {user && (
          <Card style={styles.cardContainer}>
            <Card.Content style={styles.cardContent}>
              <View style={styles.cardAvatar}>
                <NostrosAvatar
                  name={user.name}
                  pubKey={user.id}
                  src={user.picture}
                  lud06={user.lnurl}
                />
              </View>
              <View>
                <Text variant='titleMedium'>{user.name}</Text>
                <Text>{formatPubKey(user.id)}</Text>
              </View>
              <View style={styles.cardEdit}>
                <IconButton icon='pencil' size={20} onPress={() => console.log('Pressed')} />
              </View>
            </Card.Content>
            <Card.Content style={styles.cardActions}>
              <Chip
                compact={true}
                style={styles.cardActionsChip}
                onPress={() => console.log('Pressed')}
              >
                {t('menuItems.following', { following: contactsCount })}
              </Chip>
              <Chip
                compact={true}
                style={styles.cardActionsChip}
                onPress={() => console.log('Pressed')}
              >
                {t('menuItems.followers', { followers: followersCount })}
              </Chip>
            </Card.Content>
          </Card>
        )}
        {publicKey && (
          <Drawer.Section>
            <Drawer.Item
              label={t('menuItems.relays')}
              icon='message-question-outline'
              key='relays'
              active={drawerItemIndex === 0}
              onPress={() => onPressItem('relays', 0)}
              onTouchEnd={() => setDrawerItemIndex(-1)}
              right={() =>
                relays.length < 1 ? (
                  <Text style={{ color: theme.colors.error }}>{t('menuItems.notConnected')}</Text>
                ) : (
                  <Text style={{ color: theme.colors.inversePrimary }}>
                    {t('menuItems.connectedRelays', { number: relays.length })}
                  </Text>
                )
              }
            />
            <Drawer.Item
              label={t('menuItems.configuration')}
              icon='cog-outline'
              key='config'
              active={drawerItemIndex === 1}
              onPress={() => onPressItem('config', 1)}
              onTouchEnd={() => setDrawerItemIndex(-1)}
            />
          </Drawer.Section>
        )}
        <Drawer.Section showDivider={false}>
          <Drawer.Item
            label={t('menuItems.about')}
            icon='message-question-outline'
            key='about'
            active={drawerItemIndex === 2}
            onPress={() => onPressItem('about', 2)}
            onTouchEnd={() => setDrawerItemIndex(-1)}
          />
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
    borderTopRightRadius: 28,
  },
  cardContainer: {
    margin: 12,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardActionsChip: {
    width: '47%',
  },
  cardAvatar: {
    marginRight: 14,
  },
  cardContent: {
    width: '100%',
    flexDirection: 'row',
  },
  cardEdit: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flex: 1,
  },
  bottomSection: {
    marginBottom: 0,
    borderBottomRightRadius: 28,
    padding: 24,
  },
})

export default MenuItems
