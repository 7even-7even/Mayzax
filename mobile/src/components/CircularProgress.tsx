import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors, typography } from '@/theme';

interface Props {
  value: number; // 0..1
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  label?: string;
  sublabel?: string;
}

export function CircularProgress({
  value,
  size = 160,
  strokeWidth = 12,
  color = colors.accent,
  trackColor = '#E2E8F0',
  label,
  sublabel,
}: Props) {
  const clamped = Math.max(0, Math.min(1, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progressOffset = circumference - clamped * circumference;
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={progressOffset}
          strokeLinecap="round"
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={styles.labelWrap}>
        {label ? <Text style={styles.label} numberOfLines={1} adjustsFontSizeToFit>{label}</Text> : null}
        {sublabel ? <Text style={styles.sublabel}>{sublabel}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  labelWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  label: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  sublabel: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },
});
