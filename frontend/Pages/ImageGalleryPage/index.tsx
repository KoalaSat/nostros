import * as React from 'react'
import { Linking, ScrollView, StyleSheet, TouchableWithoutFeedback, View } from 'react-native'
import FastImage from 'react-native-fast-image'
import { useTheme } from 'react-native-paper'

interface ImageGalleryPageProps {
  route: { params: { urls: string[]; index?: number } }
}

export const ImageGalleryPage: React.FC<ImageGalleryPageProps> = ({ route }) => {
  const theme = useTheme()
  const IMAGE_COVER = '../../../assets/images/placeholders/placeholder_image.png'
  const [displayIndex, setDisplayIndex] = React.useState<number>(route.params.index ?? 0)

  return (
    <View style={styles.container}>
      <TouchableWithoutFeedback
        onPress={async () => await Linking.openURL(route.params.urls[displayIndex])}
      >
        <FastImage
          style={[
            styles.focusImage,
            {
              backgroundColor: theme.colors.backdrop,
            },
          ]}
          source={{
            uri: route.params.urls[displayIndex],
            priority: FastImage.priority.high,
          }}
          resizeMode={FastImage.resizeMode.contain}
          defaultSource={require(IMAGE_COVER)}
        />
      </TouchableWithoutFeedback>
      <View style={styles.roulette}>
        <ScrollView horizontal>
          {route.params.urls.map((url, index) => (
            <TouchableWithoutFeedback key={index} onPress={() => setDisplayIndex(index)}>
              <FastImage
                style={styles.rouletteImage}
                source={{
                  uri: url,
                  priority: FastImage.priority.normal,
                }}
                resizeMode={FastImage.resizeMode.contain}
                defaultSource={require(IMAGE_COVER)}
              />
            </TouchableWithoutFeedback>
          ))}
        </ScrollView>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    flex: 1,
  },
  focusImage: {
    flex: 1,
  },
  rouletteImage: {
    width: 80,
    margin: 8,
    borderRadius: 16,
  },
  roulette: {
    flexDirection: 'row',
    height: 100,
  },
})

export default ImageGalleryPage
