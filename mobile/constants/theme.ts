export const color = {
  bg: '#F7F9FC',
  card: '#FFFFFF',
  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  primaryLight: '#EFF6FF',
  secondary: '#0F766E',
  secondaryDark: '#115E59',
  secondaryLight: '#F0FDFA',
  text: '#111827',
  textMuted: '#64748B',
  textSubtle: '#94A3B8',
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  success: '#16A34A',
  successLight: '#DCFCE7',
  warning: '#D97706',
  warningLight: '#FEF3C7',
  danger: '#DC2626',
  dangerLight: '#FEE2E2',
  white: '#FFFFFF',
  black: '#000000',
  // Backward compatibility aliases
  navy: '#0F172A',
  teal: '#0F766E',
  muted: '#64748B',
};

export const typography = {
  titleLarge: { fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.6, color: color.text },
  titleMedium: { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.4, color: color.text },
  titleSmall: { fontSize: 18, fontWeight: '600' as const, letterSpacing: -0.2, color: color.text },
  bodyLarge: { fontSize: 16, lineHeight: 24, color: color.text },
  bodyMedium: { fontSize: 14, lineHeight: 21, color: color.text },
  bodySmall: { fontSize: 12, lineHeight: 18, color: color.textMuted },
  caption: { fontSize: 11, fontWeight: '600' as const, letterSpacing: 0.5, textTransform: 'uppercase' as const, color: color.textMuted },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};
