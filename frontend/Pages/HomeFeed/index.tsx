import React, { useContext, useState } from 'react'
import { Dimensions, StyleSheet, View } from 'react-native'
import { UserContext } from '../../Contexts/UserContext'
import { RelayPoolContext } from '../../Contexts/RelayPoolContext'
import { AnimatedFAB, Text, TouchableRipple } from 'react-native-paper'
import RBSheet from 'react-native-raw-bottom-sheet'
import ProfileCard from '../../Components/ProfileCard'
import { useFocusEffect, useTheme } from '@react-navigation/native'
import { navigate } from '../../lib/Navigation'
import { t } from 'i18next'
import GlobalFeed from '../GlobalFeed'
import MyFeed from '../MyFeed'
import { AppContext } from '../../Contexts/AppContext'

interface HomeFeedProps {
  navigation: any
}

export const HomeFeed: React.FC<HomeFeedProps> = ({ navigation }) => {
  const theme = useTheme()
  const { showPublicImages } = useContext(AppContext)
  const { privateKey } = useContext(UserContext)
  const { relayPool } = useContext(RelayPoolContext)
  const [tabKey, setTabKey] = React.useState('myFeed')
  const [profileCardPubkey, setProfileCardPubKey] = useState<string>()
  const bottomSheetProfileRef = React.useRef<RBSheet>(null)

  useFocusEffect(
    React.useCallback(() => {
      return () =>
        relayPool?.unsubscribe([
          'homepage-global-main',
          'homepage-contacts-main',
          'homepage-reactions',
          'homepage-contacts-meta',
          'homepage-replies',
        ])
    }, []),
  )

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

  const renderScene: Record<string, JSX.Element> = {
    globalFeed: (
      <GlobalFeed
        navigation={navigation}
        setProfileCardPubKey={(value) => {
          setProfileCardPubKey(value)
          bottomSheetProfileRef.current?.open()
        }}
      />
    ),
    myFeed: (
      <MyFeed
        navigation={navigation}
        setProfileCardPubKey={(value) => {
          setProfileCardPubKey(value)
          bottomSheetProfileRef.current?.open()
        }}
      />
    ),
  }

  return (
    <View>
      <View style={styles.tabsNavigator}>
        <View
          style={[
            styles.tab,
            {
              borderBottomColor:
                tabKey === 'globalFeed' ? theme.colors.primary : theme.colors.border,
              borderBottomWidth: tabKey === 'globalFeed' ? 3 : 1,
            },
          ]}
        >
          <TouchableRipple
            style={styles.textWrapper}
            onPress={() => {
              relayPool?.unsubscribe([
                'homepage-contacts-main',
                'homepage-reactions',
                'homepage-contacts-meta',
                'homepage-replies',
              ])
              setTabKey('globalFeed')
            }}
          >
            <Text style={styles.tabText}>{t('homeFeed.globalFeed')}</Text>
          </TouchableRipple>
        </View>
        <View
          style={[
            styles.tab,
            {
              borderBottomColor: tabKey === 'myFeed' ? theme.colors.primary : theme.colors.border,
              borderBottomWidth: tabKey === 'myFeed' ? 3 : 1,
            },
          ]}
        >
          <TouchableRipple
            style={styles.textWrapper}
            onPress={() => {
              relayPool?.unsubscribe(['homepage-global-main'])
              setTabKey('myFeed')
            }}
          >
            <Text style={styles.tabText}>{t('homeFeed.myFeed')}</Text>
          </TouchableRipple>
        </View>
      </View>
      <View style={styles.feed}>{renderScene[tabKey]}</View>
      {privateKey && (
        <AnimatedFAB
          style={[styles.fab, { top: Dimensions.get('window').height - 220 }]}
          icon='pencil-outline'
          label='Label'
          onPress={() => navigate('Send')}
          animateFrom='right'
          iconMode='static'
          extended={false}
        />
      )}
      <RBSheet
        ref={bottomSheetProfileRef}
        closeOnDragDown={true}
        customStyles={bottomSheetStyles}
      >
        <ProfileCard
          userPubKey={profileCardPubkey ?? ''}
          bottomSheetRef={bottomSheetProfileRef}
          showImages={showPublicImages}
        />
      </RBSheet>
    </View>
  )
}

const styles = StyleSheet.create({
  noteCard: {
    marginBottom: 16,
  },
  fab: {
    right: 16,
    position: 'absolute',
  },
  container: {
    padding: 16,
  },
  center: {
    alignContent: 'center',
    textAlign: 'center',
  },
  blank: {
    justifyContent: 'space-between',
    height: 220,
    marginTop: 91,
  },
  tab: {
    flex: 1,
  },
  textWrapper: {
    justifyContent: 'center',
    height: '100%',
    textAlign: 'center'
  },
  tabText: {
    textAlign: 'center',
  },
  tabsNavigator: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
  },
  feed: {
    paddingBottom: 140,
    paddingLeft: 16,
    paddingRight: 16,
  },
})

export default HomeFeed
