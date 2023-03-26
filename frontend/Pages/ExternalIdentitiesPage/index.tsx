import * as React from 'react'
import { FlatList, Linking, StyleSheet, View, type ListRenderItem } from 'react-native'
import { Button, Card, IconButton, Snackbar, Text, TextInput, useTheme } from 'react-native-paper'
import { useTranslation } from 'react-i18next'
import { useFocusEffect } from '@react-navigation/native'
import { getUser, type User } from '../../Functions/DatabaseFunctions/Users'
import { UserContext } from '../../Contexts/UserContext'
import { AppContext } from '../../Contexts/AppContext'
import { RelayPoolContext } from '../../Contexts/RelayPoolContext'
import { getUnixTime } from 'date-fns'
import { Kind } from 'nostr-tools'

export const ExternalIdentitiesPage: React.FC = () => {
  const { t } = useTranslation('common')
  const theme = useTheme()
  const { database } = React.useContext(AppContext)
  const { publicKey } = React.useContext(UserContext)
  const { lastEventId, sendEvent } = React.useContext(RelayPoolContext)

  const [user, setUser] = React.useState<User>()
  const [showNotification, setShowNotification] = React.useState<string>()
  const [gitHubIdentity, setGitHubIdentity] = React.useState<string>()
  const [gitHubProof, setGitHubProof] = React.useState<string>()
  const [twitterIdentity, setTwitterIdentity] = React.useState<string>()
  const [twitterProof, setTwitterProof] = React.useState<string>()
  const [telegramIdentity, setTelegramIdentity] = React.useState<string>()
  const [telegramProof, setTelegramProof] = React.useState<string>()
  const [mastodonIdentity, setMastodonIdentity] = React.useState<string>()
  const [mastodonProof, setMastodonProof] = React.useState<string>()

  useFocusEffect(
    React.useCallback(() => {
      if (publicKey && database) {
        getUser(publicKey, database).then((result) => {
          if (result) setUser(result)
        })
      }
    }, []),
  )

  React.useEffect(() => {
    if (user) {
      const iTags = user.tags?.filter((tag) => tag[0] === 'i') ?? []
      iTags.forEach((tag) => {
        const data = tag[1].split(':')
        if (tag.length > 2 && data.length > 1 && services[data[0]]) {
          services[data[0]].setIdentity(data[1])
          services[data[0]].setProof(tag[2])
        }
      })
    }
  }, [user, lastEventId])

  const services: Record<
    string,
    {
      identity: string | undefined
      setIdentity: (identity: string | undefined) => void
      proof: string | undefined
      setProof: (proof: string | undefined) => void
      proofFormat: string
      formatUrl: string
    }
  > = {
    twitter: {
      identity: twitterIdentity,
      setIdentity: setTwitterIdentity,
      proof: twitterProof,
      setProof: setTwitterProof,
      proofFormat: '<tweet id>',
      formatUrl: 'https://github.com/nostr-protocol/nips/blob/master/39.md#twitter',
    },
    telegram: {
      identity: telegramIdentity,
      setIdentity: setTelegramIdentity,
      proof: telegramProof,
      setProof: setTelegramProof,
      proofFormat: '<group id>/<message id>',
      formatUrl: 'https://github.com/nostr-protocol/nips/blob/master/39.md#telegram',
    },
    github: {
      identity: gitHubIdentity,
      setIdentity: setGitHubIdentity,
      proof: gitHubProof,
      setProof: setGitHubProof,
      proofFormat: '<gist id>',
      formatUrl: 'https://github.com/nostr-protocol/nips/blob/master/39.md#github',
    },
    mastodon: {
      identity: mastodonIdentity,
      setIdentity: setMastodonIdentity,
      proof: mastodonProof,
      setProof: setMastodonProof,
      proofFormat: '<instance>/@<username>',
      formatUrl: 'https://github.com/nostr-protocol/nips/blob/master/39.md#mastodon',
    },
  }

  const sendUser: (newUser: User) => void = (newUser) => {
    if (user && publicKey) {
      sendEvent({
        content: JSON.stringify({
          name: user.name,
          about: user.about,
          lud06: user.lnurl,
          lud16: user.ln_address,
          nip05: user.nip05,
          picture: user.picture,
        }),
        created_at: getUnixTime(new Date()),
        kind: Kind.Metadata,
        pubkey: publicKey,
        tags: user.tags ?? [],
      }).then(() => setShowNotification('identityUpdated'))
    }
  }

  const removeTagService: (tags: string[][] | undefined, service: string) => string[][] = (
    tags,
    service,
  ) => {
    if (!tags) return []
    return tags.filter((tag) => {
      if (tag[0] !== 'i') return true
      const data = tag[1].split(':')
      return data.length > 1 && data[0] !== service
    })
  }

  const bindEntity: (service: string) => void = (service) => {
    if (user && publicKey) {
      const newUser = user
      const newTags = removeTagService(user.tags, service)
      newUser.tags = newTags ?? []
      sendUser(newUser)
      services[service].setIdentity(undefined)
      services[service].setProof(undefined)
    }
  }

  const publishEntity: (service: string) => void = (service) => {
    if (user && publicKey && services[service].identity && services[service].proof) {
      const newUser = user
      const newTags = removeTagService(user.tags, service)
      newTags?.push([
        'i',
        `${service}:${services[service].identity}`,
        services[service].proof ?? '',
      ])
      newUser.tags = newTags
      sendUser(newUser)
    }
  }

  const renderItem: ListRenderItem<string> = ({ item }) => {
    const serviceFunctions = services[item]
    return (
      <Card key={item} style={styles.card}>
        <Card.Title
          titleStyle={styles.cardTitle}
          title={item}
          right={() => (
            <IconButton
              icon='open-in-new'
              onPress={async () => await Linking.openURL(serviceFunctions.formatUrl)}
            />
          )}
        />
        <Card.Content>
          <TextInput
            style={styles.input}
            mode='outlined'
            label={t('extenarlIdentitiedPage.identity') ?? ''}
            value={serviceFunctions.identity}
            onChangeText={serviceFunctions.setIdentity}
          />
          <TextInput
            mode='outlined'
            label={t('extenarlIdentitiedPage.proof') ?? ''}
            value={serviceFunctions.proof}
            onChangeText={serviceFunctions.setProof}
          />
          <Text style={[styles.input, { color: theme.colors.onSurfaceVariant }]}>
            {serviceFunctions.proofFormat}
          </Text>
        </Card.Content>
        <Card.Actions>
          <Button style={styles.button} onPress={() => bindEntity(item)}>
            {t('extenarlIdentitiedPage.bind')}
          </Button>
          <Button
            style={styles.button}
            onPress={() => publishEntity(item)}
            disabled={services[item].identity === undefined || services[item].proof === undefined}
          >
            {t('extenarlIdentitiedPage.publish')}
          </Button>
        </Card.Actions>
      </Card>
    )
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={Object.keys(services)}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
      />
      {showNotification && (
        <Snackbar
          style={styles.snackbar}
          visible={showNotification !== undefined}
          duration={Snackbar.DURATION_SHORT}
          onIconPress={() => setShowNotification(undefined)}
          onDismiss={() => setShowNotification(undefined)}
        >
          {t(`profilePage.${showNotification}`)}
        </Snackbar>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  center: {
    alignContent: 'center',
    textAlign: 'center',
  },
  blank: {
    justifyContent: 'space-between',
    height: 170,
    marginTop: 50,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignContent: 'center',
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginRight: 16,
    marginBottom: 16,
  },
  cardTitle: {
    textTransform: 'capitalize',
  },
  card: {
    marginBottom: 16,
    marginRight: 16,
    marginLeft: 16,
  },
  snackbar: {
    marginLeft: 16,
    bottom: 16,
    flex: 1,
  },
})

export default ExternalIdentitiesPage
