import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useOnline } from '@/hooks/useOnline';
import { colors, spacing } from '@/theme';

export function OfflineBanner() {
  const online = useOnline();
  if (online) return null;
  return (
    <View style={styles.banner}>
      <Text style={styles.text}>No internet connection — showing cached data</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.warning,
    paddingVertical: 6,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  text: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
