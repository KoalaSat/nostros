import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { FlatList, StyleSheet, Text } from 'react-native'
import { Divider, List, Switch, useTheme } from 'react-native-paper'
import SInfo from 'react-native-sensitive-info'
import RBSheet from 'react-native-raw-bottom-sheet'
import { AppContext } from '../../Contexts/AppContext'
import { imageHostingServices } from '../../Constants/Services'

export interface Config {
  satoshi: 'kebab' | 'sats'
  show_public_images: boolean
  show_sensitive: boolean
  last_notification_seen_at: number
  last_pets_at: number
  image_hosting_service: string
  language: string
  relay_coloruring: boolean
}

export const ConfigPage: React.FC = () => {
  const theme = useTheme()
  const { t } = useTranslation('common')
  const {
    getSatoshiSymbol,
    showPublicImages,
    setShowPublicImages,
    showSensitive,
    setShowSensitive,
    satoshi,
    setSatoshi,
    imageHostingService,
    setImageHostingService,
    language,
    setLanguage,
    relayColouring,
    setRelayColouring,
  } = React.useContext(AppContext)
  const bottomSheetSatoshiRef = React.useRef<RBSheet>(null)
  const bottomSheetImageHostingRef = React.useRef<RBSheet>(null)
  const bottomSheetLanguageRef = React.useRef<RBSheet>(null)

  React.useEffect(() => {}, [showPublicImages, showSensitive, satoshi])

  const satoshiOptions = React.useMemo(() => {
    return [
      {
        key: 1,
        title: <Text style={styles.satoshi}>s</Text>,
        onPress: () => {
          setSatoshi('kebab')
          SInfo.getItem('config', {}).then((result) => {
            const config: Config = JSON.parse(result)
            config.satoshi = 'kebab'
            SInfo.setItem('config', JSON.stringify(config), {})
          })
          bottomSheetSatoshiRef.current?.close()
        },
      },
      {
        key: 2,
        title: 'Sats',
        onPress: () => {
          setSatoshi('sats')
          SInfo.getItem('config', {}).then((result) => {
            const config: Config = JSON.parse(result)
            config.satoshi = 'sats'
            SInfo.setItem('config', JSON.stringify(config), {})
          })
          bottomSheetSatoshiRef.current?.close()
        },
      },
    ]
  }, [])

  const imageHostingOptions = React.useMemo(() => {
    return ['random', ...Object.keys(imageHostingServices)].map((service, index) => {
      return {
        key: index,
        title: <Text>{imageHostingServices[service]?.uri ?? t(`configPage.${service}`)}</Text>,
        onPress: () => {
          setImageHostingService(service)
          SInfo.getItem('config', {}).then((result) => {
            const config: Config = JSON.parse(result)
            config.image_hosting_service = service
            SInfo.setItem('config', JSON.stringify(config), {})
          })
          bottomSheetImageHostingRef.current?.close()
        },
      }
    })
  }, [])

  const languageOptions = React.useMemo(() => {
    return ['en', 'es', 'fr', 'ru', 'de'].map((language, index) => {
      return {
        key: index,
        title: <Text>{t(`language.${language}`)}</Text>,
        onPress: () => {
          setLanguage(language)
          SInfo.getItem('config', {}).then((result) => {
            const config: Config = JSON.parse(result)
            config.language = language
            SInfo.setItem('config', JSON.stringify(config), {})
          })
          bottomSheetLanguageRef.current?.close()
        },
      }
    })
  }, [])

  const bottomSheetStyles = React.useMemo(() => {
    return {
      container: {
        backgroundColor: theme.colors.background,
        paddingTop: 16,
        paddingRight: 16,
        paddingBottom: 32,
        paddingLeft: 16,
        borderTopRightRadius: 28,
        borderTopLeftRadius: 28,
        height: 'auto',
      },
    }
  }, [])

  return (
    <>
      <List.Item
        title={t('configPage.showPublicImages')}
        right={() => (
          <Switch
            value={showPublicImages}
            onValueChange={(value) => {
              setShowPublicImages(value)
              SInfo.getItem('config', {}).then((result) => {
                const config: Config = JSON.parse(result)
                config.show_public_images = value
                SInfo.setItem('config', JSON.stringify(config), {})
              })
            }}
          />
        )}
      />
      <List.Item
        title={t('configPage.showSensitive')}
        right={() => (
          <Switch
            value={showSensitive}
            onValueChange={(value) => {
              setShowSensitive(value)
              SInfo.getItem('config', {}).then((result) => {
                const config: Config = JSON.parse(result)
                config.show_sensitive = value
                SInfo.setItem('config', JSON.stringify(config), {})
              })
            }}
          />
        )}
      />
      <List.Item
        title={t('configPage.relayColoruring')}
        right={() => (
          <Switch
            value={relayColouring}
            onValueChange={(value) => {
              setRelayColouring(value)
              SInfo.getItem('config', {}).then((result) => {
                const config: Config = JSON.parse(result)
                config.relay_coloruring = value
                SInfo.setItem('config', JSON.stringify(config), {})
              })
            }}
          />
        )}
      />
      <List.Item
        title={t('configPage.language')}
        onPress={() => bottomSheetLanguageRef.current?.open()}
        right={() => <Text>{t(`language.${language}`)}</Text>}
      />
      <List.Item
        title={t('configPage.satoshi')}
        onPress={() => bottomSheetSatoshiRef.current?.open()}
        right={() => getSatoshiSymbol(25)}
      />
      <List.Item
        title={t('configPage.imageHostingService')}
        onPress={() => bottomSheetImageHostingRef.current?.open()}
        right={() => (
          <Text style={{ color: theme.colors.onSurfaceVariant }}>
            {imageHostingServices[imageHostingService]?.uri ??
              t(`configPage.${imageHostingService}`)}
          </Text>
        )}
      />
      <RBSheet ref={bottomSheetLanguageRef} closeOnDragDown={true} customStyles={bottomSheetStyles}>
        <FlatList
          data={languageOptions}
          renderItem={({ item }) => {
            return <List.Item key={item.key} title={item.title} onPress={item.onPress} />
          }}
          ItemSeparatorComponent={Divider}
        />
      </RBSheet>
      <RBSheet ref={bottomSheetSatoshiRef} closeOnDragDown={true} customStyles={bottomSheetStyles}>
        <FlatList
          data={satoshiOptions}
          renderItem={({ item }) => {
            return <List.Item key={item.key} title={item.title} onPress={item.onPress} />
          }}
          ItemSeparatorComponent={Divider}
        />
      </RBSheet>
      <RBSheet
        ref={bottomSheetImageHostingRef}
        closeOnDragDown={true}
        customStyles={bottomSheetStyles}
      >
        <FlatList
          data={imageHostingOptions}
          renderItem={({ item }) => {
            return <List.Item key={item.key} title={item.title} onPress={item.onPress} />
          }}
          ItemSeparatorComponent={Divider}
        />
      </RBSheet>
    </>
  )
}

const styles = StyleSheet.create({
  satoshi: {
    fontFamily: 'Satoshi-Symbol',
    fontSize: 25,
  },
})

export default ConfigPage
