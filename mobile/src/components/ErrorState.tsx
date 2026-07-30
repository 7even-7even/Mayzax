import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Button } from 'react-native-paper';
import { useResolvedTheme } from '@/hooks/useThemeMode';
import { colors, spacing, typography } from '@/theme';

interface Props {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ message = 'Something went wrong. Please try again.', onRetry }: Props) {
  const dark = useResolvedTheme() === 'dark';
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>⚠️</Text>
      <Text style={[styles.title, { color: dark ? colors.textDark : colors.text }]}>Unable to load</Text>
      <Text style={[styles.desc, { color: dark ? colors.textMutedDark : colors.textMuted }]}>{message}</Text>
      {onRetry ? (
        <Button mode="contained" onPress={onRetry} style={{ marginTop: spacing.md }} buttonColor={colors.error}>
          Retry
        </Button>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
  icon: { fontSize: 40, marginBottom: spacing.sm },
  title: { ...typography.h3, marginBottom: spacing.xs },
  desc: { ...typography.body, textAlign: 'center' },
});
