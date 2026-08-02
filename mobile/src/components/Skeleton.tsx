import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';
import { useResolvedTheme } from '@/hooks/useThemeMode';
import { colors, radius } from '@/theme';

interface Props {
  width?: number | `${number}%` | 'auto';
  height?: number;
  radius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = '100%', height = 14, radius: r = radius.sm, style }: Props) {
  const dark = useResolvedTheme() === 'dark';
  const opacity = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);
  return (
    <Animated.View
      style={[
        styles.base,
        {
          width: (width as any),
          height,
          borderRadius: r,
          backgroundColor: dark ? '#1f2937' : '#e5e7eb',
          opacity,
        },
        style,
      ]}
    />
  );
}

export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <View style={{ padding: 16, gap: 10 }}>
      <Skeleton width="60%" height={16} />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} width={`${80 - i * 8}%`} height={12} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {},
});
