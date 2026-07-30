import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useResolvedTheme } from '@/hooks/useThemeMode';
import { Card } from './Card';
import { colors, radius, spacing, typography } from '@/theme';

interface Props {
  label: string;
  value: React.ReactNode;
  accent?: string;
  sublabel?: string;
}

export function StatTile({ label, value, accent = colors.accent, sublabel }: Props) {
  const dark = useResolvedTheme() === 'dark';
  return (
    <Card
      padded
      style={[
        styles.tile,
        { backgroundColor: dark ? colors.cardDark : '#FFFFFF' },
      ]}
    >
      <Text style={[styles.label, { color: dark ? colors.textMutedDark : colors.textMuted }]}>{label}</Text>
      <Text style={[styles.value, { color: accent }]}>{value}</Text>
      {sublabel ? (
        <Text style={[styles.sublabel, { color: dark ? colors.textMutedDark : colors.textMuted }]}>
          {sublabel}
        </Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  value: {
    fontSize: 18,
    fontWeight: '700',
  },
  sublabel: {
    ...typography.small,
    marginTop: 2,
  },
});
