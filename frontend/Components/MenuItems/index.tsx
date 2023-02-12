import * as React from 'react'
import { Linking, StyleSheet, View } from 'react-native'
import { DrawerContentScrollView } from '@react-navigation/drawer'
import {
  Button,
  Card,
  Drawer,
  IconButton,
  Text,
  TouchableRipple,
  useTheme,
} from 'react-native-paper'
import Logo from '../Logo'
import { useTranslation } from 'react-i18next'
import { RelayPoolContext } from '../../Contexts/RelayPoolContext'
import { UserContext } from '../../Contexts/UserContext'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import { navigate } from '../../lib/Navigation'
import { usernamePubKey } from '../../Functions/RelayFunctions/Users'
import ProfileData from '../ProfileData'

export const MenuItems: React.FC = () => {
  const [drawerItemIndex, setDrawerItemIndex] = React.useState<number>(-1)
  const { relays } = React.useContext(RelayPoolContext)
  const { nPub, publicKey, privateKey, logout, name, picture, validNip05, lnurl, nip05 } =
    React.useContext(UserContext)
  const { t } = useTranslation('common')
  const theme = useTheme()

  const onPressLogout: () => void = () => {
    logout()
  }

  const onPressItem: (key: string, index: number) => void = (key, index) => {
    setDrawerItemIndex(index)
    if (key === 'relays') {
      navigate('Relays')
    } else if (key === 'configProfile') {
      navigate('Feed', { page: 'ProfileConfig' })
    } else if (key === 'about') {
      navigate('About')
    } else if (key === 'config') {
      navigate('Config')
    } else if (key === 'contacts') {
      navigate('Contacts')
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
        <Drawer.Section showDivider={false} style={styles.logo}>
          <Logo />
        </Drawer.Section>
        {nPub && (
          <Card style={styles.cardContainer}>
            <Card.Content style={styles.cardContent}>
              <TouchableRipple
                onPress={() =>
                  navigate('Profile', {
                    pubKey: publicKey,
                    title: usernamePubKey(name, publicKey),
                  })
                }
              >
                <ProfileData
                  username={name}
                  publicKey={publicKey}
                  validNip05={validNip05}
                  nip05={nip05}
                  lud06={lnurl}
                  picture={picture}
                />
              </TouchableRipple>
              <View style={styles.cardEdit}>
                {privateKey && (
                  <IconButton
                    icon='pencil-outline'
                    size={20}
                    onPress={() => navigate('ProfileConfig')}
                  />
                )}
              </View>
            </Card.Content>
          </Card>
        )}
        <Drawer.Section>
          {publicKey && (
            <>
              <Drawer.Item
                label={t('menuItems.relays')}
                icon={() => (
                  <MaterialCommunityIcons
                    name='chart-timeline-variant'
                    size={25}
                    color={theme.colors.onPrimaryContainer}
                  />
                )}
                key='relays'
                active={drawerItemIndex === 0}
                onPress={() => onPressItem('relays', 0)}
                onTouchEnd={() => setDrawerItemIndex(-1)}
                right={() =>
                  relays.length < 1 ? (
                    <Text style={{ color: theme.colors.error }}>{t('menuItems.notConnected')}</Text>
                  ) : (
                    <Text style={{ color: theme.colors.inversePrimary }}>
                      {t('menuItems.connectedRelays', {
                        number: relays.filter((relay) => relay.active).length,
                      })}
                    </Text>
                  )
                }
              />

              <Drawer.Item
                label={t('menuItems.contacts')}
                icon='contacts-outline'
                key='contacts'
                active={drawerItemIndex === 1}
                onPress={() => onPressItem('contacts', 1)}
                onTouchEnd={() => setDrawerItemIndex(-1)}
              />
            </>
          )}
          <Drawer.Item
            label={t('menuItems.configuration')}
            icon='cog'
            key='configuration'
            active={drawerItemIndex === 1}
            onPress={() => onPressItem('config', 1)}
            onTouchEnd={() => setDrawerItemIndex(-1)}
          />
        </Drawer.Section>
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
        <Drawer.Section showDivider={false}>
          <Drawer.Item
            label={t('menuItems.reportBug')}
            icon='bug-outline'
            key='bug'
            active={drawerItemIndex === 2}
            onPress={async () =>
              await Linking.openURL('https://github.com/KoalaSat/nostros/issues/new/choose')
            }
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
          <Button
            mode='outlined'
            onPress={onPressLogout}
            textColor={theme.colors.onSurface}
            icon={() => (
              <MaterialCommunityIcons
                name='logout'
                size={20}
                style={{ color: theme.colors.onSurface }}
              />
            )}
          >
            {t('menuItems.logout')}
          </Button>
        </Drawer.Section>
      )}
    </>
  )
}

const styles = StyleSheet.create({
  logo: {
    justifyContent: 'center',
    flexDirection: 'row',
  },
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
  username: {
    flexDirection: 'row',
  },
  verifyIcon: {
    paddingTop: 6,
    paddingLeft: 5,
  },
})

export default MenuItems
