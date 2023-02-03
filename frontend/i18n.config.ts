import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { NativeModules, Platform } from 'react-native'
import en from './Locales/en.json'
import es from './Locales/es.json'
import ru from './Locales/ru.json'
import fr from './Locales/fr.json'
import de from './Locales/de.json'
/* eslint-disable import/no-duplicates */
import setDefaultOptions from 'date-fns/setDefaultOptions'
import {
  enUS as dateEnUS,
  es as dateEs,
  ru as dateRu,
  fr as dateFr,
  de as dateDe,
} from 'date-fns/locale'
/* eslint-enable import/no-duplicates */

const locale =
  Platform.OS === 'ios'
    ? NativeModules.SettingsManager.settings.AppleLocale
    : NativeModules.I18nManager.localeIdentifier

const dateLocales = { es: dateEs, ru: dateRu, en: dateEnUS, fr: dateFr, de: dateDe }
const deviceLocale: string = locale?.split('_')[0] ?? 'en'
setDefaultOptions({ locale: dateLocales[deviceLocale] })

i18n.locale = locale
i18n.use(initReactI18next).init({
  compatibilityJSON: 'v3',
  fallbackLng: 'en',
  resources: {
    en,
    es,
    ru,
    fr,
    de,
  },
  lng: locale.substring(0, 2),
  ns: ['common'],
  defaultNS: 'common',
  debug: true,
  interpolation: {
    escapeValue: false,
  },
})

export default i18n
