import React from 'react';
import { View, StyleSheet, ViewStyle, ScrollView, RefreshControl, ScrollViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useResolvedTheme } from '@/hooks/useThemeMode';
import { colors, spacing } from '@/theme';
import { OfflineBanner } from './OfflineBanner';

interface Props {
  children: React.ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
  refreshing?: boolean;
  onRefresh?: () => void;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  scrollViewProps?: Partial<ScrollViewProps>;
}

export function Screen({
  children,
  scroll = true,
  style,
  contentContainerStyle,
  refreshing,
  onRefresh,
  edges = ['top', 'left', 'right'],
  scrollViewProps,
}: Props) {
  const dark = useResolvedTheme() === 'dark';
  const bg = dark ? '#0B1220' : colors.background;

  return (
    <SafeAreaView edges={edges} style={[styles.safe, { backgroundColor: bg }, style]}>
      <OfflineBanner />
      {scroll ? (
        <ScrollView
          style={{ flex: 1, backgroundColor: bg }}
          contentContainerStyle={[{ padding: spacing.lg, paddingBottom: spacing.xxl * 2 }, contentContainerStyle]}
          refreshControl={
            onRefresh ? (
              <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
            ) : undefined
          }
          keyboardShouldPersistTaps="handled"
          {...scrollViewProps}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1, padding: spacing.lg, backgroundColor: bg }, contentContainerStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
});
