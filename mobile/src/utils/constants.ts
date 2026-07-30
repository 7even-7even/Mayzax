import Constants from 'expo-constants';

export const API_BASE_URL: string =
  (Constants.expoConfig?.extra?.apiBaseUrl as string) ??
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  'http://10.0.2.2:4000/api/v1';

export const APP_NAME = process.env.EXPO_PUBLIC_APP_NAME ?? 'Mayzax Companion';
export const SUPPORT_EMAIL = process.env.EXPO_PUBLIC_SUPPORT_EMAIL ?? 'support@mayzax.example.com';
export const SUPPORT_PHONE = process.env.EXPO_PUBLIC_SUPPORT_PHONE ?? '';
export const PRIVACY_URL = process.env.EXPO_PUBLIC_PRIVACY_URL ?? 'https://mayzax.example.com/privacy';
export const TERMS_URL = process.env.EXPO_PUBLIC_TERMS_URL ?? 'https://mayzax.example.com/terms';

export const STALE = {
  short: 1000 * 30, // 30s for dashboard
  medium: 1000 * 60 * 5, // 5 minutes
  long: 1000 * 60 * 30, // 30 minutes for profile
};

export const PAGINATION = {
  pageSize: 20,
  notificationsPageSize: 30,
};
