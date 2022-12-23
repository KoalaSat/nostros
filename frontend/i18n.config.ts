import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './Locales/en.json'
import es from './Locales/es.json'
import ru from './Locales/ru.json'

i18n.use(initReactI18next).init({
  compatibilityJSON: 'v3',
  fallbackLng: 'en',
  resources: {
    en,
    es,
    ru,
  },
  ns: ['common'],
  defaultNS: 'common',
  debug: true,
  interpolation: {
    escapeValue: false,
  },
})

export default i18n
