import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
  TextStyle,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { color, typography, spacing, radius } from '../constants/theme';

export interface PageProps {
  title: string;
  subtitle?: string;
  badge?: string;
  showBack?: boolean;
  onBack?: () => void;
  children: React.ReactNode;
}

export function Page({
  title,
  subtitle,
  badge = 'MSPE-DeiT AI',
  showBack = false,
  onBack,
  children,
}: PageProps) {
  const handleBack = onBack || (() => router.back());

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header Bar */}
        <View style={styles.topHeader}>
          {showBack ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go back"
              onPress={handleBack}
              style={styles.backButton}
            >
              <Text style={styles.backButtonIcon}>‹</Text>
              <Text style={styles.backButtonText}>Back</Text>
            </Pressable>
          ) : (
            <View style={styles.brandBadge}>
              <View style={styles.brandDot} />
              <Text style={styles.brandText}>{badge}</Text>
            </View>
          )}
        </View>

        {/* Screen Title & Subtitle */}
        <View style={styles.titleContainer}>
          <Text style={styles.pageTitle}>{title}</Text>
          {subtitle ? <Text style={styles.pageSubtitle}>{subtitle}</Text> : null}
        </View>

        {/* Main Screen Content */}
        {children}

        {/* Clinical Research Disclaimer Footer */}
        <View style={styles.footerContainer}>
          <View style={styles.footerDivider} />
          <Text style={styles.footerText}>
            Medical AI Research Prototype · Not a substitute for clinical biopsy or professional dermatological diagnosis.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export function Card({
  children,
  style,
  onPress,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
}) {
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.card, style, pressed && styles.cardPressed]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

export interface ButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  secondary?: boolean;
  size?: 'normal' | 'small';
  icon?: string;
  style?: ViewStyle;
}

export function Button({
  title,
  onPress,
  disabled = false,
  loading = false,
  variant,
  secondary,
  size = 'normal',
  icon,
  style,
}: ButtonProps) {
  // Determine variant for backwards compatibility with secondary prop
  const activeVariant = variant || (secondary ? 'secondary' : 'primary');

  const buttonStyles = [
    styles.buttonBase,
    size === 'small' ? styles.buttonSmall : styles.buttonNormal,
    activeVariant === 'primary' && styles.buttonPrimary,
    activeVariant === 'secondary' && styles.buttonSecondary,
    activeVariant === 'outline' && styles.buttonOutline,
    activeVariant === 'danger' && styles.buttonDanger,
    (disabled || loading) && styles.buttonDisabled,
    style,
  ];

  const textStyles = [
    styles.buttonTextBase,
    size === 'small' ? styles.buttonTextSmall : styles.buttonTextNormal,
    activeVariant === 'primary' && styles.buttonTextPrimary,
    activeVariant === 'secondary' && styles.buttonTextSecondary,
    activeVariant === 'outline' && styles.buttonTextOutline,
    activeVariant === 'danger' && styles.buttonTextDanger,
  ];

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [buttonStyles, pressed && !disabled && !loading && styles.buttonPressed]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={activeVariant === 'primary' || activeVariant === 'danger' ? color.white : color.primary}
        />
      ) : (
        <View style={styles.buttonContent}>
          {icon ? <Text style={[textStyles, styles.buttonIcon]}>{icon}</Text> : null}
          <Text style={textStyles}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

export interface InputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'url';
  helper?: string;
  error?: string;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
}

export function Input({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType = 'default',
  helper,
  error,
  autoCapitalize,
  autoCorrect,
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isSecured, setIsSecured] = useState(secureTextEntry);

  const cap = autoCapitalize || (keyboardType === 'email-address' || keyboardType === 'url' ? 'none' : 'sentences');

  return (
    <View style={styles.inputContainer}>
      <View style={styles.labelRow}>
        <Text style={styles.inputLabel}>{label}</Text>
      </View>
      <View
        style={[
          styles.inputWrapper,
          isFocused && styles.inputWrapperFocused,
          Boolean(error) && styles.inputWrapperError,
        ]}
      >
        <TextInput
          accessibilityLabel={label}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={color.textSubtle}
          secureTextEntry={isSecured}
          keyboardType={keyboardType}
          autoCapitalize={cap}
          autoCorrect={autoCorrect}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={styles.textInput}
        />
        {secureTextEntry ? (
          <Pressable
            onPress={() => setIsSecured(!isSecured)}
            style={styles.inputAction}
            accessibilityLabel={isSecured ? 'Show password' : 'Hide password'}
          >
            <Text style={styles.inputActionText}>{isSecured ? 'Show' : 'Hide'}</Text>
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.inputErrorText}>{error}</Text> : null}
      {helper && !error ? <Text style={styles.inputHelperText}>{helper}</Text> : null}
    </View>
  );
}

