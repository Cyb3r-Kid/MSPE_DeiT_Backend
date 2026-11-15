import React, { useState } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, MetadataRow, Note, Page, StatusBadge } from '../../components/UI';
import { api, message } from '../../services/api';
import { useDraft } from '../../store/draft';
import { buildImageFormData } from '../../services/upload';
import { color, typography, spacing, radius } from '../../constants/theme';

export default function Review() {
  const draft = useDraft();
  const [error, setError] = useState<string>('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!draft.image) {
      return setError('Please choose or capture a lesion image first.');
    }
    if (draft.age) {
      const num = Number(draft.age);
      if (isNaN(num) || num < 0 || num > 120 || !Number.isInteger(num)) {
        return setError('Patient age must be a whole number between 0 and 120.');
      }
    }

    setBusy(true);
    setError('');

    try {
      const clinical_metadata = {
        age: draft.age ? Number(draft.age) : null,
        sex: draft.sex || null,
        anatomical_location: draft.anatomical_location || null,
      };

      // Step 1: Create assessment record with validated modality
      const { data } = await api.post('/assessments', {
        modality: draft.modality,
        clinical_metadata,
      });

      // Step 2: Build platform-specific multipart FormData
      const formData = await buildImageFormData(draft.image, 'file');

      // Step 3: Upload image via multipart/form-data
      await api.post(`/assessments/${data.id}/image`, formData, {
        timeout: 60000,
      });

      // Step 4: Proceed to inference processing stepper
      router.replace({ pathname: '/assessment/processing', params: { id: String(data.id) } });
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  };

  const isConsentError = typeof error === 'string' && error.toLowerCase().includes('consent');

  const modalityLabel =
    draft.modality === 'tbp_3d'
      ? '3D-TBP Lesion Crop'
      : draft.modality === 'dermoscopic'
      ? 'Dermoscopic Image'
      : 'Smartphone Photo (Unsupported)';

  return (
    <Page
      title="Review Screening"
      subtitle="Step 4 of 4 · Verify Inputs Before Submission"
      badge="Protocol Verification"
      showBack
      onBack={() => router.back()}
    >
      {/* Lesion Image Preview */}
      {draft.image ? (
        <Card style={styles.imageCard}>
          <View style={styles.imageHeader}>
            <Text style={styles.cardSectionTitle}>Lesion Imagery</Text>
            <StatusBadge
              status={draft.modality === 'smartphone' ? 'High Risk' : 'Uploaded'}
            />
          </View>
          <View style={styles.imageThumbnailWrapper}>
            <Image
              source={{ uri: draft.image }}
              style={styles.imageThumbnail}
              resizeMode="cover"
            />
          </View>
          <Button
            title="Change Lesion Image"
            variant="secondary"
            size="small"
            onPress={() => router.push('/assessment/image')}
            style={{ marginBottom: 0 }}
          />
        </Card>
      ) : null}

      {/* Clinical Metadata Summary Table */}
      <Card>
        <View style={styles.tableHeader}>
          <Text style={styles.cardSectionTitle}>Screening Parameters</Text>
          <Button
            title="Edit"
            variant="secondary"
            size="small"
            onPress={() => router.push('/assessment/clinical')}
            style={{ minHeight: 32, paddingHorizontal: 12, marginBottom: 0 }}
          />
        </View>

        <MetadataRow label="Selected Modality" value={modalityLabel} />
        <MetadataRow label="Patient Age" value={draft.age ? `${draft.age} years` : 'Not provided'} />
        <MetadataRow label="Biological Sex" value={draft.sex ? draft.sex.toUpperCase() : 'Not provided'} />
        <MetadataRow
          label="Anatomical Site"
          value={draft.anatomical_location || 'Not provided'}
          isLast
        />
      </Card>

      {/* Consent & Protocol Requirements Note */}
      <Note variant="info">
        Submission authenticates with your active institutional consent. Revoking consent in Privacy stops future analyses.
      </Note>

      {draft.modality === 'smartphone' ? (
        <Note danger>
          Smartphone photographs cannot be evaluated by the research model. The assessment can be archived, but inference will be blocked by the server.
        </Note>
      ) : null}

      {error ? <Note danger>{error}</Note> : null}

      {isConsentError ? (
        <Button
          title="Open Privacy & Consent Settings"
          variant="outline"
          onPress={() => router.push('/privacy')}
        />
      ) : null}

      <Button
        title={busy ? 'Uploading & Preparing...' : 'Submit & Analyze Lesion'}
        loading={busy}
        disabled={busy}
        onPress={submit}
      />

      <Button
        title="Save as Draft and Exit"
        variant="secondary"
        onPress={() => router.replace('/home')}
      />
    </Page>
  );
}

const styles = StyleSheet.create({
  imageCard: {
    padding: spacing.md,
  },
  imageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  cardSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: color.text,
  },
  imageThumbnailWrapper: {
    width: '100%',
    height: 200,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: '#0F172A',
    marginBottom: spacing.md,
  },
  imageThumbnail: {
    width: '100%',
    height: '100%',
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
});
