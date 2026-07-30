import * as SecureStore from 'expo-secure-store';

const KEYS = {
  accessToken: 'mayzax.accessToken',
  refreshToken: 'mayzax.refreshToken',
  rememberMe: 'mayzax.rememberMe',
  deviceId: 'mayzax.deviceId',
  userJson: 'mayzax.user',
  fcmToken: 'mayzax.fcmToken',
} as const;

async function setItem(key: string, value: string | null) {
  if (value === null || value === undefined) {
    await SecureStore.deleteItemAsync(key);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function getItem(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

export const secureStorage = {
  async getAccessToken(): Promise<string | null> {
    return getItem(KEYS.accessToken);
  },
  async setAccessToken(token: string | null) {
    return setItem(KEYS.accessToken, token);
  },
  async getRefreshToken(): Promise<string | null> {
    return getItem(KEYS.refreshToken);
  },
  async setRefreshToken(token: string | null) {
    return setItem(KEYS.refreshToken, token);
  },
  async getRememberMe(): Promise<boolean> {
    const v = await getItem(KEYS.rememberMe);
    return v === 'true';
  },
  async setRememberMe(value: boolean) {
    return setItem(KEYS.rememberMe, value ? 'true' : 'false');
  },
  async getDeviceId(): Promise<string> {
    let id = await getItem(KEYS.deviceId);
    if (!id) {
      id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      await setItem(KEYS.deviceId, id);
    }
    return id;
  },
  async getUser<T = any>(): Promise<T | null> {
    const raw = await getItem(KEYS.userJson);
    if (!raw) return null;
    try { return JSON.parse(raw) as T; } catch { return null; }
  },
  async setUser(user: any | null) {
    if (user === null) return setItem(KEYS.userJson, null);
    return setItem(KEYS.userJson, JSON.stringify(user));
  },
  async getFcmToken(): Promise<string | null> {
    return getItem(KEYS.fcmToken);
  },
  async setFcmToken(token: string | null) {
    return setItem(KEYS.fcmToken, token);
  },
  async clearAll() {
    await Promise.all([
      setItem(KEYS.accessToken, null),
      setItem(KEYS.refreshToken, null),
      setItem(KEYS.userJson, null),
      // Keep deviceId + rememberMe preference; clear FCM token (it will be refreshed)
      setItem(KEYS.fcmToken, null),
    ]);
  },
};
