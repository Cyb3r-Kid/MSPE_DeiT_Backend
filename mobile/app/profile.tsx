import React from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, Loading, MetadataRow, Note, Page } from '../components/UI';
import { api } from '../services/api';
import { useSession } from '../store/session';
import { color, typography, spacing, radius } from '../constants/theme';

export default function Profile() {
  const profileQuery = useQuery({
    queryKey: ['profile'],
    queryFn: async () => (await api.get('/users/profile')).data,
  });

  const handleLogout = () => {
    Alert.alert('Sign Out of Workspace?', 'You will need to re-authenticate with your credentials.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          const refresh = useSession.getState().refresh;
          try {
            if (refresh) {
              await api.post('/auth/logout', { refresh_token: refresh });
            }
          } catch {
            // Ignore token logout errors and clear session locally
          } finally {
            await useSession.getState().clear();
            router.replace('/login');
          }
        },
      },
    ]);
  };

  const user = profileQuery.data;

  return (
    <Page
      title="Investigator Profile"
      subtitle="Workspace Identity & Account Configuration"
      badge="Account Center"
      showBack
      onBack={() => router.replace('/home')}
    >
      {profileQuery.isPending ? (
        <Loading label="Retrieving account data..." />
      ) : (
        <>
          {/* User Profile Card */}
          <Card style={styles.profileCard}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </Text>
            </View>
            <Text style={styles.userName}>{user?.name || 'Investigator'}</Text>
            <Text style={styles.userEmail}>{user?.email || 'authenticated-user'}</Text>

            <View style={styles.infoDivider} />

            <MetadataRow
              label="Account ID"
              value={user?.id ? `#${user.id}` : '—'}
            />
            <MetadataRow
              label="Enrolled Since"
              value={
                user?.created_at
                  ? new Date(user.created_at).toLocaleDateString(undefined, {
                      month: 'short',
                      year: 'numeric',
                    })
                  : 'Active'
              }
            />
            <MetadataRow label="Authentication" value="Argon2id + HS256 JWT" isLast />
          </Card>

          {/* Application & Research Architecture Info Card */}
          <Card>
            <Text style={styles.sectionHeading}>System Architecture</Text>
            <MetadataRow label="Application" value="MSPE-DeiT Mobile Client" />
            <MetadataRow label="Vision Backbone" value="Modality-Specific DeiT-Tiny" />
            <MetadataRow label="Clinical Tabular" value="XGBoost + 3-Dense ANN" />
            <MetadataRow label="Fusion Engine" value="Calibrated Soft-Voting" isLast />
          </Card>

          {/* Quick Shortcuts */}
          <Button
            title="Server Connection & LAN IP"
            variant="secondary"
            onPress={() => router.push('/connection')}
          />

          <Button
            title="Privacy & Consent Governance"
            onPress={() => router.push('/privacy')}
            style={{ marginTop: spacing.sm }}
          />

          <Button
            title="View Screening History"
            variant="secondary"
            onPress={() => router.push('/history')}
            style={{ marginTop: spacing.sm }}
          />

          <Button
            title="Sign Out of Application"
            variant="outline"
            onPress={handleLogout}
            style={{ marginTop: spacing.sm }}
          />
        </>
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  profileCard: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: color.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: '#BFDBFE',
  },
  avatarText: {
    fontSize: 26,
    fontWeight: '800',
    color: color.primary,
  },
  userName: {
    fontSize: 19,
    fontWeight: '700',
    color: color.text,
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 13,
    color: color.textMuted,
    marginBottom: spacing.md,
  },
  infoDivider: {
    width: '100%',
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: spacing.sm,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: color.text,
    marginBottom: spacing.sm,
  },
});
