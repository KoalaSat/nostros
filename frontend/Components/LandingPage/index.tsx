import React from 'react';
import { Layout, Text } from '@ui-kitten/components';
import { StyleSheet } from 'react-native';
import Loading from '../Loading';
import Logger from './Logger';

export const LandingPage: React.FC = () => {
  const styles = StyleSheet.create({
    tab: {
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
    },
    svg: {
      height: 340,
      width: 340,
    },
    title: {
      marginTop: -40,
      marginBottom: -20,
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 45,
    },
  });

  return (
    <Layout style={styles.tab}>
      <Layout style={styles.svg}>
        <Loading />
      </Layout>
      <Text style={styles.title} category='h1'>
        NOSTROS
      </Text>
      <Logger />
    </Layout>
  );
};

export default LandingPage;
