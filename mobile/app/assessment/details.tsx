import React from 'react';
import { View, Text, StyleSheet, Alert, Image } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Card,
  Loading,
  MetadataRow,
  Note,
  Page,
  StatusBadge,
} from '../../components/UI';
import { api, message } from '../../services/api';
import { Assessment } from '../../types/api';
import { color, typography, spacing, radius } from '../../constants/theme';

export default function Details() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const client = useQueryClient();

  const assessmentQuery = useQuery<Assessment>({
    queryKey: ['assessment', id],
    queryFn: async () => (await api.get(`/assessments/${id}`)).data,
  });

  const handleDelete = () => {
    Alert.alert(
      'Delete Assessment Record?',
      'This will permanently remove the assessment data, uploaded lesion image, and any generated predictions.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Record',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/assessments/${id}`);
              await client.invalidateQueries({ queryKey: ['assessments'] });
              router.replace('/history');
            } catch (error) {
              Alert.alert('Deletion Failed', message(error));
            }
          },
        },
      ]
    );
  };

  const item = assessmentQuery.data;

  return (
    <Page
      title={`Screening #${id}`}
      subtitle="Complete Clinical Assessment Record"
      badge="Archived Case"
      showBack
      onBack={() => router.back()}
    >
      {assessmentQuery.isPending ? (
        <Loading label="Retrieving assessment details..." />
      ) : assessmentQuery.isError ? (
        <Note danger>Could not retrieve this assessment record.</Note>
      ) : !item ? (
        <Note danger>Record not found.</Note>
      ) : (
        <>
          {/* Header Card with Status Badge */}
          <Card>
            <View style={styles.cardHeaderRow}>
              <View>
                <Text style={styles.caseId}>Case #{item.id}</Text>
                <Text style={styles.caseDate}>
                  Logged {new Date(item.created_at).toLocaleString()}
                </Text>
              </View>
              <StatusBadge status={item.status === 'completed' ? 'Completed' : 'Draft'} />
            </View>

            <MetadataRow
              label="Capture Modality"
              value={item.modality === 'dermoscopic' ? 'Dermoscopic' : item.modality}
            />
            <MetadataRow label="Workflow Status" value={item.status.toUpperCase()} />
            <MetadataRow
              label="Image Attached"
              value={item.has_image ? 'Yes (Stored Securely)' : 'No'}
            />
            <MetadataRow
              label="Patient Age"
              value={item.clinical_metadata?.age ? `${item.clinical_metadata.age} years` : 'Not provided'}
            />
            <MetadataRow
              label="Biological Sex"
              value={item.clinical_metadata?.sex ? String(item.clinical_metadata.sex).toUpperCase() : 'Not provided'}
            />
            <MetadataRow
              label="Anatomical Location"
              value={String(item.clinical_metadata?.anatomical_location || 'Not provided')}
              isLast
            />
          </Card>

          {/* Model Prediction Status */}
          {item.prediction ? (
            <Card style={styles.predictionCard}>
              <View style={styles.predHeader}>
                <Text style={styles.predTitle}>Inference Result Available</Text>
                <Text style={styles.predScore}>
                  {(item.prediction.ensemble_probability * 100).toFixed(1)}%
                </Text>
              </View>
              <Text style={styles.predSub}>
                Ensemble Malignancy Score · Version {item.prediction.model_version}
              </Text>
              <Button
                title="View Full Findings & Report"
                onPress={() => router.push({ pathname: '/assessment/result', params: { id } })}
                style={{ marginTop: spacing.md, marginBottom: 0 }}
              />
            </Card>
          ) : (
            <Card>
              <Text style={styles.pendingTitle}>Analysis Not Yet Executed</Text>
              <Text style={styles.pendingDesc}>
                This assessment was saved as a draft or image was uploaded without triggering inference.
              </Text>
              <Button
                title="Run Inference Now"
                onPress={() => router.push({ pathname: '/assessment/processing', params: { id } })}
                style={{ marginTop: spacing.sm, marginBottom: 0 }}
              />
            </Card>
          )}

          {/* Document & Decision Support Actions */}
          <Button
            title="Download PDF Screening Report"
            variant="secondary"
            onPress={() => router.push({ pathname: '/assessment/report', params: { id } })}
          />

          <Button
            title="View Model Explainability"
            variant="secondary"
            onPress={() => router.push({ pathname: '/assessment/explanation', params: { id } })}
          />

          <Button
            title="Delete Assessment Record"
            variant="danger"
            onPress={handleDelete}
          />
        </>
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  caseId: {
    fontSize: 17,
    fontWeight: '700',
    color: color.text,
  },
  caseDate: {
    fontSize: 12,
    color: color.textMuted,
    marginTop: 2,
  },
  predictionCard: {
    borderColor: '#BFDBFE',
    borderWidth: 1.5,
  },
  predHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  predTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: color.text,
  },
  predScore: {
    fontSize: 22,
    fontWeight: '800',
    color: color.primary,
  },
  predSub: {
    fontSize: 12,
    color: color.textMuted,
    marginTop: 2,
  },
  pendingTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: color.text,
    marginBottom: 4,
  },
  pendingDesc: {
    fontSize: 13,
    color: color.textMuted,
    lineHeight: 18,
  },
});
