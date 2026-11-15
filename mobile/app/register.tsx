import React, { useState } from 'react';
import { router } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { Button, Card, Input, Note, Page } from '../components/UI';
import { api, message } from '../services/api';
import { useSession } from '../store/session';
import { color, typography, spacing } from '../constants/theme';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const save = useSession((s) => s.setTokens);

  const submit = async () => {
    if (!name.trim()) {
      return setError('Please enter your full name or title.');
    }
    if (!email.trim() || !email.includes('@')) {
      return setError('Please enter a valid institutional or personal email address.');
    }
    if (password.length < 12) {
      return setError('Password must be at least 12 characters long for clinical research security.');
    }
    if (password !== confirm) {
      return setError('Passwords do not match. Please re-enter matching passwords.');
    }

    setBusy(true);
    setError('');
    try {
      const { data } = await api.post('/auth/register', {
        name: name.trim(),
        email: email.trim(),
        password,
      });
      await save(data.access_token, data.refresh_token);
      router.replace('/privacy');
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page
      title="Create Account"
      subtitle="Register for the multimodal MSPE-DeiT clinical screening platform"
      badge="New Investigator"
      showBack
      onBack={() => router.back()}
    >
      <Card>
        <Input
          label="Full Name or Clinical Title"
          value={name}
          onChangeText={(val) => {
            setName(val);
            if (error) setError('');
          }}
          placeholder="e.g. Dr. Jane Smith"
        />
        <Input
          label="Email Address"
          value={email}
          onChangeText={(val) => {
            setEmail(val);
            if (error) setError('');
          }}
          placeholder="investigator@hospital.org"
          keyboardType="email-address"
        />
        <Input
          label="Password (min. 12 characters)"
          value={password}
          onChangeText={(val) => {
            setPassword(val);
            if (error) setError('');
          }}
          placeholder="Enter a secure passphrase"
          secureTextEntry
          helper="Use at least 12 characters combining letters, numbers, and symbols."
        />
        <Input
          label="Confirm Password"
          value={confirm}
          onChangeText={(val) => {
            setConfirm(val);
            if (error) setError('');
          }}
          placeholder="Re-enter your password"
          secureTextEntry
        />

        {error ? <Note danger>{error}</Note> : null}

        <Button
          title={busy ? 'Creating Account...' : 'Register Account'}
          loading={busy}
          disabled={busy}
          onPress={submit}
          style={{ marginTop: spacing.sm }}
        />
      </Card>

      <Note variant="info">
        Following account creation, you will review and set your explicit Privacy & Consent permissions before performing screenings.
      </Note>

      <View style={styles.promptContainer}>
        <Text style={styles.promptText}>Already registered?</Text>
        <Button
          title="Sign In to Existing Account"
          variant="secondary"
          onPress={() => router.replace('/login')}
        />
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
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
