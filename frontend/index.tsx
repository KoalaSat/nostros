import React from 'react'
import { ApplicationProvider, IconRegistry } from '@ui-kitten/components'
import theme from './theme.json'
import { EvaIconsPack } from '@ui-kitten/eva-icons'
import * as eva from '@eva-design/eva'
import { AppContextProvider } from './Contexts/AppContext'
import MainLayout from './Components/MainLayout'
import { RelayPoolContextProvider } from './Contexts/RelayPoolContext'
import { I18nextProvider } from 'react-i18next'
import i18n from './i18n.config'

export const Frontend: React.FC = () => {
  const mapping = {
    strict: {
      'text-font-family': 'OpenSans-Regular',
    },
    components: {},
  }

  return (
    <>
      <IconRegistry icons={EvaIconsPack} />
      <ApplicationProvider {...eva} theme={{ ...eva.dark, ...theme }} customMapping={mapping}>
        <I18nextProvider i18n={i18n}>
          <AppContextProvider>
            <RelayPoolContextProvider>
              <MainLayout />
            </RelayPoolContextProvider>
          </AppContextProvider>
        </I18nextProvider>
      </ApplicationProvider>
    </>
  )
}

export default Frontend
