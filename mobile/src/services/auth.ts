import { getApi } from './api';
import { secureStorage } from '@/storage/secure';
import type { AuthResponse, MeUser } from '@/types/api';

export interface LoginInput {
  email: string;
  password: string;
  rememberMe: boolean;
}

export async function login(input: LoginInput): Promise<AuthResponse> {
  const api = await getApi();
  // After response interceptor unwrapping, res.data is the "data" payload from the API (i.e. { tokens, user })
  const response = await api.post<any, any>('/auth/login', {
    email: input.email.trim().toLowerCase(),
    password: input.password,
  });

  console.log("LOGIN RESPONSE");
  console.log(JSON.stringify(response, null, 2));

  const data = (response ?? {}) as AuthResponse;
  if (!data?.tokens?.accessToken) {
    throw new Error('Invalid login response');
  }
  await secureStorage.setAccessToken(data.tokens.accessToken);
  await secureStorage.setRefreshToken(data.tokens.refreshToken);
  await secureStorage.setRememberMe(input.rememberMe);
  await secureStorage.setUser(data.user);
  return data;
}

export async function refreshToken(refreshTokenRaw: string): Promise<AuthResponse> {
  const api = await getApi();
  const response = await api.post<any, any>(
    '/auth/refresh',
    { refreshToken: refreshTokenRaw },
    { _skipAuth: true } as any,
  );
  const data = (response ?? {}) as AuthResponse;
  if (!data?.tokens?.accessToken) {
    throw new Error('Invalid refresh response');
  }
  await secureStorage.setAccessToken(data.tokens.accessToken);
  await secureStorage.setRefreshToken(data.tokens.refreshToken);
  await secureStorage.setUser(data.user);
  return data;
}

export async function me(): Promise<MeUser> {
  const api = await getApi();
  const response = await api.get<any, any>('/auth/me');
  const data = response as MeUser;
  await secureStorage.setUser(data);
  return data;
}

export async function forgotPasswordQuestion(email: string): Promise<{ email: string; securityQuestion: string }> {
  const api = await getApi();
  const res = await api.post('/auth/forgot-password/question', { email: email.trim().toLowerCase() }, { _skipAuth: true } as any);
  return res as unknown as { email: string; securityQuestion: string };
}

export async function resetPassword(input: { email: string; securityAnswer: string; newPassword: string }) {
  const api = await getApi();
  await api.post('/auth/forgot-password/reset', {
    email: input.email.trim().toLowerCase(),
    securityAnswer: input.securityAnswer,
    newPassword: input.newPassword,
  }, { _skipAuth: true } as any);
}

export async function logout(notifyServer = true): Promise<void> {
  try {
    if (notifyServer) {
      const refresh = await secureStorage.getRefreshToken();
      if (refresh) {
        const api = await getApi();
        await api.post('/auth/logout', { refreshToken: refresh }).catch(() => { });
      }
    }
  } finally {
    await secureStorage.clearAll();
  }
}
