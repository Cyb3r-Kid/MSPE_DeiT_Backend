import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  Button,
  Card,
  Loading,
  Note,
  Page,
  SectionHeader,
  StatCard,
  StatusBadge,
} from '../components/UI';
import { api } from '../services/api';
import { Assessment, ModelStatus } from '../types/api';
import { color, typography, spacing, radius } from '../constants/theme';

export default function Home() {
  const profileQuery = useQuery({
    queryKey: ['profile'],
    queryFn: async () => (await api.get('/users/profile')).data,
  });

  const modelsQuery = useQuery<ModelStatus>({
    queryKey: ['models'],
    queryFn: async () => (await api.get('/models/status')).data,
  });

  const assessmentsQuery = useQuery<Assessment[]>({
    queryKey: ['assessments'],
    queryFn: async () => (await api.get('/assessments')).data,
  });

  const assessments = assessmentsQuery.data || [];
  const completedCount = assessments.filter((a) => a.status === 'completed').length;
  const totalCount = assessments.length;
  const recentAssessments = assessments.slice(0, 3);

  const userName = profileQuery.data?.name ? profileQuery.data.name.split(' ')[0] : 'Investigator';

  return (
    <Page
      title={`Hello, ${userName}`}
      subtitle="Multimodal MSPE-DeiT Clinical Screening Workspace"
      badge="Active Session"
    >
      {/* Primary New Assessment CTA Card */}
      <Card style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <View style={styles.heroIconBox}>
            <Text style={styles.heroIcon}>🩺</Text>
          </View>
          <View style={styles.heroTitleContainer}>
            <Text style={styles.heroTitle}>New Lesion Screening</Text>
            <Text style={styles.heroSubtitle}>
              Multimodal Vision Transformer & Tabular Clinical Ensemble
            </Text>
          </View>
        </View>
        <Text style={styles.heroDescription}>
          Select a dermoscopic or 3D total-body lesion crop and supply clinical metadata to generate an ensemble risk estimate.
        </Text>
        <Button
          title="Start New Assessment"
          onPress={() => router.push('/assessment/new')}
          style={{ marginBottom: 0 }}
        />
      </Card>

      {/* Quick Statistics Row (Real Backend Data) */}
      <View style={styles.statsRow}>
        <StatCard
          label="Total Screenings"
          value={assessmentsQuery.isPending ? '—' : totalCount}
          note="Saved records"
          highlight
        />
        <View style={{ width: spacing.md }} />
        <StatCard
          label="Completed"
          value={assessmentsQuery.isPending ? '—' : completedCount}
          note="Inference run"
        />
      </View>

      {/* AI Model Status Card */}
      <Card style={styles.modelStatusCard}>
        <View style={styles.modelStatusHeader}>
          <Text style={styles.modelStatusTitle}>MSPE-DeiT Model System</Text>
          <View
            style={[
              styles.statusPill,
              modelsQuery.data?.ready ? styles.statusPillReady : styles.statusPillStandby,
            ]}
          >
            <View
              style={[
                styles.statusDot,
                { backgroundColor: modelsQuery.data?.ready ? color.success : color.warning },
              ]}
            />
            <Text
              style={[
                styles.statusPillText,
                { color: modelsQuery.data?.ready ? color.success : color.warning },
              ]}
            >
              {modelsQuery.data?.ready ? 'Ready for Inference' : 'Calibrated Ensemble Active'}
            </Text>
          </View>
        </View>
        <Text style={styles.modelStatusDescription}>
          Tri-branch multimodal pipeline: Modality-Specific Vision Transformer (DeiT-Tiny) + XGBoost + ANN with soft-voting probability fusion.
        </Text>
      </Card>

      {/* Recent Screenings Section */}
      <SectionHeader
        title="Recent Assessments"
        actionTitle={totalCount > 0 ? 'View All' : undefined}
        onAction={() => router.push('/history')}
      />

      {assessmentsQuery.isPending ? (
        <Loading label="Loading assessment history..." />
      ) : recentAssessments.length === 0 ? (
        <Card style={styles.emptyRecentCard}>
          <Text style={styles.emptyRecentText}>No assessments performed yet.</Text>
          <Text style={styles.emptyRecentSub}>
            Begin by capturing or selecting a lesion image to run your first screening.
          </Text>
        </Card>
      ) : (
        recentAssessments.map((item) => (
          <Card
            key={item.id}
            style={styles.recentItemCard}
            onPress={() =>
              router.push({
                pathname: '/assessment/details',
                params: { id: String(item.id) },
              })
            }
          >
            <View style={styles.recentItemHeader}>
              <View>
                <Text style={styles.recentItemId}>Screening #{item.id}</Text>
                <Text style={styles.recentItemDate}>
                  {new Date(item.created_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}{' '}
                  · {item.modality === 'dermoscopic' ? 'Dermoscopy' : item.modality}
                </Text>
              </View>
              <StatusBadge status={item.status === 'completed' ? 'Completed' : 'Draft'} />
            </View>

            {item.prediction ? (
              <View style={styles.predictionRow}>
                <Text style={styles.predictionLabel}>Ensemble Malignancy:</Text>
                <Text style={styles.predictionValue}>
                  {(item.prediction.ensemble_probability * 100).toFixed(1)}%
                </Text>
              </View>
            ) : null}
          </Card>
        ))
      )}

      {/* Quick Navigation Action Grid */}
      <SectionHeader title="Workspace Tools" />
      <View style={styles.toolsGrid}>
        <Pressable
          style={styles.toolCard}
          onPress={() => router.push('/history')}
          accessibilityRole="button"
        >
          <Text style={styles.toolIcon}>📋</Text>
          <Text style={styles.toolTitle}>History</Text>
          <Text style={styles.toolSubtitle}>Review past cases</Text>
        </Pressable>

        <Pressable
          style={styles.toolCard}
          onPress={() => router.push('/education')}
          accessibilityRole="button"
        >
          <Text style={styles.toolIcon}>📚</Text>
          <Text style={styles.toolTitle}>Lesion Guide</Text>
          <Text style={styles.toolSubtitle}>Clinical reference</Text>
        </Pressable>

        <Pressable
          style={styles.toolCard}
          onPress={() => router.push('/privacy')}
          accessibilityRole="button"
        >
          <Text style={styles.toolIcon}>🛡️</Text>
          <Text style={styles.toolTitle}>Privacy</Text>
          <Text style={styles.toolSubtitle}>Consent management</Text>
        </Pressable>

        <Pressable
          style={styles.toolCard}
          onPress={() => router.push('/profile')}
          accessibilityRole="button"
        >
          <Text style={styles.toolIcon}>👤</Text>
          <Text style={styles.toolTitle}>Profile</Text>
          <Text style={styles.toolSubtitle}>Account & security</Text>
        </Pressable>
      </View>

      <Note variant="info">
        MSPE-DeiT is designed to aid scientific inquiry. Any score represents a multimodal statistical estimate and should be validated alongside clinical examination.
      </Note>
    </Page>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#BFDBFE',
    borderWidth: 1.5,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  heroIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: color.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  heroIcon: {
    fontSize: 22,
  },
  heroTitleContainer: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: color.text,
  },
  heroSubtitle: {
    fontSize: 12,
    color: color.textMuted,
  },
  heroDescription: {
    ...typography.bodyMedium,
    color: color.textMuted,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
  },
  modelStatusCard: {
    backgroundColor: color.card,
    marginBottom: spacing.lg,
  },
  modelStatusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  modelStatusTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: color.text,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  statusPillReady: {
    backgroundColor: color.successLight,
  },
  statusPillStandby: {
    backgroundColor: color.warningLight,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  modelStatusDescription: {
    ...typography.bodySmall,
    color: color.textMuted,
    lineHeight: 18,
  },
  emptyRecentCard: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  emptyRecentText: {
    fontSize: 15,
    fontWeight: '600',
    color: color.text,
    marginBottom: 4,
  },
  emptyRecentSub: {
    fontSize: 13,
    color: color.textMuted,
    textAlign: 'center',
  },
  recentItemCard: {
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  recentItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recentItemId: {
    fontSize: 15,
    fontWeight: '700',
    color: color.text,
  },
  recentItemDate: {
    fontSize: 12,
    color: color.textMuted,
    marginTop: 2,
  },
  predictionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  predictionLabel: {
    fontSize: 12,
    color: color.textMuted,
    marginRight: 6,
  },
  predictionValue: {
    fontSize: 14,
    fontWeight: '700',
    color: color.primary,
  },
  toolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  toolCard: {
    width: '48%',
    backgroundColor: color.card,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: color.border,
    marginBottom: spacing.md,
  },
  toolIcon: {
    fontSize: 22,
    marginBottom: spacing.xs,
  },
  toolTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: color.text,
  },
  toolSubtitle: {
    fontSize: 11,
    color: color.textMuted,
    marginTop: 2,
  },
});
