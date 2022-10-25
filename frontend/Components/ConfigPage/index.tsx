import {
  Button,
  Layout,
  TopNavigation,
  TopNavigationAction,
  useTheme,
} from '@ui-kitten/components';
import React, { useContext } from 'react';
import { StyleSheet } from 'react-native';
import { AppContext } from '../../Contexts/AppContext';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useTranslation } from 'react-i18next';
import EncryptedStorage from 'react-native-encrypted-storage';
import { dropTables } from '../../Functions/DatabaseFunctions';
import { RelayPoolContext } from '../../Contexts/RelayPoolContext';

export const ConfigPage: React.FC = () => {
  const theme = useTheme();
  const { setPage, database } = useContext(AppContext);
  const { setPrivateKey, relayPool, publicKey } = useContext(RelayPoolContext);
  const { t } = useTranslation('common');

  const onPressBack: () => void = () => {
    if (publicKey) {
      setPage(`profile#${publicKey}`);
    }
  };

  const onPressLogout: () => void = () => {
    if (database) {
      dropTables(database).then(() => {
        EncryptedStorage.removeItem('privateKey').then(() => {
          setPrivateKey('');
          relayPool?.unsubscribeAll();
          setPage('landing');
        });
      });
    }
  };

  const renderBackAction = (): JSX.Element => (
    <TopNavigationAction
      icon={<Icon name='arrow-left' size={16} color={theme['text-basic-color']} />}
      onPress={onPressBack}
    />
  );

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    actionContainer: {
      marginTop: 30,
      paddingLeft: 32,
      paddingRight: 32,
    },
    button: {
      marginTop: 30,
    },
  });

  return (
    <>
      <Layout style={styles.container} level='2'>
        <TopNavigation
          alignment='center'
          title={t('configPage.title')}
          accessoryLeft={renderBackAction}
        />
        <Layout style={styles.actionContainer} level='2'>
          <Layout style={styles.button}>
            <Button
              onPress={onPressLogout}
              status='danger'
              accessoryLeft={
                <Icon name='power-off' size={16} color={theme['text-basic-color']} solid />
              }
            >
              {t('configPage.logout')}
            </Button>
          </Layout>
        </Layout>
      </Layout>
    </>
  );
};

export default ConfigPage;
