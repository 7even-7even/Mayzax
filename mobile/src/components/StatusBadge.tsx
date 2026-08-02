import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, spacing } from '@/theme';
import { getStatusColor } from '@/theme';

interface Props {
  status: string;
  label?: string;
  size?: 'sm' | 'md';
}

function humanize(s: string): string {
  if (!s) return '';
  return s
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function StatusBadge({ status, label, size = 'md' }: Props) {
  const color = getStatusColor(status);
  return (
    <View style={[
      styles.badge,
      { backgroundColor: color + '20', borderColor: color },
      size === 'sm' && { paddingVertical: 2, paddingHorizontal: spacing.sm },
    ]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text numberOfLines={1} style={[styles.text, { color }, size === 'sm' && { fontSize: 11 }]}>
        {label ?? humanize(status)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});
