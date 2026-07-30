import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { secureStorage } from '@/storage/secure';
import * as authService from '@/services/auth';
import type { MeUser } from '@/types/api';
import { registerForPushNotificationsAsync, unregisterForPushNotifications } from '@/features/notifications/push';
import { authExpiredBus, queryClient } from '@/state/queryClient';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextValue {
  status: AuthStatus;
  user: MeUser | null;
  login: (email: string, password: string, rememberMe: boolean) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<MeUser | null>(null);

  const doSetUser = useCallback((u: MeUser | null) => {
    setUser(u);
    setStatus(u ? 'authenticated' : 'unauthenticated');
  }, []);

  const logout = useCallback(async () => {
    try { await unregisterForPushNotifications(); } catch {}
    await authService.logout(true);
    await queryClient.clear();
    doSetUser(null);
  }, [doSetUser]);

  const refreshUser = useCallback(async () => {
    try {
      const me = await authService.me();
      doSetUser(me);
    } catch (e: any) {
      if (e?.status === 401 || e?.code === 'SESSION_EXPIRED') {
        await authService.logout(false);
        doSetUser(null);
      }
    }
  }, [doSetUser]);

  const login = useCallback(async (email: string, password: string, rememberMe: boolean) => {
    const res = await authService.login({ email, password, rememberMe });
    doSetUser(res.user);
    // Register push notifications in background
    registerForPushNotificationsAsync().catch(() => {});
  }, [doSetUser]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const token = await secureStorage.getAccessToken();
        const refresh = await secureStorage.getRefreshToken();
        if (!token && !refresh) {
          setStatus('unauthenticated');
          return;
        }
        // Attempt to get me to verify the session; if 401, try refresh then retry.
        try {
          const me = await authService.me();
          if (!mounted) return;
          doSetUser(me);
          registerForPushNotificationsAsync().catch(() => {});
          return;
        } catch (inner: any) {
          if (inner?.status === 401 && refresh) {
            try {
              const r = await authService.refreshToken(refresh);
              const me = await authService.me();
              if (!mounted) return;
              doSetUser(me);
              registerForPushNotificationsAsync().catch(() => {});
              return;
            } catch {
              // fall through to logout
            }
          }
        }
        await authService.logout(false);
        if (mounted) doSetUser(null);
      } catch {
        if (mounted) setStatus('unauthenticated');
      }
    })();
    const unsub = authExpiredBus.on(() => {
      logout().catch(() => {});
    });
    return () => {
      mounted = false;
      unsub();
    };
  }, [doSetUser, logout]);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, login, logout, refreshUser }),
    [status, user, login, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
