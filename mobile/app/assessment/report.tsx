import React, { useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Button, Card, Note, Page } from '../../components/UI';
import { API_URL, message } from '../../services/api';
import { useSession } from '../../store/session';
import { color, typography, spacing, radius } from '../../constants/theme';

export default function Report() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const downloadAndShare = async () => {
    setBusy(true);
    setError('');
    setSuccess(false);

    try {
      const token = useSession.getState().access;
      const endpoint = `${API_URL}/api/v1/assessments/${id}/report`;

      if (Platform.OS === 'web') {
        // Web browser direct download
        const response = await fetch(endpoint, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!response.ok) {
          throw new Error(`Report retrieval failed with HTTP ${response.status}`);
        }
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `screening-report-${id}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(blobUrl);
        setSuccess(true);
      } else {
        // Native iOS & Android file download + system share sheet
        const response = await fetch(endpoint, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!response.ok) {
          throw new Error(`Report retrieval failed with HTTP ${response.status}`);
        }
        const blob = await response.blob();
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const res = String(reader.result);
            resolve(res.includes(',') ? res.split(',')[1] : res);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        const targetUri = `${FileSystem.cacheDirectory}MSPE-DeiT-Report-${id}.pdf`;
        await FileSystem.writeAsStringAsync(targetUri, base64, {
          encoding: FileSystem.EncodingType.Base64,
        });

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(targetUri, {
            mimeType: 'application/pdf',
            dialogTitle: `Share Screening Report #${id}`,
            UTI: 'com.adobe.pdf',
          });
          setSuccess(true);
        } else {
          setSuccess(true);
        }
      }
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page
      title="Clinical PDF Report"
      subtitle={`Assessment #${id} · Formal Diagnostic Summary`}
      badge="Authenticated Document"
      showBack
      onBack={() => router.back()}
    >
      <Card style={styles.card}>
        <View style={styles.iconCircle}>
          <Text style={styles.pdfIcon}>📄</Text>
        </View>

        <Text style={styles.documentTitle}>MSPE-DeiT Screening Report #{id}</Text>
        <Text style={styles.documentSub}>
          Comprehensive decision-support summary detailing vision transformer and tabular clinical probability outputs, patient context, and research methodology.
        </Text>

        <View style={styles.featuresList}>
          <Text style={styles.featureItem}>• Cryptographically authenticated assessment metadata</Text>
          <Text style={styles.featureItem}>• Three-branch probability breakdown & ensemble score</Text>
          <Text style={styles.featureItem}>• Standardized clinical decision-support recommendation</Text>
          <Text style={styles.featureItem}>• High-resolution lesion thumbnail with modality tag</Text>
        </View>
      </Card>

      {success ? (
        <Note variant="info">
          PDF report successfully exported. You can save or distribute it through your institutional channels.
        </Note>
      ) : null}

      {error ? <Note danger>{error}</Note> : null}

      <Button
        title={busy ? 'Generating Authenticated PDF...' : 'Download & Export PDF'}
        loading={busy}
        disabled={busy}
        onPress={downloadAndShare}
      />

      <Button
        title="Back to Screening Results"
        variant="secondary"
        onPress={() => router.back()}
      />
    </Page>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: color.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  pdfIcon: {
    fontSize: 30,
  },
  documentTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: color.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  documentSub: {
    fontSize: 13,
    color: color.textMuted,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: spacing.lg,
  },
  featuresList: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 6,
  },
  featureItem: {
    fontSize: 12,
    color: color.textMuted,
    lineHeight: 18,
  },
});
