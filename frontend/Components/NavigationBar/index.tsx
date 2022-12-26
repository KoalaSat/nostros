import React, { useContext } from 'react'
import { BottomNavigation, BottomNavigationTab, useTheme } from '@ui-kitten/components'
import { AppContext } from '../../Contexts/AppContext'
import Icon from 'react-native-vector-icons/FontAwesome5'
import { RelayPoolContext } from '../../Contexts/RelayPoolContext'

export const NavigationBar: React.FC = () => {
  const { goToPage, getActualPage, page } = useContext(AppContext)
  const { publicKey, privateKey } = useContext(RelayPoolContext)
  const theme = useTheme()
  const profilePage = `profile#${publicKey ?? ''}`

  const pageIndex: string[] = ['home', 'mentions', 'messages', profilePage]

  const getIndex: () => number = () => {
    const actualPage = getActualPage()
    if (actualPage.includes('note#')) {
      return 0
    } else if (
      actualPage.includes('profile') ||
      ['config', 'relays', 'contacts'].includes(actualPage)
    ) {
      return 3
    } else if (actualPage.includes('conversation#')) {
      return 1
    } else {
      return pageIndex.indexOf(actualPage)
    }
  }

  return page ? (
    <BottomNavigation
      selectedIndex={getIndex()}
      onSelect={(index: number) => goToPage(pageIndex[index], true)}
    >
      <BottomNavigationTab
        icon={<Icon name='home' size={24} color={theme['text-basic-color']} />}
      />
      <BottomNavigationTab icon={<Icon name='at' size={24} color={theme['text-basic-color']} />} />
      <BottomNavigationTab
        icon={<Icon name='envelope' size={24} color={theme['text-basic-color']} />}
        disabled={!privateKey}
      />
      <BottomNavigationTab
        icon={<Icon name='user' size={24} color={theme['text-basic-color']} />}
      />
    </BottomNavigation>
  ) : (
    <></>
  )
}

export default NavigationBar
