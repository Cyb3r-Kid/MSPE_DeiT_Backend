import React, { useState } from 'react';
import { router } from 'expo-router';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Button, Card, Input, Note, Page, Badge } from '../components/UI';
import { api, message } from '../services/api';
import { useSession } from '../store/session';
import { useConnection } from '../store/connection';
import { color, typography, spacing, radius } from '../constants/theme';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const save = useSession((s) => s.setTokens);
  const { url: serverUrl, status: connStatus } = useConnection();

  const submit = async () => {
    if (!email.trim() || !email.includes('@') || !password) {
      return setError('Please enter a valid email address and password.');
    }
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post('/auth/login', { email: email.trim(), password });
      await save(data.access_token, data.refresh_token);
      router.replace('/home');
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page
      title="Welcome Back"
      subtitle="Sign in to your private MSPE-DeiT research workspace"
      badge="Secure Access"
    >
      {/* Backend Link Banner */}
      <TouchableOpacity
        style={styles.serverBanner}
        onPress={() => router.push('/connection')}
        activeOpacity={0.8}
      >
        <View style={styles.serverInfoCol}>
          <Text style={styles.serverLabel}>BACKEND SERVER</Text>
          <Text style={styles.serverAddress} numberOfLines={1}>
            {serverUrl}
          </Text>
        </View>
        <View style={styles.serverBadgeCol}>
          {connStatus === 'connected' ? (
            <Badge label="Online" variant="success" />
          ) : connStatus === 'error' ? (
            <Badge label="Offline" variant="danger" />
          ) : (
            <Badge label="Configure" variant="neutral" />
          )}
        </View>
      </TouchableOpacity>

      <Card>
        <Input
          label="Email Address"
          value={email}
          onChangeText={(val) => {
            setEmail(val);
            if (error) setError('');
          }}
          placeholder="doctor@institution.org"
          keyboardType="email-address"
        />
        <Input
          label="Password"
          value={password}
          onChangeText={(val) => {
            setPassword(val);
            if (error) setError('');
          }}
          placeholder="Enter your account password"
          secureTextEntry
        />

        {error ? <Note danger>{error}</Note> : null}

        <Button
          title={busy ? 'Authenticating...' : 'Sign In'}
          loading={busy}
          disabled={busy}
          onPress={submit}
          style={{ marginTop: spacing.sm }}
        />
      </Card>

      <View style={styles.promptContainer}>
        <Text style={styles.promptText}>Don't have a research account?</Text>
        <Button
          title="Create Account"
          variant="secondary"
          onPress={() => router.push('/register')}
          style={{ marginTop: spacing.sm }}
        />
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  serverBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: spacing.md,
  },
  serverInfoCol: {
    flex: 1,
    marginRight: spacing.sm,
  },
  serverLabel: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
    color: color.textMuted,
    letterSpacing: 0.5,
  },
  serverAddress: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: color.primary,
  },
  serverBadgeCol: {
    alignItems: 'flex-end',
  },
  promptContainer: {
    marginTop: spacing.md,
    alignItems: 'center',
  },
  promptText: {
    ...typography.bodyMedium,
    color: color.textMuted,
    marginBottom: spacing.xs,
  },
});
