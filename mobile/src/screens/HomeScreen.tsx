import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useResolvedTheme } from '@/hooks/useThemeMode';
import { useFocusEffect } from '@react-navigation/native';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Avatar } from '@/components/Avatar';
import { StatusBadge } from '@/components/StatusBadge';
import { StatTile } from '@/components/StatTile';
import { CircularProgress } from '@/components/CircularProgress';
import { Skeleton } from '@/components/Skeleton';
import { ErrorState } from '@/components/ErrorState';
import { colors, spacing, typography } from '@/theme';
import { fetchToday } from '@/services/attendance';
import { formatDuration, formatDurationDigital, formatTime } from '@/utils/format';
import { useCountdown } from '@/hooks/useCountdown';
import type { RootStackParamList } from '@/navigation/RootNavigator';
import { useOnline } from '@/hooks/useOnline';
import dayjs from 'dayjs';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function HomeScreen() {
  const dark = useResolvedTheme() === 'dark';
  const nav = useNavigation<Nav>();
  const online = useOnline();
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['attendance', 'today'],
    queryFn: fetchToday,
    refetchInterval: 30 * 1000,
    staleTime: 10 * 1000,
    networkMode: 'online',
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  // Derive live break countdown from server state
  const breakInfo = data?.today.currentBreak;
  const breakCountdown = useCountdown(breakInfo?.expiresAt ?? null, data?.serverTime);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    if (h < 21) return 'Good evening';
    return 'Good night';
  }, []);

  const workProgress = data
    ? data.shift.expectedWorkSeconds > 0
      ? Math.min(1, data.today.productiveSeconds / data.shift.expectedWorkSeconds)
      : 0
    : 0;

  if (isLoading && !data) {
    return (
      <Screen>
        <Skeleton height={28} width="60%" style={{ marginBottom: spacing.md }} />
        <Skeleton height={80} style={{ marginBottom: spacing.md }} />
        <Skeleton height={200} style={{ marginBottom: spacing.md }} />
        <View style={styles.statRow}>
          <Skeleton height={70} style={{ flex: 1, marginRight: 8 }} />
          <Skeleton height={70} style={{ flex: 1, marginLeft: 8 }} />
        </View>
      </Screen>
    );
  }

  if (isError && !data) {
    return (
      <Screen>
        <ErrorState message={(error as any)?.message} onRetry={() => refetch()} />
      </Screen>
    );
  }

  const user = data!.user;
  const today = data!.today;
  const shift = data!.shift;

  return (
    <Screen
      scroll
      onRefresh={() => refetch()}
      refreshing={false}
      contentContainerStyle={{ paddingVertical: spacing.md }}
    >
      {/* Greeting header */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.greeting, { color: dark ? colors.textMutedDark : colors.textMuted }]}>
            {greeting},
          </Text>
          <Text style={[styles.userName, { color: dark ? colors.textDark : colors.text }]} numberOfLines={1}>
            {user.name}
          </Text>
          <Text style={[styles.userMeta, { color: dark ? colors.textMutedDark : colors.textMuted }]} numberOfLines={1}>
            {user.designation ?? 'Employee'} · {user.department ?? user.employeeId ?? ''}
          </Text>
        </View>
        <TouchableOpacity onPress={() => nav.navigate('Tabs', { screen: 'ProfileTab' })}>
          <Avatar name={user.name} url={user.avatarUrl} size={52} />
        </TouchableOpacity>
      </View>

      {/* Status card */}
      <Card style={{ marginTop: spacing.lg }}>
        <View style={styles.statusHeader}>
          <StatusBadge status={today.currentStatus} label={today.currentStatusLabel} />
          <Text style={[styles.shiftWindow, { color: dark ? colors.textMutedDark : colors.textMuted }]}>
            <MaterialCommunityIcons name="clock-outline" size={12} /> {shift.windowText}
          </Text>
        </View>
        <View style={styles.statusBody}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.bigTime, { color: dark ? colors.textDark : colors.text }]}>
              {today.firstLoginAt ? formatTime(today.firstLoginAt) : '-- : --'}
            </Text>
            <Text style={[styles.subMeta, { color: dark ? colors.textMutedDark : colors.textMuted }]}>
              {today.isLoggedIn ? 'Logged in since' : 'Not logged in yet'}
            </Text>
          </View>
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <Text style={[styles.bigTime, { color: dark ? colors.textDark : colors.text }]}>
              {today.expectedLogoutAt ? formatTime(today.expectedLogoutAt) : '-- : --'}
            </Text>
            <Text style={[styles.subMeta, { color: dark ? colors.textMutedDark : colors.textMuted }]}>
              Expected logout
            </Text>
          </View>
        </View>
      </Card>

      {/* Worked hours ring */}
      <Card style={{ marginTop: spacing.lg, alignItems: 'center', paddingVertical: spacing.xl }}>
        <CircularProgress
          value={workProgress}
          label={formatDurationDigital(today.productiveSeconds)}
          sublabel={`of ${formatDuration(shift.expectedWorkSeconds)} worked`}
          size={180}
          color={workProgress >= 1 ? colors.success : colors.accent}
          trackColor={dark ? '#334155' : '#E2E8F0'}
        />
        <View style={[styles.row, { marginTop: spacing.lg, width: '100%' }]}>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={[styles.metricValue, { color: colors.success }]}>
              {formatDurationDigital(today.productiveSeconds)}
            </Text>
            <Text style={[styles.metricLabel, { color: dark ? colors.textMutedDark : colors.textMuted }]}>Productive</Text>
          </View>
          <View style={styles.divider} />
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={[styles.metricValue, { color: colors.warning }]}>
              {formatDurationDigital(today.breakSeconds)}
            </Text>
            <Text style={[styles.metricLabel, { color: dark ? colors.textMutedDark : colors.textMuted }]}>On break</Text>
          </View>
          <View style={styles.divider} />
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={[styles.metricValue, { color: colors.primaryLight }]}>
              {formatDurationDigital(today.remainingWorkSeconds)}
            </Text>
            <Text style={[styles.metricLabel, { color: dark ? colors.textMutedDark : colors.textMuted }]}>Remaining</Text>
          </View>
        </View>
      </Card>

      {/* Current Break */}
      {today.currentBreak ? (
        <Card style={{ marginTop: spacing.lg, borderLeftWidth: 4, borderLeftColor: getStatusColor(today.currentStatus) }}>
          <View style={styles.row}>
            <MaterialCommunityIcons name="coffee-outline" size={22} color={colors.warning} style={{ marginRight: 8 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.breakTitle, { color: dark ? colors.textDark : colors.text }]}>
                {today.currentBreak.label}
              </Text>
              <Text style={[styles.breakMeta, { color: dark ? colors.textMutedDark : colors.textMuted }]}>
                Started {formatTime(today.currentBreak.startedAt)} · Allowed {formatDuration(today.currentBreak.allowedSec)}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text
                style={[
                  styles.breakRemaining,
                  { color: breakCountdown.isOver ? colors.error : dark ? colors.textDark : colors.text },
                ]}
              >
                {breakCountdown.isOver
                  ? `+${formatDurationDigital(breakCountdown.remainingSec)}`
                  : formatDurationDigital(breakCountdown.remainingSec)}
              </Text>
              <Text style={[styles.breakMeta, { color: breakCountdown.isOver ? colors.error : colors.textMuted }]}>
                {breakCountdown.isOver ? 'Over' : 'remaining'}
              </Text>
            </View>
          </View>
          <View style={[styles.progressBar, { backgroundColor: dark ? '#1f2937' : '#E2E8F0', marginTop: spacing.md }]}>
            <View
              style={{
                height: '100%',
                width: `${Math.min(100, Math.max(0, (today.currentBreak.usedSec / Math.max(1, today.currentBreak.allowedSec)) * 100))}%`,
                backgroundColor: breakCountdown.isOver ? colors.error : colors.accent,
                borderRadius: 4,
              }}
            />
          </View>
        </Card>
      ) : null}

      {/* Stat tiles */}
      <View style={[styles.row, { marginTop: spacing.lg }]}>
        <StatTile
          label="Late By"
          value={today.lateByMinutes > 0 ? `${today.lateByMinutes}m` : 'On time'}
          accent={today.lateByMinutes > 0 ? colors.warning : colors.success}
        />
        <View style={{ width: spacing.sm }} />
        <StatTile
          label="Penalty"
          value={today.penaltyMinutes > 0 ? `${today.penaltyMinutes}m` : 'None'}
          accent={today.penaltyMinutes > 0 ? colors.error : colors.success}
        />
      </View>
      <View style={[styles.row, { marginTop: spacing.sm }]}>
        <StatTile
          label="Short Break"
          value={formatDuration(today.totals.shortBreakSec)}
          accent={colors.statusShortBreak}
        />
        <View style={{ width: spacing.sm }} />
        <StatTile
          label="Dinner"
          value={formatDuration(today.totals.dinnerBreakSec)}
          accent={colors.statusDinnerBreak}
        />
      </View>

      {/* Quick Links */}
      <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
        <QuickLink
          label="View today's activity timeline"
          icon="timeline-clock"
          onPress={() => nav.navigate('Tabs', { screen: 'ActivityTab' })}
          dark={dark}
        />
        <QuickLink
          label="View attendance history"
          icon="calendar-month"
          onPress={() => nav.navigate('Tabs', { screen: 'HistoryTab' })}
          dark={dark}
        />
        <QuickLink
          label="Settings & Help"
          icon="cog-outline"
          onPress={() => nav.navigate('Settings')}
          dark={dark}
        />
      </View>

      {!online ? (
        <Text style={[styles.cacheHint, { color: dark ? colors.textMutedDark : colors.textMuted }]}>
          ⚠️ You're offline. Showing last cached data.
        </Text>
      ) : null}
      <Text style={[styles.cacheHint, { color: dark ? colors.textMutedDark : colors.textMuted, marginTop: 4 }]}>
        Last updated {dayjs(dataUpdatedAt).fromNow()}
      </Text>
    </Screen>
  );
}

