import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { FlatList, StyleSheet, Text } from 'react-native'
import { Divider, List, Switch, useTheme } from 'react-native-paper'
import RBSheet from 'react-native-raw-bottom-sheet'
import { AppContext } from '../../Contexts/AppContext'

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
  } = React.useContext(AppContext)
  const bottomSheetRef = React.useRef<RBSheet>(null)

  React.useEffect(() => {}, [showPublicImages, showSensitive, satoshi])

  const createOptions = React.useMemo(() => {
    return [
      {
        key: 1,
        title: <Text style={styles.satoshi}>s</Text>,
        onPress: () => {
          setSatoshi('kebab')
          bottomSheetRef.current?.close()
        },
      },
      {
        key: 2,
        title: 'sats',
        onPress: () => {
          setSatoshi('sats')
          bottomSheetRef.current?.close()
        },
      },
    ]
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
          <Switch value={showPublicImages} onValueChange={(value) => setShowPublicImages(value)} />
        )}
      />
      <List.Item
        title={t('configPage.showSensitive')}
        right={() => (
          <Switch value={showSensitive} onValueChange={(value) => setShowSensitive(value)} />
        )}
      />
      <List.Item
        title={t('configPage.satoshi')}
        onPress={() => bottomSheetRef.current?.open()}
        right={() => getSatoshiSymbol(25)}
      />
      <RBSheet ref={bottomSheetRef} closeOnDragDown={true} customStyles={bottomSheetStyles}>
        <FlatList
          data={createOptions}
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
