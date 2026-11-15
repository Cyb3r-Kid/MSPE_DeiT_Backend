import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Card, Note, Page } from '../../components/UI';
import { api, message } from '../../services/api';
import { color, typography, spacing, radius } from '../../constants/theme';

export default function Processing() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [stage, setStage] = useState('Verifying model status');
  const [stageIndex, setStageIndex] = useState(0);
  const [error, setError] = useState('');
  const [retrying, setRetrying] = useState(false);

  const stages = [
    { title: 'Verifying Model Status', desc: 'Confirming MSPE-DeiT and clinical checkpoints are initialized.' },
    { title: 'Validating Multimodal Inputs', desc: 'Preprocessing image tensors and normalizing tabular features.' },
    { title: 'Executing Soft-Voting Ensemble', desc: 'Fusing DeiT-Tiny image embeddings with XGBoost and ANN branches.' },
    { title: 'Generating Calibrated Report', desc: 'Finalizing assessment record and calibrating risk thresholds.' },
  ];

  const runInference = async () => {
    setError('');
    setRetrying(true);
    try {
      setStageIndex(0);
      setStage(stages[0].title);

      // Check model system status
      const { data: statusData } = await api.get('/models/status');
      if (!statusData.ready) {
        setError('Research model system unavailable. Required trained checkpoints are missing on the server. Your assessment draft has been saved.');
        return;
      }

      setStageIndex(1);
      setStage(stages[1].title);

      setStageIndex(2);
      setStage(stages[2].title);

      // Trigger server inference
      await api.post(`/assessments/${id}/analyze`, {}, { timeout: 120000 });

      setStageIndex(3);
      setStage(stages[3].title);

      // Navigate to results report
      router.replace({ pathname: '/assessment/result', params: { id } });
    } catch (e) {
      setError(message(e));
    } finally {
      setRetrying(false);
    }
  };

  useEffect(() => {
    let active = true;
    runInference();
    return () => {
      active = false;
    };
  }, [id]);

  return (
    <Page
      title="Processing Screening"
      subtitle={`Assessment #${id} · Multimodal Pipeline Execution`}
      badge="Neural Computation"
    >
      <Card style={styles.card}>
        {!error ? (
          <View style={styles.processingContent}>
            <View style={styles.spinnerWrapper}>
              <ActivityIndicator size="large" color={color.primary} />
            </View>

            <Text style={styles.stageTitle}>{stage}</Text>
            <Text style={styles.stageDesc}>{stages[stageIndex]?.desc || 'Running multimodal inference.'}</Text>

            {/* Stepper Steps */}
            <View style={styles.stepperContainer}>
              {stages.map((st, idx) => {
                const isCurrent = idx === stageIndex;
                const isDone = idx < stageIndex;
                return (
                  <View key={st.title} style={styles.stepRow}>
                    <View
                      style={[
                        styles.stepIndicator,
                        isDone && styles.stepIndicatorDone,
                        isCurrent && styles.stepIndicatorCurrent,
                      ]}
                    >
                      <Text
                        style={[
                          styles.stepIndicatorText,
                          (isDone || isCurrent) && styles.stepIndicatorTextActive,
                        ]}
                      >
                        {isDone ? '✓' : idx + 1}
                      </Text>
                    </View>
                    <View style={styles.stepTextContainer}>
                      <Text
                        style={[
                          styles.stepItemTitle,
                          (isDone || isCurrent) && styles.stepItemTitleActive,
                        ]}
                      >
                        {st.title}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        ) : (
          <View style={styles.errorContent}>
            <View style={styles.errorIconCircle}>
              <Text style={styles.errorIcon}>⚠️</Text>
            </View>
            <Text style={styles.errorTitle}>Analysis Encountered an Issue</Text>
            <Text style={styles.errorMsg}>{error}</Text>
            <Button
              title={retrying ? 'Retrying Analysis...' : 'Retry Inference'}
              loading={retrying}
              disabled={retrying}
              onPress={runInference}
              style={{ width: '100%', marginTop: spacing.md }}
            />
          </View>
        )}
      </Card>

      <Note variant="info">
        Inference fuses three separate calibrated probability estimates: image vision transformer, tabular XGBoost, and a 3-dense-block artificial neural network.
      </Note>

      <Button
        title="View Saved Assessment Record"
        variant="secondary"
        onPress={() => router.replace({ pathname: '/assessment/details', params: { id } })}
      />
    </Page>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  processingContent: {
    alignItems: 'center',
  },
  spinnerWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: color.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  stageTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: color.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  stageDesc: {
    fontSize: 13,
    color: color.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.xl,
  },
  stepperContainer: {
    width: '100%',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  stepIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: color.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepIndicatorCurrent: {
    borderColor: color.primary,
    backgroundColor: color.primaryLight,
  },
  stepIndicatorDone: {
    borderColor: color.success,
    backgroundColor: color.success,
  },
  stepIndicatorText: {
    fontSize: 11,
    fontWeight: '700',
    color: color.textMuted,
  },
  stepIndicatorTextActive: {
    color: color.white,
  },
  stepTextContainer: {
    flex: 1,
  },
  stepItemTitle: {
    fontSize: 13,
    color: color.textMuted,
  },
  stepItemTitleActive: {
    color: color.text,
    fontWeight: '600',
  },
  errorContent: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  errorIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: color.dangerLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  errorIcon: {
    fontSize: 26,
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: color.text,
    marginBottom: 6,
  },
  errorMsg: {
    fontSize: 13,
    color: color.danger,
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: spacing.sm,
  },
});
