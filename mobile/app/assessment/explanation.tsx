import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, Loading, Note, Page } from '../../components/UI';
import { api } from '../../services/api';
import { color, typography, spacing, radius } from '../../constants/theme';

export default function Explanation() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const explanationQuery = useQuery({
    queryKey: ['explanation', id],
    queryFn: async () => (await api.get(`/assessments/${id}/explanation`)).data,
  });

  const data = explanationQuery.data;

  return (
    <Page
      title="Explainability"
      subtitle={`Assessment #${id} · Feature & Attention Analysis`}
      badge="Interpretable AI"
      showBack
      onBack={() => router.back()}
    >
      {explanationQuery.isPending ? (
        <Loading label="Computing model attributions..." />
      ) : !data?.available ? (
        <Card>
          <Text style={styles.unavailableTitle}>Attribution Unavailable</Text>
          <Text style={styles.unavailableDesc}>
            {data?.reason ||
              'Grad-CAM patch attention and SHAP feature attributions require full analysis completion on validated checkpoints.'}
          </Text>
        </Card>
      ) : (
        <>
          {/* Vision Transformer Patch Attention Overlay */}
          {data.image_overlay_png_base64 ? (
            <Card>
              <Text style={styles.sectionTitle}>Vision Transformer Patch Attention</Text>
              <Text style={styles.sectionSub}>
                Method: {data.image_method || 'DeiT-Tiny Self-Attention Rollout'}
              </Text>

              <View style={styles.overlayWrapper}>
                <Image
                  source={{ uri: `data:image/png;base64,${data.image_overlay_png_base64}` }}
                  style={styles.overlayImage}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.overlayCaption}>
                Warmer highlights denote image patch regions exerting higher influence on transformer classification tokens.
              </Text>
            </Card>
          ) : null}

          {/* Tabular Feature Contributions */}
          {[
            {
              title: 'XGBoost Feature Attribution',
              method: data.xgboost_method || 'Tree SHAP Values',
              contributions: data.xgboost_contributions || [],
            },
            {
              title: 'ANN Feature Attribution',
              method: data.ann_method || 'Integrated Gradients',
              contributions: data.ann_contributions || [],
            },
          ].map((branch) =>
            branch.contributions.length > 0 ? (
              <Card key={branch.title}>
                <Text style={styles.sectionTitle}>{branch.title}</Text>
                <Text style={styles.sectionSub}>Method: {branch.method}</Text>

                <View style={styles.contribList}>
                  {branch.contributions.map((entry: any) => (
                    <View key={entry.feature} style={styles.contribRow}>
                      <Text style={styles.featureName}>{entry.feature}</Text>
                      <Text
                        style={[
                          styles.featureVal,
                          entry.value >= 0 ? styles.valPositive : styles.valNegative,
                        ]}
                      >
                        {entry.value >= 0 ? '+' : ''}
                        {Number(entry.value).toFixed(3)}
                      </Text>
                    </View>
                  ))}
                </View>
              </Card>
            ) : null
          )}
        </>
      )}

      <Note variant="warning">
        {data?.limitations ||
          'Attribution heatmaps reflect statistical activations of neural network weights, not histological boundaries. Never rely on saliency maps for surgical margin estimation.'}
      </Note>

      <Button
        title="Return to Screening Findings"
        variant="secondary"
        onPress={() => router.back()}
      />
    </Page>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: color.text,
    marginBottom: 2,
  },
  sectionSub: {
    fontSize: 12,
    color: color.textMuted,
    marginBottom: spacing.md,
  },
  unavailableTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: color.text,
    marginBottom: 4,
  },
  unavailableDesc: {
    fontSize: 13,
    color: color.textMuted,
    lineHeight: 19,
  },
  overlayWrapper: {
    width: '100%',
    height: 260,
    backgroundColor: '#0F172A',
    borderRadius: radius.md,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  overlayImage: {
    width: '100%',
    height: '100%',
  },
  overlayCaption: {
    fontSize: 12,
    color: color.textMuted,
    lineHeight: 17,
  },
  contribList: {
    gap: 8,
  },
  contribRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  featureName: {
    fontSize: 13,
    color: color.text,
    textTransform: 'capitalize',
  },
  featureVal: {
    fontSize: 13,
    fontWeight: '700',
  },
  valPositive: {
    color: color.danger,
  },
  valNegative: {
    color: color.success,
  },
});
