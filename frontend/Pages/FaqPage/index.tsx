import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, View, StyleSheet, LayoutAnimation, Platform, UIManager } from 'react-native';
import { List, Searchbar, Divider, useTheme } from 'react-native-paper';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface FAQItem {
  id: number;
  question: string;
  answer: string;
}

const FAQ: React.FC<{ faq: FAQItem; expanded: boolean; onPress: () => void }> = ({ faq, expanded, onPress }) => {
  const theme = useTheme();

  return (
    <List.Accordion title={faq.question} expanded={expanded} onPress={onPress}>
      <Text numberOfLines={expanded ? undefined : 3} style={[styles.container, { color: theme.colors.onBackground }]}>
        {faq.answer}
      </Text>
    </List.Accordion>
  );
};

const FAQList: React.FC<{ faqs: FAQItem[]; search: string }> = ({ faqs, search }) => {
  const [expandedId, setExpandedId] = React.useState<number | null>(null);

  const handlePress = (id: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId(expandedId === id ? null : id);
  };

  const filteredFaqs = faqs.filter((faq) => faq.question.toLowerCase().includes(search.toLowerCase()));
  const groupedFaqs = filteredFaqs.reduce<{ [key: string]: FAQItem[] }>((groups, faq) => {
    const firstLetter = faq.question[0].toUpperCase();
    if (!groups[firstLetter]) {
      groups[firstLetter] = [];
    }
    groups[firstLetter].push(faq);
    return groups;
  }, {});

  return (
    <ScrollView>
      {Object.entries(groupedFaqs).map(([letter, faqs]) => (
        <View key={letter}>
          <List.Subheader>{letter}</List.Subheader>
          {faqs.map((faq) => (
            <FAQ key={faq.id} faq={faq} expanded={faq.id === expandedId} onPress={() => handlePress(faq.id)} />
          ))}
          <Divider />
        </View>
      ))}
    </ScrollView>
  );
};


interface FaqPageProps {}

const FaqPage: React.FC<FaqPageProps> = () => {
  const [search, setSearch] = React.useState('');
  const { t } = useTranslation('common');
  const theme = useTheme();

  const faqs: FAQItem[] = [
    { id: 1, question: t('faq.note_broadcasting.question'), answer: t('faq.note_broadcasting.answer') },
    { id: 2, question: t('faq.notes_colouring.question'), answer: t('faq.notes_colouring.answer') },
    { id: 3, question: t('faq.resilient_login.question'), answer: t('faq.resilient_login.answer') },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Searchbar
        placeholder={t('faq.searchLabel')}
        value={search}
        onChangeText={setSearch}
      />
      <FAQList faqs={faqs} search={search} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
});

export default FaqPage;
