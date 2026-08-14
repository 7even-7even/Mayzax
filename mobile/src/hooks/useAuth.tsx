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
  const [minSplashDone, setMinSplashDone] = useState(false);
  const [pendingUser, setPendingUser] = useState<MeUser | null | 'none'>('none');

  // Minimum splash display: 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => setMinSplashDone(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  // Resolve status only after both the auth check AND min splash time have completed
  useEffect(() => {
    if (!minSplashDone || pendingUser === 'none') return;
    if (pendingUser === null) {
      setStatus('unauthenticated');
    } else {
      setUser(pendingUser);
      setStatus('authenticated');
    }
  }, [minSplashDone, pendingUser]);

  const doSetUser = useCallback((u: MeUser | null) => {
    if (status === 'loading') {
      // We're still on splash — buffer the result
      setPendingUser(u);
    } else {
      setUser(u);
      setStatus(u ? 'authenticated' : 'unauthenticated');
    }
  }, [status]);

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
        if (!token) {
          setPendingUser(null);
          return;
        }
        // Attempt to get me to verify the session
        try {
          const me = await authService.me();
          if (!mounted) return;
          doSetUser(me);
          registerForPushNotificationsAsync().catch(() => {});
          return;
        } catch (inner: any) {
          // fall through to logout
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