export function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search records...',
  onClear,
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onClear?: () => void;
}) {
  return (
    <View style={styles.searchContainer}>
      <Text style={styles.searchIcon}>⌕</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={color.textMuted}
        style={styles.searchInput}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {value ? (
        <Pressable
          onPress={onClear || (() => onChangeText(''))}
          style={styles.searchClear}
          accessibilityLabel="Clear search"
        >
          <Text style={styles.searchClearText}>✕</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export type RiskLevel = 'Low Risk' | 'Moderate Risk' | 'High Risk' | 'Draft' | 'Uploaded' | 'Completed' | string;

export function Badge({
  label,
  variant = 'neutral',
}: {
  label: string;
  variant?: 'neutral' | 'success' | 'warning' | 'danger' | 'primary';
}) {
  let bg = color.borderLight;
  let text = color.textMuted;
  let dot = color.textMuted;

  if (variant === 'success') {
    bg = color.successLight;
    text = color.success;
    dot = color.success;
  } else if (variant === 'warning') {
    bg = color.warningLight;
    text = color.warning;
    dot = color.warning;
  } else if (variant === 'danger') {
    bg = color.dangerLight;
    text = color.danger;
    dot = color.danger;
  } else if (variant === 'primary') {
    bg = color.primaryLight;
    text = color.primary;
    dot = color.primary;
  }

  return (
    <View style={[styles.badgeContainer, { backgroundColor: bg }]}>
      <View style={[styles.badgeDot, { backgroundColor: dot }]} />
      <Text style={[styles.badgeText, { color: text }]}>{label}</Text>
    </View>
  );
}

export function StatusBadge({ status }: { status: RiskLevel }) {
  const norm = status?.toLowerCase() || '';

  let bg = color.borderLight;
  let text = color.textMuted;
  let dotColor = color.textMuted;

  if (norm.includes('low')) {
    bg = color.successLight;
    text = color.success;
    dotColor = color.success;
  } else if (norm.includes('mod') || norm.includes('medium')) {
    bg = color.warningLight;
    text = color.warning;
    dotColor = color.warning;
  } else if (norm.includes('high') || norm.includes('danger')) {
    bg = color.dangerLight;
    text = color.danger;
    dotColor = color.danger;
  } else if (norm.includes('completed')) {
    bg = color.primaryLight;
    text = color.primary;
    dotColor = color.primary;
  } else if (norm.includes('uploaded')) {
    bg = color.secondaryLight;
    text = color.secondary;
    dotColor = color.secondary;
  }

  return (
    <View style={[styles.badgeContainer, { backgroundColor: bg }]}>
      <View style={[styles.badgeDot, { backgroundColor: dotColor }]} />
      <Text style={[styles.badgeText, { color: text }]}>{status}</Text>
    </View>
  );
}

export function StatCard({
  label,
  value,
  note,
  highlight,
}: {
  label: string;
  value: string | number;
  note?: string;
  highlight?: boolean;
}) {
  return (
    <View style={[styles.statCard, highlight && styles.statCardHighlight]}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, highlight && { color: color.primary }]}>{value}</Text>
      {note ? <Text style={styles.statNote}>{note}</Text> : null}
    </View>
  );
}

export function ProbabilityBar({
  label,
  value,
  modelName,
  threshold,
}: {
  label: string;
  value: number; // 0.0 - 1.0
  modelName?: string;
  threshold?: number;
}) {
  const pct = Math.min(100, Math.max(0, Math.round(value * 1000) / 10));
  const isHigh = pct >= (threshold ? threshold * 100 : 50);

  return (
    <View style={styles.probContainer}>
      <View style={styles.probHeader}>
        <View>
          <Text style={styles.probLabel}>{label}</Text>
          {modelName ? <Text style={styles.probModelName}>{modelName}</Text> : null}
        </View>
        <Text style={[styles.probValue, isHigh && { color: color.danger }]}>{pct.toFixed(1)}%</Text>
      </View>
      <View style={styles.probTrack}>
        <View
          style={[
            styles.probFill,
            { width: `${pct}%` },
            isHigh ? { backgroundColor: color.danger } : { backgroundColor: color.primary },
          ]}
        />
      </View>
    </View>
  );
}

function renderSafeChild(child: React.ReactNode, keyPrefix: string = 'note'): React.ReactNode {
  if (child === null || child === undefined || typeof child === 'boolean') {
    return null;
  }
  if (typeof child === 'string' || typeof child === 'number') {
    return child;
  }
  if (React.isValidElement(child)) {
    return child;
  }
  if (Array.isArray(child)) {
    return child.map((sub, i) => renderSafeChild(sub, keyPrefix + '-' + i));
  }
  if (typeof child === 'object') {
    const obj = child as Record<string, any>;
    if (typeof obj.msg === 'string') return obj.msg;
    if (typeof obj.message === 'string') return obj.message;
    if (typeof obj.detail === 'string') return obj.detail;
    return null;
  }
  return null;
}

export function Note({
  children,
  danger,
  success,
  variant,
  style,
}: {
  children: React.ReactNode;
  danger?: boolean;
  success?: boolean;
  variant?: 'info' | 'warning' | 'danger' | 'success';
  style?: ViewStyle;
}) {
  const safeContent = renderSafeChild(children);
  const activeVariant = variant || (danger ? 'danger' : success ? 'success' : 'info');

  let borderColor = color.secondary;
  let bgColor = color.secondaryLight;
  let textColor = color.secondaryDark;

  if (activeVariant === 'danger') {
    borderColor = color.danger;
    bgColor = color.dangerLight;
    textColor = color.danger;
  } else if (activeVariant === 'warning') {
    borderColor = color.warning;
    bgColor = color.warningLight;
    textColor = color.warning;
  } else if (activeVariant === 'success') {
    borderColor = color.success;
    bgColor = color.successLight;
    textColor = color.success;
  }

  return (
    <View style={[styles.noteBox, { backgroundColor: bgColor, borderLeftColor: borderColor }, style]}>
      <Text style={[styles.noteText, { color: textColor }]}>{safeContent}</Text>
    </View>
  );
}

export function Loading({ label = 'Processing...' }: { label?: string }) {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator color={color.primary} size="large" />
      {label ? <Text style={styles.loadingLabel}>{label}</Text> : null}
    </View>
  );
}

export function EmptyState({
  title,
  message,
  actionTitle,
  onAction,
}: {
  title: string;
  message: string;
  actionTitle?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconCircle}>
        <Text style={styles.emptyIcon}>📂</Text>
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyMessage}>{message}</Text>
      {actionTitle && onAction ? (
        <Button title={actionTitle} onPress={onAction} style={{ marginTop: spacing.md }} />
      ) : null}
    </View>
  );
}

