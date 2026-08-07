import { MD3LightTheme, MD3DarkTheme, configureFonts } from 'react-native-paper';

export const colors = {
  primary: '#2a5da8',
  primaryDark: '#1e4785',
  primaryLight: '#3b82f6',
  accent: '#3f9c71',
  accentDark: '#2d7653',
  background: '#f8fafc',
  surface: '#ffffff',
  surfaceDark: '#090d16',
  card: '#ffffff',
  cardDark: '#0d1321',
  text: '#0f172a',
  textMuted: '#64748b',
  textDark: '#f8fafc',
  textMutedDark: '#94a3b8',
  border: '#e2e8f0',
  borderDark: '#1e293b',
  muted: '#e2e8f0',
  success: '#3f9c71',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  // Status colors (aligned with UserStatus)
  statusActive: '#3f9c71',
  statusOnline: '#3f9c71',
  statusShortBreak: '#f59e0b',
  statusDinnerBreak: '#ea580c',
  statusBriefing: '#8b5cf6',
  statusMeeting: '#6366f1',
  statusSystemIssue: '#ef4444',
  statusOffline: '#94a3b8',
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
