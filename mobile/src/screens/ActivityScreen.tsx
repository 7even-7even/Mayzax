import React, { useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { StatusBadge } from '@/components/StatusBadge';
import { Timeline } from '@/components/Timeline';
import { Skeleton } from '@/components/Skeleton';
import { ErrorState } from '@/components/ErrorState';
import { useResolvedTheme } from '@/hooks/useThemeMode';
import { useCountdown } from '@/hooks/useCountdown';
import { colors, spacing, typography } from '@/theme';
import { fetchToday } from '@/services/attendance';
import { formatDuration, formatDurationDigital, formatTime } from '@/utils/format';

export function ActivityScreen() {
  const dark = useResolvedTheme() === 'dark';
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['attendance', 'today'],
    queryFn: fetchToday,
    refetchInterval: 30 * 1000,
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  if (isLoading && !data) {
    return (
      <Screen>
        <Skeleton height={24} width="50%" style={{ marginBottom: spacing.md }} />
        <Skeleton height={100} style={{ marginBottom: spacing.md }} />
        <Skeleton height={200} />
      </Screen>
    );
  }

  if (isError && !data) {
    return <Screen><ErrorState message={(error as any)?.message} onRetry={() => refetch()} /></Screen>;
  }

  const today = data!.today;
  const timeline = data!.timeline.slice().reverse(); // newest first
  const breakInfo = today.currentBreak;
  const countdown = useCountdown(breakInfo?.expiresAt ?? null, data!.serverTime);

  return (
    <Screen onRefresh={() => refetch()} refreshing={false}>
      <Text style={[styles.title, { color: dark ? colors.textDark : colors.text }]}>Today's Activity</Text>
      <Text style={[styles.subtitle, { color: dark ? colors.textMutedDark : colors.textMuted }]}>
        {today.businessDate}
      </Text>

      <Card style={{ marginTop: spacing.md }}>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: dark ? colors.textMutedDark : colors.textMuted }]}>Current Status</Text>
            <StatusBadge status={today.currentStatus} label={today.currentStatusLabel} />
            <Text style={[styles.small, { color: dark ? colors.textMutedDark : colors.textMuted, marginTop: 4 }]}>
              since {today.currentStatusSince ? formatTime(today.currentStatusSince) : '--'}
            </Text>
          </View>
          {breakInfo ? (
            <View style={{ alignItems: 'flex-end' }}>
              <Text
                style={[
                  styles.countdown,
                  { color: countdown.isOver ? colors.error : dark ? colors.textDark : colors.text },
                ]}
              >
                {countdown.isOver ? '+' : ''}{formatDurationDigital(countdown.remainingSec)}
              </Text>
              <Text style={[styles.small, { color: countdown.isOver ? colors.error : colors.textMuted }]}>
                {countdown.isOver ? 'over break time' : 'remaining'}
              </Text>
            </View>
          ) : today.expectedLogoutAt ? (
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.countdown, { color: dark ? colors.textDark : colors.text }]}>
                {formatTime(today.expectedLogoutAt)}
              </Text>
              <Text style={[styles.small, { color: colors.textMuted }]}>Expected logout</Text>
            </View>
          ) : null}
        </View>
      </Card>

      <Card style={{ marginTop: spacing.md }}>
        <View style={styles.gridRow}>
          <Metric label="Login" value={today.firstLoginAt ? formatTime(today.firstLoginAt) : '--'} dark={dark} />
          <Metric label="Logout" value={today.lastLogoutAt ? formatTime(today.lastLogoutAt) : '--'} dark={dark} />
        </View>
        <View style={styles.gridRow}>
          <Metric label="Worked" value={formatDuration(today.workedSeconds)} dark={dark} />
          <Metric label="Productive" value={formatDuration(today.productiveSeconds)} dark={dark} accent={colors.success} />
        </View>
        <View style={styles.gridRow}>
          <Metric label="Breaks" value={formatDuration(today.breakSeconds)} dark={dark} accent={colors.warning} />
          <Metric label="Remaining" value={formatDuration(today.remainingWorkSeconds)} dark={dark} accent={colors.primaryLight} />
        </View>
      </Card>

      <Text style={[styles.section, { color: dark ? colors.textDark : colors.text, marginTop: spacing.lg }]}>Timeline</Text>
      {timeline.length === 0 ? (
        <Card>
          <Text style={[styles.small, { color: colors.textMuted, textAlign: 'center' }]}>
            No activity recorded yet. Your timeline will appear once you log in via the desktop CMS.
          </Text>
        </Card>
      ) : (
        <Card padded={false} style={{ paddingHorizontal: 0 }}>
          <View style={{ padding: spacing.lg, paddingBottom: 0 }}>
            <Timeline items={timeline} />
          </View>
        </Card>
      )}
    </Screen>
  );
}

function Metric({ label, value, dark, accent }: { label: string; value: string; dark: boolean; accent?: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={[styles.small, { color: dark ? colors.textMutedDark : colors.textMuted, textTransform: 'uppercase', fontWeight: '700', letterSpacing: 0.5 }]}>
        {label}
      </Text>
      <Text style={[styles.metricValue, { color: accent ?? (dark ? colors.textDark : colors.text) }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.h2 },
  subtitle: { ...typography.small, marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center' },
  label: { ...typography.small, marginBottom: 6 },
  small: { ...typography.small },
  countdown: { fontSize: 28, fontWeight: '800' },
  section: { ...typography.h3, marginBottom: spacing.sm },
  metricValue: { fontSize: 18, fontWeight: '700', marginTop: 2 },
  gridRow: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
});
