import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient, setAccessToken as setApiToken, getAccessToken } from '@/lib/api-client';
import { User } from '@/types';

interface LoginInput {
  email: string;
  password: string;
}

interface SignupInput {
  name: string;
  email: string;
  password: string;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  accessToken: string | null;
  login: (input: LoginInput) => Promise<User>;
  signup: (input: SignupInput) => Promise<User>;
  logout: () => Promise<void>;
  setCurrentUser: (user: User) => void;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [accessToken, setAccessTokenState] = useState<string | null>(() => getAccessToken());
  const hasBootstrappedRef = useRef(false);
  const navigate = useNavigate();

  const setAuthToken = useCallback((token: string | null) => {
    setApiToken(token);
    setAccessTokenState(token);
  }, []);

  const bootstrap = useCallback(async () => {
    if (hasBootstrappedRef.current) return;
    hasBootstrappedRef.current = true;
    setIsLoading(true);
    try {
      // Fetch current session profile info using long-lived access cookie
      const { data } = await apiClient.get('/auth/me');
      setUser(data.data);
    } catch {
      setAuthToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [setAuthToken]);

  const refreshSession = useCallback(async () => {
    try {
      const { data } = await apiClient.get('/auth/me');
      setUser(data.data);
    } catch {
      setAuthToken(null);
      setUser(null);
      throw new Error('Session expired');
    }
  }, [setAuthToken]);

  useEffect(() => {
    bootstrap();

    const handleExpired = () => {
      // Check role before clearing user so we know where to redirect
      const currentRole = user?.role;
      setUser(null);
      setAuthToken(null);
      navigate(currentRole === 'CLIENT' ? '/client-login' : '/login', { replace: true });
    };
    window.addEventListener('auth:session-expired', handleExpired);
    return () => window.removeEventListener('auth:session-expired', handleExpired);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(async (input: LoginInput) => {
    const { data } = await apiClient.post('/auth/login', input);
    setAuthToken(data.data.tokens.accessToken);
    setUser(data.data.user);
    return data.data.user as User;
  }, [setAuthToken]);

  const signup = useCallback(async (input: SignupInput) => {
    const { data } = await apiClient.post('/auth/signup', input);
    setAuthToken(data.data.tokens.accessToken);
    setUser(data.data.user);
    return data.data.user as User;
  }, [setAuthToken]);

  const logout = useCallback(async () => {
    const redirectTo = user?.role === 'CLIENT' ? '/client-login' : '/login';
    try {
      await apiClient.post('/auth/logout');
    } finally {
      setAuthToken(null);
      setUser(null);
      navigate(redirectTo, { replace: true });
    }
  }, [navigate, setAuthToken, user]);

  // isAuthenticated now depends solely on user presence, avoiding token/memory race.
  // Token state is tracked separately for axios interceptor but UI gate uses user.
  const isAuthenticated = !!user && !isLoading;

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        accessToken,
        login,
        signup,
        logout,
        setCurrentUser: setUser,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

