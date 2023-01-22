import { createDrawerNavigator } from '@react-navigation/drawer'
import React, { useContext } from 'react'
import { StyleSheet, View } from 'react-native'
import { useTheme } from 'react-native-paper'
import Logo from '../../Components/Logo'
import MenuItems from '../../Components/MenuItems'
import { UserContext } from '../../Contexts/UserContext'
import FeedNavigator from '../FeedNavigator'
import HomeNavigator from '../HomeNavigator'

export const NostrosDrawerNavigator: React.FC = () => {
  const theme = useTheme()
  const { userState } = useContext(UserContext)

  const DrawerNavigator = createDrawerNavigator()

  const LoginDrawerNavigator = (
    <DrawerNavigator.Screen
      name='Home'
      component={HomeNavigator}
      options={{ headerShown: false }}
    />
  )

  const HomeDrawerNavigator = (
    <DrawerNavigator.Screen
      name='Feed'
      component={FeedNavigator}
      options={{ headerShown: false }}
    />
  )

  return userState !== 'loading' ? (
    <DrawerNavigator.Navigator
      drawerContent={() => <MenuItems />}
      screenOptions={{
        drawerStyle: {
          borderRadius: 28,
          width: 296,
        },
      }}
    >
      {userState === 'ready' ? HomeDrawerNavigator : LoginDrawerNavigator}
    </DrawerNavigator.Navigator>
  ) : (
    <View style={[styles.logo, { backgroundColor: theme.colors.background }]}>
      <Logo size='big' />
    </View>
  )
}

const styles = StyleSheet.create({
  logo: {
    justifyContent: 'center',
    alignContent: 'center',
    flex: 1,
    paddingLeft: 90,
  },
})

export default NostrosDrawerNavigator
