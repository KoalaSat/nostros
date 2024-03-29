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
import { WalletContext } from '../../Contexts/WalletContext'
import { AppContext } from '../../Contexts/AppContext'
import VersionNumber from 'react-native-version-number'
import axios from 'axios'

export const MenuItems: React.FC = () => {
  const [drawerItemIndex, setDrawerItemIndex] = React.useState<number>(-1)
  const { getSatoshiSymbol, online } = React.useContext(AppContext)
  const { relays } = React.useContext(RelayPoolContext)
  const { balance, type } = React.useContext(WalletContext)
  const {
    nPub,
    publicKey,
    privateKey,
    logout,
    name,
    picture,
    validNip05,
    lnurl,
    lnAddress,
    nip05,
  } = React.useContext(UserContext)
  const { t } = useTranslation('common')
  const theme = useTheme()
  const { switchLine } = React.useContext(RelayPoolContext)

  const [activerelays, setActiveRelays] = React.useState<number>(0)
  const [loadingConnection, setLoadingConnection] = React.useState<boolean>(false)
  const [newVersion, setNewVerion] = React.useState<boolean>(false)

  React.useEffect(() => {
    setActiveRelays(relays.filter((relay) => relay.active).length)
  }, [relays, balance])

  React.useEffect(() => {
    setLoadingConnection(false)
  }, [online])

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
    } else if (key === 'faq') {
      navigate('Faq')
    } else if (key === 'config') {
      navigate('Config')
    } else if (key === 'contacts') {
      navigate('Contacts')
    } else if (key === 'wallet') {
      navigate('Wallet')
    } else if (key === 'exports') {
      navigate('Exports')
    }
  }

  React.useEffect(() => {
    setLoadingConnection(false)
  }, [online])

  React.useEffect(() => {
    axios.get('https://api.github.com/repos/KoalaSat/nostros/releases/latest')
      .then((response) => {
        if (response) {
          const tag = response.data.tag_name
          setNewVerion(online && Boolean(tag) && tag !== VersionNumber.appVersion)
        }
      })
  }, [])

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
                  lnurl={lnurl}
                  lnAddress={lnAddress}
                  picture={picture}
                />
              </TouchableRipple>
              <View style={styles.cardEdit}>
                {privateKey && online && (
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
                activerelays < 1 || !online ? (
                  <Text style={{ color: theme.colors.error }}>{t('menuItems.notConnected')}</Text>
                ) : (
                  <Text style={{ color: '#7ADC70' }}>
                    {t('menuItems.connectedRelays', {
                      number: activerelays,
                    })}
                  </Text>
                )
              }
            />
          )}
          <Drawer.Item
            label={t('menuItems.wallet')}
            icon='wallet-outline'
            key='wallet'
            active={drawerItemIndex === 1}
            onPress={() => onPressItem('wallet', 1)}
            onTouchEnd={() => setDrawerItemIndex(-1)}
            right={() => {
              if (!type || balance === undefined) return <></>
              return (
                <Text>
                  {`${balance} `}
                  {getSatoshiSymbol()}
                </Text>
              )
            }}
          />
          {publicKey && (
            <Drawer.Item
              label={t('menuItems.contacts')}
              icon='contacts-outline'
              key='contacts'
              active={drawerItemIndex === 1}
              onPress={() => onPressItem('contacts', 1)}
              onTouchEnd={() => setDrawerItemIndex(-1)}
            />
          )}
          <Drawer.Item
            label={t('menuItems.exports')}
            icon='file-import-outline'
            key='exports'
            active={drawerItemIndex === 2}
            onPress={() => onPressItem('exports', 2)}
            onTouchEnd={() => setDrawerItemIndex(-1)}
          />
          <Drawer.Item
            label={t('menuItems.configuration')}
            icon='cog'
            key='configuration'
            active={drawerItemIndex === 2}
            onPress={() => onPressItem('config', 3)}
            onTouchEnd={() => setDrawerItemIndex(-1)}
          />
        </Drawer.Section>
        <Drawer.Section showDivider={false}>
          <Drawer.Item
            label={t('menuItems.about')}
            icon='information-outline'
            key='about'
            active={drawerItemIndex === 3}
            onPress={() => onPressItem('about', 4)}
            onTouchEnd={() => setDrawerItemIndex(-1)}
          />
          <Drawer.Item
            label={t('menuItems.faq')}
            icon='comment-question-outline'
            key='faq'
            active={drawerItemIndex === 4}
            onPress={() => onPressItem('faq', 5)}
            onTouchEnd={() => setDrawerItemIndex(-1)}
          />
          {newVersion && (
            <Drawer.Item
              label={t('menuItems.newVersion')}
              icon='cellphone-arrow-down'
              key='version'
              active={drawerItemIndex === 2}
              onPress={async () =>
                await Linking.openURL('https://github.com/KoalaSat/nostros/releases/latest')
              }
              right={() =>
                  <MaterialCommunityIcons
                    name='exclamation-thick'
                    size={25}
                    color='#FFDCBB'
                  />
                }
            />
          )}
        </Drawer.Section>
      </DrawerContentScrollView>
      <Drawer.Section
        style={[
          styles.section,
          {
            backgroundColor: theme.colors.background,
          },
        ]}
        showDivider={false}
      >
        <Button
          mode='outlined'
          onPress={() => {
            setLoadingConnection(true)
            switchLine()
          }}
          loading={loadingConnection}
          textColor={theme.colors.onSurface}
          icon={() => (
            <MaterialCommunityIcons
              name={online ? 'web' : 'web-off'}
              size={20}
              style={online ? { color: '#7ADC70' } : { color: theme.colors.error }}
            />
          )}
        >
          {t(online ? 'menuItems.online' : 'menuItems.offline')}
        </Button>
      </Drawer.Section>
      {publicKey && (
        <Drawer.Section
          style={[
            styles.section,
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
  section: {
    marginBottom: 0,
    paddingBottom: 24,
    paddingLeft: 24,
    paddingRight: 24
  },
  bottomSection: {
    borderBottomRightRadius: 28,
  },
  username: {
    flexDirection: 'row',
  },
  verifyIcon: {
    paddingTop: 6,
    paddingLeft: 5,
  }
})

export default MenuItems