function QuickLink({ label, icon, onPress, dark }: { label: string; icon: any; onPress: () => void; dark: boolean }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Card padded style={styles.quickLink}>
        <MaterialCommunityIcons name={icon} size={22} color={colors.accent} />
        <Text style={[styles.quickLinkText, { color: dark ? colors.textDark : colors.text }]}>{label}</Text>
        <Ionicons name="chevron-forward" size={18} color={dark ? colors.textMutedDark : colors.textMuted} />
      </Card>
    </TouchableOpacity>
  );
}

function getStatusColor(status: string) {
  switch (status) {
    case 'SHORT_BREAK': return colors.statusShortBreak;
    case 'DINNER_BREAK': return colors.statusDinnerBreak;
    case 'BRIEFING_TRAINING': return colors.statusBriefing;
    case 'MEETING': return colors.statusMeeting;
    case 'SYSTEM_ISSUE': return colors.statusSystemIssue;
    case 'ACTIVE':
    case 'ONLINE':
      return colors.statusActive;
    default: return colors.textMuted;
  }
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  greeting: { ...typography.small, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '700' },
  userName: { ...typography.h2, fontSize: 24 },
  userMeta: { ...typography.small, marginTop: 2 },
  statusHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  shiftWindow: { ...typography.small },
  statusBody: { flexDirection: 'row', marginTop: spacing.md },
  bigTime: { fontSize: 22, fontWeight: '700' },
  subMeta: { ...typography.small, marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center' },
  statRow: { flexDirection: 'row' },
  divider: { width: StyleSheet.hairlineWidth, height: 28, backgroundColor: '#E2E8F0' },
  metricValue: { fontSize: 20, fontWeight: '700' },
  metricLabel: { ...typography.small, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  breakTitle: { ...typography.h3, fontSize: 15 },
  breakMeta: { ...typography.small, marginTop: 2 },
  breakRemaining: { fontSize: 22, fontWeight: '800' },
  progressBar: { height: 8, borderRadius: 4, overflow: 'hidden' },
  quickLink: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  quickLinkText: { ...typography.body, flex: 1, marginLeft: spacing.md, fontWeight: '600' },
  cacheHint: { ...typography.small, textAlign: 'center', marginTop: spacing.lg },
});
