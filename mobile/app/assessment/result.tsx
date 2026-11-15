import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  Button,
  Card,
  Loading,
  MetadataRow,
  Note,
  Page,
  ProbabilityBar,
  StatusBadge,
} from '../../components/UI';
import { api } from '../../services/api';
import { Assessment } from '../../types/api';
import { color, typography, spacing, radius } from '../../constants/theme';

export default function Result() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const assessmentQuery = useQuery<Assessment>({
    queryKey: ['assessment', id],
    queryFn: async () => (await api.get(`/assessments/${id}`)).data,
  });

  const item = assessmentQuery.data;
  const p = item?.prediction;

  // Determine clinical research risk level
  const ensembleProb = p?.ensemble_probability ?? 0;
  let riskLevel = 'Low Risk';
  let recommendation = 'Routine clinical monitoring recommended. Examine if new changes occur.';
  if (ensembleProb >= 0.55) {
    riskLevel = 'High Risk';
    recommendation = 'Urgent dermatological assessment and histological biopsy evaluation recommended.';
  } else if (ensembleProb >= 0.25) {
    riskLevel = 'Moderate Risk';
    recommendation = 'Prompt specialist review with serial dermatoscopy recommended.';
  }

  return (
    <Page
      title="Screening Report"
      subtitle={`Assessment #${id} · Multimodal Ensemble Findings`}
      badge="Decision Support"
      showBack
      onBack={() => router.replace('/history')}
    >
      {assessmentQuery.isPending ? (
        <Loading label="Loading multimodal assessment..." />
      ) : assessmentQuery.isError ? (
        <Note danger>Could not load assessment #{id}. Verify server connection.</Note>
      ) : !p ? (
        <Card>
          <Text style={styles.noPredTitle}>No Prediction Available</Text>
          <Text style={styles.noPredDesc}>
            Inference has not been executed for this assessment record.
          </Text>
          <Button
            title="Execute Model Inference"
            onPress={() => router.replace({ pathname: '/assessment/processing', params: { id } })}
          />
        </Card>
      ) : (
        <>
          {/* Main Risk Level & Malignancy Probability Hero Card */}
          <Card style={styles.heroCard}>
            <View style={styles.heroHeaderRow}>
              <View>
                <Text style={styles.heroLabel}>Ensemble Malignancy Score</Text>
                <Text style={styles.heroScore}>{(ensembleProb * 100).toFixed(1)}%</Text>
              </View>
              <StatusBadge status={riskLevel} />
            </View>

            <View style={styles.recommendationBox}>
              <Text style={styles.recTitle}>Clinical Recommendation:</Text>
              <Text style={styles.recText}>{recommendation}</Text>
            </View>
          </Card>

          {/* Three-Model Calibrated Probability Breakdown */}
          <Card>
            <Text style={styles.sectionTitle}>Tri-Branch Model Probabilities</Text>
            <Text style={styles.sectionSub}>
              Individual branch outputs calibrated prior to soft-voting fusion:
            </Text>

            <ProbabilityBar
              label="MSPE-DeiT (Vision Transformer)"
              modelName={`Modality-Specific Patch Embedding (${item.modality})`}
              value={p.image_probability}
              threshold={p.threshold}
            />

            <ProbabilityBar
              label="Clinical XGBoost"
              modelName="Engineered Tabular Gradient Boosting Trees"
              value={p.xgboost_probability}
              threshold={p.threshold}
            />

            <ProbabilityBar
              label="Clinical Tabular ANN"
              modelName="3-Dense-Block Neural Network"
              value={p.ann_probability}
              threshold={p.threshold}
            />

            <View style={styles.modelMetaFooter}>
              <Text style={styles.modelMetaText}>
                Model: {p.model_version} · Calibration: {p.calibration_version} · Threshold: {p.threshold.toFixed(2)}
              </Text>
            </View>
          </Card>

          {/* Clinical Parameters Verified */}
          <Card>
            <Text style={styles.sectionTitle}>Screening Parameters</Text>
            <MetadataRow
              label="Capture Modality"
              value={item.modality === 'dermoscopic' ? 'Dermoscopic Image' : item.modality}
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

          {/* Mandatory Regulatory & Medical Disclaimer */}
          <Note variant="warning">
            This application is intended for research and educational purposes. AI-generated results are not a substitute for professional medical diagnosis, dermoscopic dermato-oncology consultation, or biopsy.
          </Note>

          {/* Report Actions */}
          <Button
            title="Download & Share PDF Report"
            onPress={() => router.push({ pathname: '/assessment/report', params: { id } })}
          />

          <Button
            title="View Model Explainability"
            variant="secondary"
            onPress={() => router.push({ pathname: '/assessment/explanation', params: { id } })}
          />

          <Button
            title="Return to Screening History"
            variant="outline"
            onPress={() => router.replace('/history')}
          />
        </>
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    padding: spacing.xl,
    borderColor: '#BFDBFE',
    borderWidth: 1.5,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  heroLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: color.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  heroScore: {
    fontSize: 44,
    fontWeight: '800',
    color: color.text,
    letterSpacing: -1,
  },
  recommendationBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: radius.md,
    padding: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: color.primary,
  },
  recTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: color.text,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  recText: {
    fontSize: 13,
    color: color.textMuted,
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: color.text,
    marginBottom: 4,
  },
  sectionSub: {
    fontSize: 12,
    color: color.textMuted,
    marginBottom: spacing.md,
  },
  modelMetaFooter: {
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  modelMetaText: {
    fontSize: 11,
    color: color.textSubtle,
    textAlign: 'center',
  },
  noPredTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: color.text,
    marginBottom: 4,
  },
  noPredDesc: {
    fontSize: 13,
    color: color.textMuted,
    marginBottom: spacing.md,
  },
});
