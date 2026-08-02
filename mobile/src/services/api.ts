import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import * as Application from 'expo-application';
import * as Device from 'expo-device';
import { secureStorage } from '@/storage/secure';
import { API_BASE_URL } from '@/utils/constants';

const BASE_URL = API_BASE_URL;

export class ApiError extends Error {
  status: number;
  code?: string;
  retryable: boolean;
  data?: any;
  constructor(message: string, status: number, retryable = false, code?: string, data?: any) {
    super(message);
    this.status = status;
    this.retryable = retryable;
    this.code = code;
    this.data = data;
  }
}

declare module 'axios' {
  interface AxiosRequestConfig {
    _retry?: boolean;
    _skipAuth?: boolean;
  }
}

let api: AxiosInstance;
let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;
let failedQueue: Array<{ resolve: (t: string) => void; reject: (e: any) => void }> = [];

function processQueue(error: any, token: string | null) {
  failedQueue.forEach((p) => {
    if (error) p.reject(error);
    else p.resolve(token!);
  });
  failedQueue = [];
}

export async function buildApiClient(): Promise<AxiosInstance> {
  if (api) return api;

  api = axios.create({
    baseURL: BASE_URL,
    timeout: 20000,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor — attach auth + client headers
  api.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
      if (!config._skipAuth) {
        const token = await secureStorage.getAccessToken();
        if (token) config.headers.Authorization = `Bearer ${token}`;
      }
      config.headers['X-Client-Type'] = 'mobile';
      try {
        const deviceId = await secureStorage.getDeviceId();
        config.headers['X-Device-ID'] = deviceId;
      } catch { /* ignore */ }
      try {
        const appVersion = Application.nativeApplicationVersion ?? '0.0.0';
        const build = Application.nativeBuildVersion ?? '0';
        config.headers['X-App-Version'] = `${appVersion} (${build})`;
        config.headers['X-Device-Name'] = Device.modelName ?? 'unknown';
      } catch { /* ignore */ }
      return config;
    },
    (error) => Promise.reject(error),
  );

  // Response interceptor — unwrap, handle errors, token refresh
  api.interceptors.response.use(
    (res) => {
      // Backend wraps responses in { success, data }
      if (res.data && typeof res.data === 'object' && 'success' in res.data) {
        if (res.data.success === false) {
          const msg = res.data?.error?.message ?? res.data?.message ?? 'Request failed';
          return Promise.reject(new ApiError(msg, res.status, false, res.data?.error?.code, res.data));
        }
        if (res.data.pagination) {
          return {
            items: res.data.data,
            pagination: res.data.pagination,
            unreadCount: res.data.unreadCount,
          };
        }
        return res.data.data ?? null;
      }
      return res.data;
    },
    async (error: AxiosError<any>) => {
      const originalRequest: any = error.config;
      if (!error.response) {
        // Network error (no response)
        return Promise.reject(new ApiError('Network error. Please check your connection.', 0, true, 'NETWORK_ERROR'));
      }
      const status = error.response.status;
      const data = error.response.data;
      const message = data?.error?.message ?? data?.message ?? error.message ?? 'Request failed';
      if (status === 401 && !originalRequest?._retry && !originalRequest?._skipAuth) {
        if (isRefreshing) {
          // Queue concurrent requests
          try {
            const token = await new Promise<string>((resolve, reject) => {
              failedQueue.push({ resolve, reject });
            });
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          } catch (e) {
            return Promise.reject(e);
          }
        }
        originalRequest._retry = true;
        isRefreshing = true;
        refreshPromise = (async () => {
          try {
            const refresh = await secureStorage.getRefreshToken();
            if (!refresh) return null;
            const response = await api.post<any, any>(
              '/auth/refresh',
              { refreshToken: refresh },
              { _skipAuth: true } as any
            );
            const res = (response ?? {}) as any;
            if (!res?.tokens?.accessToken) return null;
            await secureStorage.setAccessToken(res.tokens.accessToken);
            await secureStorage.setRefreshToken(res.tokens.refreshToken);
            await secureStorage.setUser(res.user);
            processQueue(null, res.tokens.accessToken);
            return res.tokens.accessToken;
          } catch (e) {
            processQueue(e, null);
            await secureStorage.clearAll();
            return null;
          } finally {
            isRefreshing = false;
            refreshPromise = null;
          }
        })();
        const newToken = await refreshPromise;
        if (!newToken) {
          return Promise.reject(new ApiError('Session expired. Please log in again.', 401, false, 'SESSION_EXPIRED'));
        }
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      }
      const retryableCodes = [408, 429, 500, 502, 503, 504];
      return Promise.reject(new ApiError(message, status, retryableCodes.includes(status), String(status), data));
    },
  );

  return api;
}

export async function getApi(): Promise<AxiosInstance> {
  return buildApiClient();
}
