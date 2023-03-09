import React, { useContext, useEffect, useState } from 'react'
import { StyleSheet, TouchableWithoutFeedback, View } from 'react-native'
import { Avatar, Card, Text, useTheme } from 'react-native-paper'
import FastImage from 'react-native-fast-image'
import { useTranslation } from 'react-i18next'
import LnPreview from '../../LnPreview'
import { decode, PaymentRequestObject, TagsObject } from 'bolt11'
import { AppContext } from '../../../Contexts/AppContext'
import { navigate } from '../../../lib/Navigation'

interface TextContentProps {
  urls: Record<string, string>
  lnUrl?: string
}

export const LinksPreview: React.FC<TextContentProps> = ({ urls, lnUrl }) => {
  const theme = useTheme()
  const { t } = useTranslation('common')
  const { getSatoshiSymbol } = useContext(AppContext)
  const [invoice, setInvoice] = useState<string>()
  const [decodedLnUrl, setDecodedLnUrl] = useState<
    PaymentRequestObject & { tagsObject: TagsObject }
  >()

  const DEFAULT_COVER = '../../../../assets/images/placeholders/placeholder_url.png'
  const MEDIA_COVER = '../../../../assets/images/placeholders/placeholder_media.png'
  const IMAGE_COVER = '../../../../assets/images/placeholders/placeholder_image.png'
  const BLUEBIRD_COVER = '../../../../assets/images/placeholders/placeholder_bluebird.png'
  const MAGNET_COVER = '../../../../assets/images/placeholders/placeholder_magnet.png'

  const firstLink = React.useMemo(
    () => Object.keys(urls).find((url) => urls[url] !== 'image'),
    [urls],
  )
  const imageLinks = React.useMemo(
    () => Object.keys(urls).filter((url) => urls[url] === 'image'),
    [urls],
  )
  const firstImageRow = imageLinks.slice(0, imageLinks.length < 4 ? 3 : 2)
  const secondImageRow = imageLinks.length < 4 ? [] : imageLinks.slice(2, imageLinks.length)

  useEffect(() => {
    if (lnUrl) setDecodedLnUrl(decode(lnUrl))
  }, [lnUrl])

  const handleLnUrlPress: () => void = () => {
    setInvoice(lnUrl)
  }

  const getDefaultCover: () => number = () => {
    if (!firstLink) return require(DEFAULT_COVER)
    if (firstLink === 'magnet') return require(MAGNET_COVER)
    if (firstLink === 'blueBird') return require(BLUEBIRD_COVER)
    if (firstLink === 'audio') return require(MEDIA_COVER)
    if (firstLink === 'video') return require(MEDIA_COVER)
    return require(DEFAULT_COVER)
  }

  const linkPreview = (
    <Card>
      <Card.Cover source={getDefaultCover()} resizeMode='contain' />
      <Card.Content>
        <Text variant='bodyMedium' numberOfLines={3}>
          {firstLink}
        </Text>
      </Card.Content>
    </Card>
  )

  const imagePreview: (
    link: string,
    index: number,
    rowPosition: 'top' | 'bottom',
  ) => JSX.Element = (link, index, rowPosition) => (
    <TouchableWithoutFeedback
      onPress={() =>
        navigate('ImageGallery', {
          urls: Object.keys(urls),
          index: Object.keys(urls).indexOf(link),
        })
      }
    >
      <FastImage
        key={link}
        style={[
          styles.cardCover,
          {
            backgroundColor: theme.colors.backdrop,
            width: `${imageLinks.length < 4 ? 100 / imageLinks.length : 50}%`,
            height: imageLinks.length < 4 ? 180 : 90,
            borderTopLeftRadius: index === 0 && rowPosition === 'top' ? 16 : 0,
            borderTopRightRadius:
              (imageLinks.length === 1 ||
                (imageLinks.length !== 3 && index === 1) ||
                (imageLinks.length === 3 && index === 2)) &&
              rowPosition === 'top'
                ? 16
                : 0,
            borderBottomLeftRadius:
              (index === 0 && imageLinks.length < 4 && rowPosition === 'top') ||
              (index === 0 && rowPosition === 'bottom')
                ? 16
                : 0,
            borderBottomRightRadius:
              (imageLinks.length < 3 && index === imageLinks.length - 1) ||
              (index === 2 && rowPosition === 'top') ||
              (index !== 0 && rowPosition === 'bottom')
                ? 16
                : 0,
          },
        ]}
        source={{
          uri: link,
          priority: FastImage.priority.high,
        }}
        resizeMode={
          imageLinks.length > 1 ? FastImage.resizeMode.cover : FastImage.resizeMode.contain
        }
        defaultSource={require(IMAGE_COVER)}
      />
    </TouchableWithoutFeedback>
  )

  const lnUrlPreview = (
    <Card onPress={handleLnUrlPress}>
      <Card.Title
        title={t('textContent.invoice')}
        subtitle={
          <>
            <Text>{decodedLnUrl?.satoshis}</Text>
            {getSatoshiSymbol(16)}
          </>
        }
        left={(props) => (
          <Avatar.Icon
            {...props}
            icon='lightning-bolt'
            style={{
              backgroundColor: '#F5D112',
            }}
          />
        )}
      />
    </Card>
  )

  return (
    <View>
      {decodedLnUrl && lnUrlPreview}
      {Object.keys(urls).length > 0 && (
        <View style={styles.previewCard}>
          {imageLinks.length > 0 ? (
            <>
              <View style={styles.previewCardRow}>
                {firstImageRow.map((url, index) => imagePreview(url, index, 'top'))}
              </View>
              <View style={styles.previewCardRow}>
                {secondImageRow.map((url, index) => imagePreview(url, index, 'bottom'))}
              </View>
            </>
          ) : firstLink ? (
            linkPreview
          ) : (
            <></>
          )}
        </View>
      )}
      {invoice && <LnPreview invoice={invoice} setInvoice={setInvoice} />}
    </View>
  )
}

const styles = StyleSheet.create({
  previewCard: {
    paddingTop: 16,
  },
  previewCardRow: {
    flexDirection: 'row',
  },
  cardCover: {
    flex: 2,
    margin: 2,
  },
})
