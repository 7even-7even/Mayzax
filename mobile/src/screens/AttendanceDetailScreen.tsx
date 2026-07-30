import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Timeline } from '@/components/Timeline';
import { StatTile } from '@/components/StatTile';
import { Skeleton } from '@/components/Skeleton';
import { ErrorState } from '@/components/ErrorState';
import { useResolvedTheme } from '@/hooks/useThemeMode';
import { colors, spacing, typography } from '@/theme';
import { fetchDayDetail } from '@/services/attendance';
import { formatDuration, formatDateTime, formatTime } from '@/utils/format';
import { getStatusColor } from '@/theme';
import dayjs from 'dayjs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'AttendanceDetail'>;

export function AttendanceDetailScreen({ route }: Props) {
  const dark = useResolvedTheme() === 'dark';
  const { date } = route.params;

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['attendance', 'day', date],
    queryFn: () => fetchDayDetail(date),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <Screen>
        <Skeleton height={24} width="60%" style={{ marginBottom: spacing.md }} />
        <Skeleton height={120} style={{ marginBottom: spacing.md }} />
        <Skeleton height={200} />
      </Screen>
    );
  }

  if (isError || !data) {
    return <Screen><ErrorState message={(error as any)?.message} onRetry={() => refetch()} /></Screen>;
  }

  const statusColor = getStatusColor(data.status);
  const statusLabel = data.status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase());

  return (
    <Screen onRefresh={() => refetch()} refreshing={false}>
      <Card style={{ marginBottom: spacing.md }}>
        <Text style={[styles.date, { color: dark ? colors.textDark : colors.text }]}>
          {dayjs(date).format('dddd, DD MMMM YYYY')}
        </Text>
        <View style={[styles.statusRow, { marginTop: 8 }]}>
          <View style={[styles.statusPill, { backgroundColor: statusColor + '22', borderColor: statusColor }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
          {data.penaltyMinutes > 0 ? (
            <View style={[styles.statusPill, { backgroundColor: colors.error + '22', borderColor: colors.error }]}>
              <Text style={[styles.statusText, { color: colors.error }]}>Penalty {data.penaltyMinutes}m</Text>
            </View>
          ) : null}
        </View>
        <View style={[styles.grid, { marginTop: spacing.md }]}>
          <Row label="Login" value={data.firstLoginAt ? formatTime(data.firstLoginAt) : '--'} dark={dark} />
          <Row label="Logout" value={data.lastLogoutAt ? formatTime(data.lastLogoutAt) : '--'} dark={dark} />
          <Row label="Late by" value={data.lateByMinutes > 0 ? `${data.lateByMinutes}m` : 'On time'} dark={dark} accent={data.lateByMinutes > 0 ? colors.warning : colors.success} />
          <Row label="Left early" value={data.earlyByMinutes > 0 ? `${data.earlyByMinutes}m` : 'No'} dark={dark} accent={data.earlyByMinutes > 0 ? colors.warning : colors.success} />
          <Row label="Expected logout" value={data.expectedLogoutAt ? formatTime(data.expectedLogoutAt) : '--'} dark={dark} />
        </View>
      </Card>

      <View style={styles.statRow}>
        <StatTile label="Worked" value={formatDuration(data.totalLoggedInSec)} accent={colors.success} />
        <View style={{ width: spacing.sm }} />
        <StatTile label="Productive" value={formatDuration(data.totalProductiveSec)} accent={colors.accent} />
      </View>
      <View style={[styles.statRow, { marginTop: spacing.sm }]}>
        <StatTile label="Short Break" value={formatDuration(data.shortBreakSec)} accent={colors.statusShortBreak} />
        <View style={{ width: spacing.sm }} />
        <StatTile label="Dinner" value={formatDuration(data.dinnerBreakSec)} accent={colors.statusDinnerBreak} />
      </View>
      <View style={[styles.statRow, { marginTop: spacing.sm }]}>
        <StatTile label="Briefing" value={formatDuration(data.briefingSec)} accent={colors.statusBriefing} />
        <View style={{ width: spacing.sm }} />
        <StatTile label="Meeting" value={formatDuration(data.meetingSec)} accent={colors.statusMeeting} />
      </View>
      {data.systemIssueSec > 0 ? (
        <View style={[styles.statRow, { marginTop: spacing.sm }]}>
          <StatTile label="System Issue" value={formatDuration(data.systemIssueSec)} accent={colors.statusSystemIssue} />
          <View style={{ flex: 1 }} />
        </View>
      ) : null}

      <Text style={[styles.section, { color: dark ? colors.textDark : colors.text }]}>Timeline</Text>
      <Card padded={false}>
        <View style={{ padding: spacing.lg }}>
          {data.timeline.length === 0 ? (
            <Text style={{ color: colors.textMuted, textAlign: 'center', padding: spacing.lg }}>No activity recorded for this day.</Text>
          ) : (
            <Timeline items={data.timeline.slice().reverse()} />
          )}
        </View>
      </Card>
      {data.remarks ? (
        <Card style={{ marginTop: spacing.md }}>
          <Text style={[styles.section, { color: dark ? colors.textDark : colors.text, marginTop: 0 }]}>Remarks</Text>
          <Text style={{ color: dark ? colors.textMutedDark : colors.textMuted }}>{data.remarks}</Text>
        </Card>
      ) : null}
    </Screen>
  );
}

function Row({ label, value, dark, accent }: { label: string; value: string; dark: boolean; accent?: string }) {
  return (
    <View style={styles.gridRow}>
      <Text style={[styles.gridLabel, { color: dark ? colors.textMutedDark : colors.textMuted }]}>{label}</Text>
      <Text style={[styles.gridValue, { color: accent ?? (dark ? colors.textDark : colors.text) }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  date: { ...typography.h3 },
  statusRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth },
  statusText: { fontSize: 12, fontWeight: '700' },
  grid: {},
  gridRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  gridLabel: { ...typography.small, fontWeight: '600' },
  gridValue: { ...typography.body, fontWeight: '700' },
  statRow: { flexDirection: 'row' },
  section: { ...typography.h3, marginVertical: spacing.md },
});
