import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Button } from 'react-native-paper';
import { useResolvedTheme } from '@/hooks/useThemeMode';
import { colors, spacing, typography } from '@/theme';

interface Props {
  title: string;
  description?: string;
  icon?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ title, description, icon = '📭', actionLabel, onAction }: Props) {
  const dark = useResolvedTheme() === 'dark';
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={[styles.title, { color: dark ? colors.textDark : colors.text }]}>{title}</Text>
      {description ? (
        <Text style={[styles.desc, { color: dark ? colors.textMutedDark : colors.textMuted }]}>
          {description}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button mode="contained" onPress={onAction} style={{ marginTop: spacing.md }} buttonColor={colors.primary}>
          {actionLabel}
        </Button>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl * 2,
    paddingHorizontal: spacing.xl,
  },
  icon: { fontSize: 48, marginBottom: spacing.md },
  title: { ...typography.h3, marginBottom: spacing.xs, textAlign: 'center' },
  desc: { ...typography.body, textAlign: 'center' },
});
