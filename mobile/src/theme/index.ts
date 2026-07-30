import { MD3LightTheme, MD3DarkTheme, configureFonts } from 'react-native-paper';

export const colors = {
  primary: '#0B2545',
  primaryDark: '#0E2551',
  primaryLight: '#1D4AA2',
  accent: '#13A89E',
  accentDark: '#0F877F',
  background: '#F5F7FB',
  surface: '#FFFFFF',
  surfaceDark: '#0F172A',
  card: '#FFFFFF',
  cardDark: '#1E293B',
  text: '#0F172A',
  textMuted: '#64748B',
  textDark: '#E2E8F0',
  textMutedDark: '#94A3B8',
  border: '#E2E8F0',
  borderDark: '#334155',
  muted: '#E2E8F0',
  success: '#16A34A',
  warning: '#D97706',
  error: '#DC2626',
  info: '#2563EB',
  // Status colors (aligned with UserStatus)
  statusActive: '#16A34A',
  statusOnline: '#16A34A',
  statusShortBreak: '#D97706',
  statusDinnerBreak: '#EA580C',
  statusBriefing: '#8B5CF6',
  statusMeeting: '#6366F1',
  statusSystemIssue: '#DC2626',
  statusOffline: '#94A3B8',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
};

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  pill: 999,
};

export const typography = {
  h1: { fontSize: 28, fontWeight: '700' as const },
  h2: { fontSize: 22, fontWeight: '700' as const },
  h3: { fontSize: 18, fontWeight: '600' as const },
  body: { fontSize: 14, fontWeight: '400' as const },
  small: { fontSize: 12, fontWeight: '400' as const },
  tiny: { fontSize: 10, fontWeight: '500' as const },
};

export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.primary,
    accent: colors.accent,
    background: colors.background,
    surface: colors.surface,
    text: colors.text,
    error: colors.error,
    onSurface: colors.text,
  },
};

export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: colors.primaryLight,
    accent: colors.accent,
    background: '#0B1220',
    surface: colors.surfaceDark,
    text: colors.textDark,
    error: colors.error,
    onSurface: colors.textDark,
  },
};

export function getStatusColor(status: string): string {
  switch (status) {
    case 'ACTIVE':
    case 'ONLINE':
    case 'PRESENT':
      return colors.statusActive;
    case 'SHORT_BREAK':
      return colors.statusShortBreak;
    case 'DINNER_BREAK':
      return colors.statusDinnerBreak;
    case 'BRIEFING_TRAINING':
      return colors.statusBriefing;
    case 'MEETING':
      return colors.statusMeeting;
    case 'SYSTEM_ISSUE':
      return colors.statusSystemIssue;
    case 'OFFLINE':
    case 'ABSENT':
      return colors.statusOffline;
    case 'HALF_DAY':
      return colors.warning;
    case 'WEEK_OFF':
    case 'HOLIDAY':
    case 'LEAVE':
      return '#7C3AED';
    case 'ON_BREAK':
      return colors.statusShortBreak;
    default:
      return colors.textMuted;
  }
}
