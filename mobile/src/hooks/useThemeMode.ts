import { useColorScheme } from 'react-native';
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  mode: ThemeMode;
  resolved: 'light' | 'dark';
  setMode: (mode: ThemeMode) => void;
  hydrate: () => Promise<void>;
}

const STORAGE_KEY = 'mayzax.theme';

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: 'system',
  resolved: 'light',
  setMode: (mode) => {
    AsyncStorage.setItem(STORAGE_KEY, mode).catch(() => {});
    set({ mode, resolved: resolveMode(mode) });
  },
  hydrate: async () => {
    try {
      const stored = (await AsyncStorage.getItem(STORAGE_KEY)) as ThemeMode | null;
      const mode = stored ?? 'system';
      set({ mode, resolved: resolveMode(mode) });
    } catch {
      set({ mode: 'system', resolved: 'light' });
    }
  },
}));

function resolveMode(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'light' || mode === 'dark') return mode;
  // system: rely on useColorScheme at call site; default to light
  return 'light';
}

/** Hook that returns the currently effective theme ('light' | 'dark'). */
export function useResolvedTheme(): 'light' | 'dark' {
  const mode = useThemeStore((s) => s.mode);
  const system = useColorScheme();
  if (mode === 'system') return system === 'dark' ? 'dark' : 'light';
  return mode;
}
