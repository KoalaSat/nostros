import * as React from 'react'
import { useTranslation } from 'react-i18next'
import {
  Text,
  View,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
  type ListRenderItem,
  FlatList,
} from 'react-native'
import { List, Searchbar, useTheme } from 'react-native-paper'

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

interface FAQItem {
  id: number
  question: string
  answer: string
  group: string
}

const FAQ: React.FC<{ item: FAQItem }> = ({ item }) => {
  const [expanded, setExpanded] = React.useState<boolean>(false)
  const theme = useTheme()

  return (
    <List.Accordion
      title={item.question}
      expanded={expanded}
      onPress={() => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
        setExpanded((prev) => !prev)
      }}
      titleStyle={styles.faqItemTitle}
    >
      <Text numberOfLines={expanded ? undefined : 3} style={StyleSheet.flatten([{color: theme.colors.onBackground}, styles.faqItemContent])}>{item.answer}</Text>
    </List.Accordion>
  )
}

const FaqPage: React.FC = () => {
  const [search, setSearch] = React.useState('')
  const { t } = useTranslation('common')
  const theme = useTheme()
  const faqs: FAQItem[] = React.useMemo(
    () =>
      [
        // {
        //   id: 1,
        //   question: t('faq.note_broadcasting.question'),
        //   answer: t('faq.note_broadcasting.answer'),
        //   group: '',
        // },
        {
          id: 2,
          question: t('faq.notes_colouring.question'),
          answer: t('faq.notes_colouring.answer'),
          group: '',
        },
        {
          id: 3,
          question: t('faq.resilient_login.question'),
          answer: t('faq.resilient_login.answer'),
          group: '',
        },
        {
          id: 4,
          question: t('faq.what_are_zaps.question'),
          answer: t('faq.what_are_zaps.answer'),
          group: '',
        },
        {
          id: 5,
          question: t('faq.what_are_relays.question'),
          answer: t('faq.what_are_relays.answer'),
          group: '',
        },
        {
          id: 6,
          question: t('faq.relays_paid_vs_free.question'),
          answer: t('faq.relays_paid_vs_free.answer'),
          group: '',
        },
        {
          id: 7,
          question: t('faq.what_are_nips.question'),
          answer: t('faq.what_are_nips.answer'),
          group: '',
        },
        {
          id: 8,
          question: t('faq.nostros_nip_support.question'),
          answer: t('faq.nostros_nip_support.answer'),
          group: '',
        },
      ]
        .map((item) => {
          item.group = item.question[0].toLowerCase()
          return item
        })
        .sort((a, b) => (a.group < b.group ? -1 : 1)),
    [],
  )
  const [visibleFaqs, setVisibleFaqs] = React.useState<FAQItem[]>(faqs)

  React.useEffect(() => {
    if (search !== '') {
      const searchLower = search.toLowerCase()
      setVisibleFaqs(faqs.filter((item) => item.question.toLowerCase().includes(searchLower)))
    } else {
      setVisibleFaqs(faqs)
    }
  }, [search])

  const renderItem: ListRenderItem<FAQItem> = ({ item, index }) => {
    return (
      <>
        {(index === 0 || visibleFaqs[index - 1].group !== item.group) && (
          <List.Subheader>{item.group.toUpperCase()}</List.Subheader>
        )}
        <FAQ item={item} />
      </>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Searchbar placeholder={t('faq.searchLabel') ?? ''} value={search} onChangeText={setSearch} />
      <FlatList data={visibleFaqs} renderItem={renderItem} style={styles.list} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    flex: 1,
  },
  faqItemTitle: {
    fontSize: 18
  },
  faqItemContent: {
    fontSize: 16,
    lineHeight: 24,
  }
})

export default FaqPage
