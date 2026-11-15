import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Button, Card, Note, Page } from '../../components/UI';
import { useDraft } from '../../store/draft';
import { color, typography, spacing, radius } from '../../constants/theme';

export default function ImageStep() {
  const draft = useDraft();
  const [error, setError] = useState('');

  const pickImage = async (useCamera: boolean) => {
    setError('');
    try {
      const permission = useCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        return setError('Permission is required to access the device media/camera.');
      }

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            quality: 0.95,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.95,
          });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        draft.set({
          image: asset.uri,
          // If taken with direct smartphone camera, mark modality as smartphone unless user explicitly chooses a dermatoscope attachment
          modality: useCamera ? 'smartphone' : draft.modality,
        });
      }
    } catch {
      setError('Could not complete image selection. Please try again.');
    }
  };

  const modalities: Array<{
    id: 'dermoscopic' | 'tbp_3d' | 'smartphone';
    title: string;
    description: string;
    valid: boolean;
  }> = [
    {
      id: 'dermoscopic',
      title: 'Dermoscopic Image',
      description: 'Polarized or non-polarized epiluminescence dermoscopy',
      valid: true,
    },
    {
      id: 'tbp_3d',
      title: '3D-TBP Lesion Crop',
      description: 'Crop from calibrated 3D total-body photography array',
      valid: true,
    },
    {
      id: 'smartphone',
      title: 'Smartphone Camera Photo',
      description: 'Non-magnified macro photo (Inference blocked)',
      valid: false,
    },
  ];

  return (
    <Page
      title="Lesion Imagery"
      subtitle="Step 2 of 4 · Modality & Image Capture"
      badge="Modality Selection"
      showBack
      onBack={() => router.back()}
    >
      {/* Modality Picker */}
      <Card>
        <Text style={styles.cardHeading}>Select Capture Modality</Text>
        <Text style={styles.cardSub}>
          The MSPE-DeiT vision transformer dynamically routes inputs to modality-specific projection weights.
        </Text>

        <View style={styles.modalityContainer}>
          {modalities.map((item) => {
            const isSelected = draft.modality === item.id;
            return (
              <Pressable
                key={item.id}
                onPress={() => draft.set({ modality: item.id })}
                style={[
                  styles.modalityButton,
                  isSelected && styles.modalityButtonSelected,
                  !item.valid && styles.modalityButtonWarn,
                ]}
              >
                <View style={styles.modalityHeaderRow}>
                  <View style={styles.modalityTitleRow}>
                    <View
                      style={[
                        styles.radioCircle,
                        isSelected && styles.radioCircleSelected,
                      ]}
                    >
                      {isSelected ? <View style={styles.radioInner} /> : null}
                    </View>
                    <Text
                      style={[
                        styles.modalityTitle,
                        isSelected && styles.modalityTitleSelected,
                      ]}
                    >
                      {item.title}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.validPill,
                      item.valid ? styles.validPillOk : styles.validPillWarn,
                    ]}
                  >
                    <Text
                      style={[
                        styles.validPillText,
                        item.valid ? styles.validPillTextOk : styles.validPillTextWarn,
                      ]}
                    >
                      {item.valid ? 'Supported' : 'Unsupported'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.modalityDesc}>{item.description}</Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      {/* Image Preview or Upload CTA */}
      {draft.image ? (
        <Card style={styles.previewCard}>
          <Text style={styles.cardHeading}>Selected Lesion Image</Text>
          <View style={styles.imageWrapper}>
            <Image source={{ uri: draft.image }} style={styles.previewImage} resizeMode="cover" />
          </View>

          <View style={styles.previewActions}>
            <Button
              title="Replace Image"
              variant="secondary"
              size="small"
              onPress={() => pickImage(false)}
              style={{ flex: 1, marginRight: spacing.sm, marginBottom: 0 }}
            />
            <Button
              title="Remove"
              variant="danger"
              size="small"
              onPress={() => draft.set({ image: null })}
              style={{ width: 90, marginBottom: 0 }}
            />
          </View>
        </Card>
      ) : (
        <Card style={styles.uploadArea}>
          <View style={styles.uploadIconCircle}>
            <Text style={styles.uploadIcon}>📷</Text>
          </View>
          <Text style={styles.uploadTitle}>No Lesion Image Selected</Text>
          <Text style={styles.uploadSub}>
            Select a high-resolution JPEG or PNG lesion image (minimum 224×224 pixels, maximum 10 MB).
          </Text>

          <View style={styles.uploadButtonRow}>
            <Button
              title="Choose from Gallery"
              onPress={() => pickImage(false)}
              style={{ flex: 1, marginRight: spacing.sm, marginBottom: 0 }}
            />
            <Button
              title="Take Photo"
              variant="secondary"
              onPress={() => pickImage(true)}
              style={{ flex: 1, marginBottom: 0 }}
            />
          </View>
        </Card>
      )}

      {draft.modality === 'smartphone' ? (
        <Note danger>
          Ordinary smartphone macro photos have not been validated for this model. You may store this record as a draft, but AI inference will be blocked by the server.
        </Note>
      ) : null}

      {error ? <Note danger>{error}</Note> : null}

      <Button
        title="Continue to Clinical Metadata"
        disabled={!draft.image}
        onPress={() => router.push('/assessment/clinical')}
      />
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
  modalityContainer: {
    gap: spacing.sm,
  },
  modalityButton: {
    backgroundColor: '#F8FAFC',
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: color.border,
  },
  modalityButtonSelected: {
    borderColor: color.primary,
    backgroundColor: color.primaryLight,
  },
  modalityButtonWarn: {
    borderColor: '#FED7AA',
  },
  modalityHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  modalityTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: color.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  radioCircleSelected: {
    borderColor: color.primary,
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: color.primary,
  },
  modalityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: color.text,
  },
  modalityTitleSelected: {
    color: color.primaryDark,
    fontWeight: '700',
  },
  modalityDesc: {
    fontSize: 12,
    color: color.textMuted,
    marginLeft: 28,
  },
  validPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  validPillOk: {
    backgroundColor: color.successLight,
  },
  validPillWarn: {
    backgroundColor: color.warningLight,
  },
  validPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  validPillTextOk: {
    color: color.success,
  },
  validPillTextWarn: {
    color: color.warning,
  },
  uploadArea: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  uploadIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  uploadIcon: {
    fontSize: 26,
  },
  uploadTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: color.text,
    marginBottom: 4,
  },
  uploadSub: {
    fontSize: 12,
    color: color.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  uploadButtonRow: {
    flexDirection: 'row',
    width: '100%',
  },
  previewCard: {
    padding: spacing.md,
  },
  imageWrapper: {
    width: '100%',
    height: 240,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: '#0F172A',
    marginBottom: spacing.md,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewActions: {
    flexDirection: 'row',
  },
});
