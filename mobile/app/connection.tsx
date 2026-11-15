import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, Input, Note, Page, Badge } from '../components/UI';
import { useConnection } from '../store/connection';
import { color, typography, spacing, radius } from '../constants/theme';

export default function ConnectionSettings() {
  const {
    url,
    status,
    latency,
    serverInfo,
    errorMessage,
    setUrl,
    testConnection,
    resetToDefault,
  } = useConnection();

  const [inputUrl, setInputUrl] = useState(url);
  const [testing, setTesting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleTest = async () => {
    setTesting(true);
    setSaveSuccess(false);
    try {
      const ok = await testConnection(inputUrl);
      if (ok) {
        // Also save if successful
        await setUrl(inputUrl);
        setSaveSuccess(true);
      }
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    const ok = await setUrl(inputUrl);
    if (ok) {
      setSaveSuccess(true);
      Alert.alert('Settings Saved', `Backend URL set to:\n${inputUrl}`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } else {
      Alert.alert('Error', 'Please enter a valid HTTP/HTTPS URL.');
    }
  };

  const applyPreset = (presetUrl: string) => {
    setInputUrl(presetUrl);
    setSaveSuccess(false);
  };

  return (
    <Page
      title="Server Connection"
      subtitle="Connect mobile app to your laptop's MSPE-DeiT backend"
      badge="Network Config"
      showBack
      onBack={() => router.back()}
    >
      {/* Live Status Card */}
      <Card style={styles.statusCard}>
        <View style={styles.statusHeaderRow}>
          <Text style={styles.statusTitle}>Backend Link Status</Text>
          {status === 'connected' && (
            <Badge label="Connected" variant="success" />
          )}
          {status === 'testing' && (
            <Badge label="Testing..." variant="warning" />
          )}
          {status === 'error' && (
            <Badge label="Disconnected" variant="danger" />
          )}
          {status === 'idle' && (
            <Badge label="Not Tested" variant="neutral" />
          )}
        </View>

        <View style={styles.metricsRow}>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Latency</Text>
            <Text style={styles.metricValue}>
              {latency !== null ? `${latency} ms` : '—'}
            </Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>AI Checkpoints</Text>
            <Text style={[styles.metricValue, { color: serverInfo?.models_initialized ? color.success : color.warning }]}>
              {serverInfo?.models_initialized ? 'Active' : 'Offline'}
            </Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Device</Text>
            <Text style={styles.metricValue}>
              {serverInfo?.device ? serverInfo.device.toUpperCase() : '—'}
            </Text>
          </View>
        </View>

        {errorMessage ? (
          <Note danger style={{ marginTop: spacing.sm }}>
            {errorMessage}
          </Note>
        ) : null}

        {saveSuccess ? (
          <Note success style={{ marginTop: spacing.sm }}>
            Successfully verified connection to MSPE-DeiT backend!
          </Note>
        ) : null}
      </Card>

      {/* URL Input Form */}
      <Card>
        <Text style={styles.sectionTitle}>Backend URL / Laptop IP</Text>
        <Text style={styles.sectionSubtitle}>
          Enter your Windows laptop's IP address and port 8001
        </Text>

        <Input
          label="Server Address"
          value={inputUrl}
          onChangeText={(val) => {
            setInputUrl(val);
            setSaveSuccess(false);
          }}
          placeholder="http://192.168.1.105:8001"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />

        {/* Quick Presets */}
        <Text style={styles.presetsLabel}>Quick Presets:</Text>
        <View style={styles.presetChipsRow}>
          <TouchableOpacity
            style={styles.chip}
            onPress={() => applyPreset('http://192.168.1.100:8001')}
          >
            <Text style={styles.chipText}>192.168.1.x:8001</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.chip}
            onPress={() => applyPreset('http://10.0.2.2:8001')}
          >
            <Text style={styles.chipText}>Android Emulator</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.chip}
            onPress={() => applyPreset('http://127.0.0.1:8001')}
          >
            <Text style={styles.chipText}>Localhost:8001</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actionButtons}>
          <Button
            title={testing ? 'Testing Link...' : 'Test Connection'}
            loading={testing}
            disabled={testing}
            onPress={handleTest}
            variant="secondary"
          />

          <Button
            title="Save & Use This URL"
            onPress={handleSave}
            style={{ marginTop: spacing.sm }}
          />
        </View>
      </Card>

      {/* Wi-Fi Setup Instructions */}
      <Card>
        <Text style={styles.sectionTitle}>Connection Setup Guide</Text>
        <View style={styles.guideStep}>
          <Text style={styles.stepNumber}>1.</Text>
          <Text style={styles.stepText}>
            Connect both your Windows laptop and Android phone to the <Text style={{ fontWeight: '700' }}>same Wi-Fi network</Text>.
          </Text>
        </View>
        <View style={styles.guideStep}>
          <Text style={styles.stepNumber}>2.</Text>
          <Text style={styles.stepText}>
            On your laptop, run <Text style={styles.codeText}>START_BACKEND.bat</Text> in the delivery package. It prints your local IP address.
          </Text>
        </View>
        <View style={styles.guideStep}>
          <Text style={styles.stepNumber}>3.</Text>
          <Text style={styles.stepText}>
            If connection fails, run <Text style={styles.codeText}>ALLOW_FIREWALL.bat</Text> as Administrator on Windows to allow port 8001.
          </Text>
        </View>
        <View style={styles.guideStep}>
          <Text style={styles.stepNumber}>4.</Text>
          <Text style={styles.stepText}>
            Enter the exact address above (e.g. <Text style={styles.codeText}>http://192.168.1.105:8001</Text>) and tap "Test Connection".
          </Text>
        </View>
      </Card>

      <Button
        title="Reset to Platform Default"
        variant="outline"
        onPress={() => {
          resetToDefault();
          setInputUrl(url);
        }}
        style={{ marginTop: spacing.sm, marginBottom: spacing.xl }}
      />
    </Page>
  );
}

const styles = StyleSheet.create({
  statusCard: {
    marginBottom: spacing.md,
  },
  statusHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  statusTitle: {
    ...typography.titleSmall,
    color: color.text,
  },
  metricsRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: radius.md,
    padding: spacing.md,
    justifyContent: 'space-between',
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricLabel: {
    ...typography.caption,
    color: color.textMuted,
    marginBottom: 4,
  },
  metricValue: {
    ...typography.bodyLarge,
    fontWeight: '700',
    color: color.text,
  },
  sectionTitle: {
    ...typography.titleSmall,
    color: color.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    ...typography.bodySmall,
    color: color.textMuted,
    marginBottom: spacing.md,
  },
  presetsLabel: {
    ...typography.caption,
    color: color.textMuted,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  presetChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  chip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipText: {
    ...typography.caption,
    fontWeight: '600',
    color: color.primary,
  },
  actionButtons: {
    marginTop: spacing.xs,
  },
  guideStep: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
    alignItems: 'flex-start',
  },
  stepNumber: {
    ...typography.bodyMedium,
    fontWeight: '800',
    color: color.primary,
    width: 22,
  },
  stepText: {
    ...typography.bodySmall,
    color: color.text,
    flex: 1,
    lineHeight: 20,
  },
  codeText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '700',
    color: color.primaryDark,
    backgroundColor: '#F1F5F9',
  },
});
