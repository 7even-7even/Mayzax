import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { colors } from '@/theme';

interface Props {
  name?: string | null;
  url?: string | null;
  size?: number;
  color?: string;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const MUTED_BG = colors.muted;

export function Avatar({ name = 'User', url, size = 48, color = colors.primary }: Props) {
  const fontSize = size * 0.4;
  if (url) {
    return (
      <Image
        source={{ uri: url }}
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: MUTED_BG }}
      />
    );
  }
  return (
    <View
      style={[
        styles.placeholder,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
      ]}
    >
      <Text style={[styles.initial, { fontSize }]}>{initials(name ?? 'U')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    color: '#fff',
    fontWeight: '700',
  },
});