export function SectionHeader({
  title,
  actionTitle,
  onAction,
}: {
  title: string;
  actionTitle?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionHeaderRow}>
      <Text style={styles.sectionHeaderTitle}>{title}</Text>
      {actionTitle && onAction ? (
        <Pressable onPress={onAction}>
          <Text style={styles.sectionHeaderAction}>{actionTitle}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function MetadataRow({
  label,
  value,
  isLast = false,
}: {
  label: string;
  value: string | number;
  isLast?: boolean;
}) {
  return (
    <View style={[styles.metadataRow, !isLast && styles.metadataRowBorder]}>
      <Text style={styles.metadataLabel}>{label}</Text>
      <Text style={styles.metadataValue}>{value}</Text>
    </View>
  );
}

export const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: color.bg,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 48,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: color.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  brandDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: color.primary,
    marginRight: 6,
  },
  brandText: {
    fontSize: 11,
    fontWeight: '700',
    color: color.primaryDark,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  backButtonIcon: {
    fontSize: 22,
    fontWeight: '600',
    color: color.primary,
    marginRight: 4,
    lineHeight: 22,
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: color.primary,
  },
  titleContainer: {
    marginBottom: 20,
  },
  pageTitle: {
    ...typography.titleLarge,
    marginBottom: 4,
  },
  pageSubtitle: {
    ...typography.bodyMedium,
    color: color.textMuted,
  },
  card: {
    backgroundColor: color.card,
    borderRadius: radius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: color.border,
    marginBottom: spacing.lg,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: {
        elevation: 1,
      },
      web: {
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      },
    }),
  },
  cardPressed: {
    opacity: 0.95,
    backgroundColor: '#F8FAFC',
  },
  buttonBase: {
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    flexDirection: 'row',
  },
  buttonNormal: {
    minHeight: 50,
    paddingHorizontal: 20,
  },
  buttonSmall: {
    minHeight: 38,
    paddingHorizontal: 14,
  },
  buttonPrimary: {
    backgroundColor: color.primary,
  },
  buttonSecondary: {
    backgroundColor: color.white,
    borderWidth: 1,
    borderColor: color.border,
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: color.primary,
  },
  buttonDanger: {
    backgroundColor: color.danger,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonTextBase: {
    fontWeight: '600',
  },
  buttonTextNormal: {
    fontSize: 15,
  },
  buttonTextSmall: {
    fontSize: 13,
  },
  buttonTextPrimary: {
    color: color.white,
  },
  buttonTextSecondary: {
    color: color.text,
  },
  buttonTextOutline: {
    color: color.primary,
  },
  buttonTextDanger: {
    color: color.white,
  },
  inputContainer: {
    marginBottom: spacing.lg,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: color.text,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: color.white,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
  },
  inputWrapperFocused: {
    borderColor: color.primary,
  },
  inputWrapperError: {
    borderColor: color.danger,
  },
  textInput: {
    flex: 1,
    height: 48,
    color: color.text,
    fontSize: 15,
  },
  inputAction: {
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  inputActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: color.primary,
  },
  inputErrorText: {
    fontSize: 12,
    color: color.danger,
    marginTop: 4,
  },
  inputHelperText: {
    fontSize: 12,
    color: color.textMuted,
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: color.white,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.full,
    paddingHorizontal: 16,
    height: 44,
    marginBottom: spacing.lg,
  },
  searchIcon: {
    fontSize: 18,
    color: color.textMuted,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: color.text,
  },
  searchClear: {
    padding: 4,
  },
  searchClearText: {
    fontSize: 12,
    color: color.textMuted,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statCard: {
    flex: 1,
    backgroundColor: color.card,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: color.border,
  },
  statCardHighlight: {
    borderColor: '#BFDBFE',
    backgroundColor: color.primaryLight,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: color.textMuted,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: color.text,
    letterSpacing: -0.5,
  },
  statNote: {
    fontSize: 11,
    color: color.textSubtle,
    marginTop: 2,
  },
  probContainer: {
    marginBottom: 14,
  },
  probHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 6,
  },
  probLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: color.text,
  },
  probModelName: {
    fontSize: 11,
    color: color.textMuted,
  },
  probValue: {
    fontSize: 14,
    fontWeight: '700',
    color: color.text,
  },
  probTrack: {
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  probFill: {
    height: '100%',
    borderRadius: 4,
  },
  noteBox: {
    padding: 14,
    borderRadius: radius.md,
    borderLeftWidth: 3.5,
    marginBottom: spacing.lg,
  },
  noteText: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '400',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
  },
  loadingLabel: {
    fontSize: 14,
    color: color.textMuted,
    marginTop: 12,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyIcon: {
    fontSize: 24,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: color.text,
    marginBottom: 6,
  },
  emptyMessage: {
    fontSize: 13,
    color: color.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 8,
  },
  sectionHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: color.text,
    letterSpacing: -0.2,
  },
  sectionHeaderAction: {
    fontSize: 13,
    fontWeight: '600',
    color: color.primary,
  },
  metadataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  metadataRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  metadataLabel: {
    fontSize: 13,
    color: color.textMuted,
  },
  metadataValue: {
    fontSize: 14,
    fontWeight: '600',
    color: color.text,
  },
  footerContainer: {
    marginTop: 32,
    alignItems: 'center',
  },
  footerDivider: {
    width: 40,
    height: 2,
    backgroundColor: color.border,
    marginBottom: 12,
    borderRadius: 1,
  },
  footerText: {
    fontSize: 11,
    lineHeight: 16,
    color: color.textSubtle,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
});
