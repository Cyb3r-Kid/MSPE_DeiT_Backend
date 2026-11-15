import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, Note, Page } from '../components/UI';
import { color, typography, spacing, radius } from '../constants/theme';

export default function Education() {
  const abcde = [
    { letter: 'A', name: 'Asymmetry', desc: 'One half of the lesion does not match the other half in geometry or pigment distribution.' },
    { letter: 'B', name: 'Border', desc: 'The edges are irregular, ragged, notched, or blurred, lacking sharp definition.' },
    { letter: 'C', name: 'Color', desc: 'Non-uniform pigmentation including shades of brown, black, red, white, or blue.' },
    { letter: 'D', name: 'Diameter', desc: 'Lesion exceeds 6 mm in width (approx. pencil eraser), though early melanomas can be smaller.' },
    { letter: 'E', name: 'Evolving', desc: 'Noticeable changes in size, shape, surface elevation, symptoms (itching, bleeding), or color over time.' },
  ];

  const clinicalPearls = [
    {
      title: 'Multimodal Fusion Synergy',
      body: 'Standard dermatological assessment combines visual pattern analysis with patient clinical history (age, sex, anatomic site, personal history). MSPE-DeiT models this exact clinical workflow by combining visual transformer embeddings with tabular clinical models.',
    },
    {
      title: 'The Ugly Duckling Sign',
      body: 'Melanomas often deviate noticeably from the patient’s prevailing nevus pattern. A solitary atypical lesion in a patient with uniform dysplastic nevi demands heightened clinical scrutiny.',
    },
    {
      title: 'Research Model Limitations',
      body: 'AI screening probabilities are sensitive to lighting variations, lens artifacts, skin pigmentation levels, and capture distance. Machine learning outputs are hypothesis-generating and cannot exclude malignancy.',
    },
  ];

  return (
    <Page
      title="Lesion Clinical Guide"
      subtitle="Dermatological Guidelines & Multimodal Principles"
      badge="Clinical Reference"
      showBack
      onBack={() => router.back()}
    >
      {/* The ABCDE Criteria Card */}
      <Card>
        <Text style={styles.cardHeaderTitle}>The ABCDE Criteria of Melanoma</Text>
        <Text style={styles.cardHeaderSub}>
          Established clinical mnemonic used worldwide for identifying atypical melanocytic lesions:
        </Text>

        <View style={styles.abcdeList}>
          {abcde.map((item) => (
            <View key={item.letter} style={styles.abcdeRow}>
              <View style={styles.letterBadge}>
                <Text style={styles.letterText}>{item.letter}</Text>
              </View>
              <View style={styles.abcdeContent}>
                <Text style={styles.abcdeName}>{item.name}</Text>
                <Text style={styles.abcdeDesc}>{item.desc}</Text>
              </View>
            </View>
          ))}
        </View>
      </Card>

      {/* Multimodal Clinical Pearls */}
      {clinicalPearls.map((pearl) => (
        <Card key={pearl.title}>
          <Text style={styles.pearlTitle}>{pearl.title}</Text>
          <Text style={styles.pearlBody}>{pearl.body}</Text>
        </Card>
      ))}

      <Note variant="warning">
        Any lesion demonstrating evolution, bleeding, or persistent ulceration warrants immediate in-person dermatological examination regardless of any algorithmic estimate.
      </Note>

      <Button
        title="Start New Lesion Screening"
        onPress={() => router.push('/assessment/new')}
      />
    </Page>
  );
}

const styles = StyleSheet.create({
  cardHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: color.text,
    marginBottom: 4,
  },
  cardHeaderSub: {
    fontSize: 13,
    color: color.textMuted,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  abcdeList: {
    gap: spacing.sm,
  },
  abcdeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFC',
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: color.border,
  },
  letterBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: color.primaryLight,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  letterText: {
    fontSize: 16,
    fontWeight: '800',
    color: color.primary,
  },
  abcdeContent: {
    flex: 1,
  },
  abcdeName: {
    fontSize: 14,
    fontWeight: '700',
    color: color.text,
    marginBottom: 2,
  },
  abcdeDesc: {
    fontSize: 12,
    color: color.textMuted,
    lineHeight: 17,
  },
  pearlTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: color.text,
    marginBottom: 6,
  },
  pearlBody: {
    fontSize: 13,
    color: color.textMuted,
    lineHeight: 20,
  },
});
