import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, Note, Page } from '../../components/UI';
import { color, typography, spacing, radius } from '../../constants/theme';

export default function NewAssessment() {
  return (
    <Page
      title="New Screening"
      subtitle="Step 1 of 4 · Modality & Image Protocol"
      badge="Protocol Check"
      showBack
      onBack={() => router.back()}
    >
      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Validated Image Modalities</Text>
        <Text style={styles.sectionDescription}>
          The MSPE-DeiT multimodal architecture implements modality-specific patch projection trained on standardized clinical datasets:
        </Text>

        <View style={styles.modalityList}>
          <View style={styles.modalityItem}>
            <View style={styles.modalityPill}>
              <Text style={styles.modalityPillText}>✓ Supported</Text>
            </View>
            <Text style={styles.modalityName}>Dermoscopy Imagery</Text>
            <Text style={styles.modalityDetail}>
              Epiluminescence microscopy images with standard immersion fluid or cross-polarization.
            </Text>
          </View>

          <View style={styles.modalityItem}>
            <View style={styles.modalityPill}>
              <Text style={styles.modalityPillText}>✓ Supported</Text>
            </View>
            <Text style={styles.modalityName}>3D-TBP Lesion Crop</Text>
            <Text style={styles.modalityDetail}>
              High-resolution crops extracted from calibrated 3D total-body photography scanning arrays.
            </Text>
          </View>

          <View style={[styles.modalityItem, styles.modalityItemUnsupported]}>
            <View style={[styles.modalityPill, styles.modalityPillWarn]}>
              <Text style={[styles.modalityPillText, styles.modalityPillTextWarn]}>✕ Unsupported</Text>
            </View>
            <Text style={styles.modalityName}>Standard Smartphone Photography</Text>
            <Text style={styles.modalityDetail}>
              Non-dermoscopic consumer cameras lack calibrated optical resolution and cannot be analyzed by this model.
            </Text>
          </View>
        </View>
      </Card>

      <Note variant="info">
        Ensure your active consent settings permit research assessment and image storage before proceeding.
      </Note>

      <Button
        title="Proceed to Image Selection"
        onPress={() => router.push('/assessment/image')}
      />

      <Button
        title="Review Privacy & Consent Settings"
        variant="secondary"
        onPress={() => router.push('/privacy')}
      />
    </Page>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: color.text,
    marginBottom: 6,
  },
  sectionDescription: {
    ...typography.bodyMedium,
    color: color.textMuted,
    lineHeight: 21,
    marginBottom: spacing.lg,
  },
  modalityList: {
    gap: spacing.md,
  },
  modalityItem: {
    backgroundColor: '#F8FAFC',
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: color.border,
  },
  modalityItemUnsupported: {
    borderColor: '#FED7AA',
    backgroundColor: '#FFFBEB',
  },
  modalityPill: {
    alignSelf: 'flex-start',
    backgroundColor: color.successLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    marginBottom: 6,
  },
  modalityPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: color.success,
  },
  modalityPillWarn: {
    backgroundColor: color.warningLight,
  },
  modalityPillTextWarn: {
    color: color.warning,
  },
  modalityName: {
    fontSize: 15,
    fontWeight: '700',
    color: color.text,
    marginBottom: 4,
  },
  modalityDetail: {
    fontSize: 13,
    color: color.textMuted,
    lineHeight: 18,
  },
});
