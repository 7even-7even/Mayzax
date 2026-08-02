import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { useResolvedTheme } from '@/hooks/useThemeMode';
import { colors, radius, spacing } from '@/theme';

interface Props extends ViewProps {
  padded?: boolean;
  elevated?: boolean;
}

export function Card({ padded = true, elevated = true, style, children, ...rest }: Props) {
  const dark = useResolvedTheme() === 'dark';
  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: dark ? colors.cardDark : colors.card,
          borderColor: dark ? colors.borderDark : colors.border,
        },
        elevated && (dark ? styles.shadowDark : styles.shadowLight),
        padded && { padding: spacing.lg },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  shadowLight: {
    shadowColor: '#0B2545',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  shadowDark: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 2,
  },
});
