import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Provider as PaperProvider } from 'react-native-paper';
import { QueryClientProvider } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { ActivityIndicator, View, StyleSheet } from 'react-native';

import { AuthProvider } from '@/hooks/useAuth';
import { useResolvedTheme, useThemeStore } from '@/hooks/useThemeMode';
import { RootNavigator } from '@/navigation/RootNavigator';
import { queryClient, asyncStoragePersister } from '@/state/queryClient';
import { lightTheme, darkTheme, colors } from '@/theme';
import { attachNotificationListeners } from '@/features/notifications/push';

function ThemedApp() {
  const dark = useResolvedTheme() === 'dark';
  return (
    <PaperProvider theme={dark ? darkTheme as any : lightTheme as any}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <RootNavigator />
    </PaperProvider>
  );
}

function App() {
  const hydrate = useThemeStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
    attachNotificationListeners();
    return () => {};
  }, [hydrate]);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{
            persister: asyncStoragePersister,
            maxAge: 7 * 24 * 60 * 60 * 1000,
          }}
          onSuccess={() => {
            queryClient.resumePausedMutations().then(() => {
              queryClient.invalidateQueries();
            });
          }}
        >
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <ThemedApp />
            </AuthProvider>
          </QueryClientProvider>
        </PersistQueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

// Fallback during query client restore
function RestoreFallback() {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
});

export default App;
