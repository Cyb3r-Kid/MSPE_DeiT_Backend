import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, Note, Page } from '../components/UI';
import { color, typography, spacing, radius } from '../constants/theme';

const steps = [
  {
    icon: '🔬',
    tag: 'Vision Transformer AI',
    title: 'Multimodal Lesion Analysis',
    body: 'MSPE-DeiT fuses dermatological and 3D total-body imagery with patient clinical tabular features to evaluate skin lesion malignancy probability.',
  },
  {
    icon: '📊',
    tag: 'Triple Ensemble',
    title: 'DeiT + XGBoost + ANN',
    body: 'A soft-voting ensemble fuses vision transformer patch embeddings, gradient-boosted tabular trees, and artificial neural networks into a calibrated decision support metric.',
  },
  {
    icon: '🛡️',
    tag: 'Clinical Research Tool',
    title: 'Research & Education',
    body: 'Designed strictly to augment and support clinical investigators. Never replaces histological biopsy, dermoscopy by board-certified specialists, or doctor diagnosis.',
  },
];

export default function Onboarding() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentStep = steps[currentIndex];

  const handleNext = () => {
    if (currentIndex < steps.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      router.replace('/login');
    }
  };

  return (
    <Page
      title={currentStep.title}
      subtitle={`Orientation ${currentIndex + 1} of ${steps.length}`}
      badge="Clinical AI"
    >
      <Card style={styles.card}>
        <View style={styles.iconCircle}>
          <Text style={styles.iconText}>{currentStep.icon}</Text>
        </View>

        <View style={styles.tagBadge}>
          <Text style={styles.tagText}>{currentStep.tag}</Text>
        </View>

        <Text style={styles.bodyText}>{currentStep.body}</Text>

        {/* Step Indicator Dots */}
        <View style={styles.dotsRow}>
          {steps.map((_, idx) => (
            <View
              key={idx}
              style={[
                styles.dot,
                idx === currentIndex ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>
      </Card>

      <Button
        title={currentIndex < steps.length - 1 ? 'Continue' : 'Get Started'}
        onPress={handleNext}
      />

      <Button
        title="Sign In to Existing Account"
        variant="secondary"
        onPress={() => router.replace('/login')}
      />
    </Page>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    marginBottom: spacing.xl,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: color.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  iconText: {
    fontSize: 28,
  },
  tagBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radius.full,
    marginBottom: spacing.md,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
    color: color.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bodyText: {
    ...typography.bodyLarge,
    textAlign: 'center',
    color: color.textMuted,
    lineHeight: 24,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.xl,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  dotActive: {
    width: 24,
    backgroundColor: color.primary,
  },
  dotInactive: {
    width: 8,
    backgroundColor: color.border,
  },
});
