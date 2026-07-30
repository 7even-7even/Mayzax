import { QueryClient, MutationCache, QueryCache } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount: number, err: any) => {
        if (err?.status === 401 || err?.status === 403) return false;
        if (!err?.retryable) return false;
        return failureCount < 2;
      },
      staleTime: 30 * 1000,
      gcTime: 7 * 24 * 60 * 60 * 1000, // 7 days
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      networkMode: 'online',
    },
    mutations: {
      retry: false,
    },
  },
  queryCache: new QueryCache({
    onError: (err: any) => {
      // Global error handling: 401 is handled in axios interceptor; others bubble to consumers.
      if (err?.code === 'SESSION_EXPIRED') {
        // Auth context listens via an event bus
        authExpiredBus.emit();
      }
    },
  }),
  mutationCache: new MutationCache({
    onError: (_err: any) => { /* handled per-mutation */ },
  }),
});

export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'mayzax-query-cache-v1',
  throttleTime: 1000,
});

// Tiny event bus for session-expiry signaling
type Listener = () => void;
class AuthExpiredBus {
  private listeners: Listener[] = [];
  on(l: Listener) {
    this.listeners.push(l);
    return () => {
      this.listeners = this.listeners.filter((x) => x !== l);
    };
  }
  emit() {
    this.listeners.forEach((l) => l());
  }
}
export const authExpiredBus = new AuthExpiredBus();
