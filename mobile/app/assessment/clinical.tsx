import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, Input, Note, Page } from '../../components/UI';
import { useDraft } from '../../store/draft';
import { color, typography, spacing, radius } from '../../constants/theme';

export default function ClinicalStep() {
  const draft = useDraft();
  const [error, setError] = useState('');

  const sexOptions = [
    { id: 'female', label: 'Female' },
    { id: 'male', label: 'Male' },
    { id: 'other', label: 'Other' },
    { id: 'unknown', label: 'Unknown' },
  ];

  const commonSites = [
    'Head / Neck',
    'Upper Extremity',
    'Lower Extremity',
    'Torso / Back',
    'Abdomen',
    'Palms / Soles',
    'Oral / Genital',
  ];

  const handleContinue = () => {
    if (draft.age) {
      const parsed = Number(draft.age);
      if (isNaN(parsed) || parsed < 0 || parsed > 120 || !Number.isInteger(parsed)) {
        return setError('Patient age must be a valid whole number between 0 and 120.');
      }
    }
    setError('');
    router.push('/assessment/review');
  };

  return (
    <Page
      title="Clinical Metadata"
      subtitle="Step 3 of 4 · Patient & Lesion Characteristics"
      badge="Clinical Context"
      showBack
      onBack={() => router.back()}
    >
      <Card>
        <Text style={styles.cardHeading}>Patient Demographics</Text>
        <Text style={styles.cardSub}>
          These features are encoded and evaluated by the clinical XGBoost and ANN branches.
        </Text>

        <Input
          label="Patient Age (years)"
          value={draft.age}
          onChangeText={(val) => {
            draft.set({ age: val });
            if (error) setError('');
          }}
          placeholder="e.g. 52"
          keyboardType="numeric"
          helper="Enter whole years between 0 and 120 (optional but recommended)."
        />

        <Text style={styles.inputLabel}>Biological Sex</Text>
        <View style={styles.pillGroup}>
          {sexOptions.map((opt) => {
            const isSelected = draft.sex === opt.id;
            return (
              <Pressable
                key={opt.id}
                onPress={() => draft.set({ sex: opt.id })}
                style={[styles.pill, isSelected && styles.pillSelected]}
              >
                <Text style={[styles.pillText, isSelected && styles.pillTextSelected]}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Input
          label="Anatomical Location"
          value={draft.anatomical_location}
          onChangeText={(val) => draft.set({ anatomical_location: val })}
          placeholder="e.g. Left forearm, Upper back"
          helper="Specify the anatomical body site of the lesion."
        />

        <Text style={styles.suggestLabel}>Common Clinical Sites:</Text>
        <View style={styles.siteChips}>
          {commonSites.map((site) => (
            <Pressable
              key={site}
              onPress={() => draft.set({ anatomical_location: site.toLowerCase() })}
              style={styles.chip}
            >
              <Text style={styles.chipText}>{site}</Text>
            </Pressable>
          ))}
        </View>
      </Card>

      {error ? <Note danger>{error}</Note> : null}

      <Note variant="info">
        Incomplete clinical fields will be imputed using validated empirical distributions defined in the ensemble schema.
      </Note>

      <Button title="Proceed to Final Review" onPress={handleContinue} />
    </Page>
  );
}

const styles = StyleSheet.create({
  cardHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: color.text,
    marginBottom: 4,
  },
  cardSub: {
    fontSize: 13,
    color: color.textMuted,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: color.text,
    marginBottom: 8,
  },
  pillGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: '#F8FAFC',
  },
  pillSelected: {
    backgroundColor: color.primaryLight,
    borderColor: color.primary,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: color.textMuted,
  },
  pillTextSelected: {
    color: color.primaryDark,
  },
  suggestLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: color.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  siteChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  chipText: {
    fontSize: 11,
    color: color.textMuted,
  },
});
