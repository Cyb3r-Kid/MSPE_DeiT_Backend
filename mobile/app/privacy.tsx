import React from 'react';
import { View, Text, StyleSheet, Alert, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Loading, Note, Page } from '../components/UI';
import { api, message } from '../services/api';
import { useSession } from '../store/session';
import { color, typography, spacing, radius } from '../constants/theme';

type ConsentItem = {
  type: string;
  version: string;
  granted_at: string;
  revoked_at: string | null;
};

export default function Privacy() {
  const client = useQueryClient();

  const privacyQuery = useQuery<{ consents: ConsentItem[]; retention: string }>({
    queryKey: ['privacy'],
    queryFn: async () => (await api.get('/users/privacy')).data,
  });

  const isConsentActive = (type: string) => {
    return Boolean(
      privacyQuery.data?.consents.some((item) => item.type === type && !item.revoked_at)
    );
  };

  const handleToggleConsent = async (type: string, currentlyActive: boolean) => {
    try {
      await api.post('/users/consent', {
        consent_type: type,
        granted: !currentlyActive,
        consent_version: '1',
      });
      await client.invalidateQueries({ queryKey: ['privacy'] });
    } catch (e) {
      Alert.alert('Consent Update Failed', message(e));
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Permanently Delete Account & Data?',
      'This action is irreversible. All your assessments, uploaded lesion images, model predictions, and account credentials will be immediately purged from the server.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete('/users/account');
              await useSession.getState().clear();
              router.replace('/onboarding');
            } catch (e) {
              Alert.alert('Account Deletion Failed', message(e));
            }
          },
        },
      ]
    );
  };

  const consentSpecs = [
    {
      type: 'research_assessment',
      title: 'Multimodal Research Assessment',
      desc: 'Authorizes processing patient clinical metadata and lesion imagery with the MSPE-DeiT, XGBoost, and ANN experimental research models.',
      badge: 'Required for Screening',
    },
    {
      type: 'image_storage',
      title: 'Secure Lesion Image Storage',
      desc: 'Authorizes encrypted server retention of uploaded dermatological imagery for historical review and authenticated PDF report generation.',
      badge: 'Required for Image Upload',
    },
  ];

  return (
    <Page
      title="Privacy & Consent"
      subtitle="Regulatory Compliance & Institutional Permissions"
      badge="Data Governance"
      showBack
      onBack={() => router.back()}
    >
      {privacyQuery.isPending ? (
        <Loading label="Loading institutional consent status..." />
      ) : privacyQuery.isError ? (
        <Note danger>Could not retrieve privacy configuration from research server.</Note>
      ) : (
        <>
          <Card>
            <Text style={styles.cardHeaderTitle}>Institutional Permissions</Text>
            <Text style={styles.cardHeaderSub}>
              Consent is explicit and strictly opt-in. You may revoke permissions at any moment to immediately halt future submissions.
            </Text>

            <View style={styles.consentList}>
              {consentSpecs.map((spec) => {
                const active = isConsentActive(spec.type);
                return (
                  <View key={spec.type} style={styles.consentItem}>
                    <View style={styles.consentTopRow}>
                      <View style={styles.titleWrap}>
                        <Text style={styles.consentTitle}>{spec.title}</Text>
                        <View
                          style={[
                            styles.statusBadge,
                            active ? styles.statusBadgeActive : styles.statusBadgeInactive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusBadgeText,
                              active ? styles.statusBadgeTextActive : styles.statusBadgeTextInactive,
                            ]}
                          >
                            {active ? '✓ Consent Granted' : '✕ Not Granted'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <Text style={styles.consentDesc}>{spec.desc}</Text>

                    <Button
                      title={active ? 'Revoke Consent' : 'Grant Permission'}
                      variant={active ? 'outline' : 'primary'}
                      size="small"
                      onPress={() => handleToggleConsent(spec.type, active)}
                      style={{ alignSelf: 'flex-start', marginBottom: 0, marginTop: spacing.sm }}
                    />
                  </View>
                );
              })}
            </View>
          </Card>

          {/* Retention & Compliance Note */}
          <Note variant="info">
            {privacyQuery.data?.retention ||
              'Your screening data remains isolated on the configured server until deleted by you.'}
          </Note>

          <Button
            title="View Screening Registry"
            variant="secondary"
            onPress={() => router.push('/history')}
          />

          <Button
            title="Delete Account & Purge All Records"
            variant="danger"
            onPress={handleDeleteAccount}
          />
        </>
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  cardHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: color.text,
    marginBottom: 4,
  },
  cardHeaderSub: {
    fontSize: 13,
    color: color.textMuted,
    lineHeight: 18,
    marginBottom: spacing.lg,
  },
  consentList: {
    gap: spacing.md,
  },
  consentItem: {
    backgroundColor: '#F8FAFC',
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: color.border,
  },
  consentTopRow: {
    marginBottom: 6,
  },
  titleWrap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  consentTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: color.text,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  statusBadgeActive: {
    backgroundColor: color.successLight,
  },
  statusBadgeInactive: {
    backgroundColor: '#F1F5F9',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusBadgeTextActive: {
    color: color.success,
  },
  statusBadgeTextInactive: {
    color: color.textMuted,
  },
  consentDesc: {
    fontSize: 12,
    color: color.textMuted,
    lineHeight: 17,
  },
});
