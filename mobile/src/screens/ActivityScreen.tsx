import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { StatusBadge } from '@/components/StatusBadge';
import { Timeline } from '@/components/Timeline';
import { Skeleton } from '@/components/Skeleton';
import { ErrorState } from '@/components/ErrorState';
import { useResolvedTheme } from '@/hooks/useThemeMode';
import { useCountdown } from '@/hooks/useCountdown';
import { useAuth } from '@/hooks/useAuth';
import { colors, spacing, typography } from '@/theme';
import {
  fetchToday,
  fetchJobPortalAnalytics,
  fetchDailyCounts,
  fetchAnalyticsSummary,
} from '@/services/attendance';
import { formatDuration, formatDurationDigital, formatTime } from '@/utils/format';
import type { AnalyticsSummaryDto, JobPortalAnalyticsDto, TeamSummaryItem } from '@/types/api';

const { width: W } = Dimensions.get('window');

// ─── Portal brand colors ──────────────────────────────────────────────────────
const PORTAL_COLORS: Record<string, string> = {
  LINKEDIN: '#0A66C2',
  INDEED: '#2164F3',
  NAUKRI: '#FF7043',
  GLASSDOOR: '#0CAA41',
  JOBRIGHT: '#7C3AED',
  SIMPLIFY: '#06B6D4',
  SIMPLYHIRED: '#F59E0B',
  WELLFOUND: '#000000',
  HANDSHAKE: '#E11D48',
  SPEEDY_APPLY: colors.primary,
  THE_MUSE: '#EC4899',
  Y_COMBINATOR: '#F97316',
  LEVER: '#10B981',
  GREENHOUSE: '#059669',
  CAREER_SITE: '#6366F1',
  OTHER: '#94A3B8',
};

function portalLabel(name: string) {
  return name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function formatTopPerformer(nameStr: string): string {
  if (!nameStr || nameStr === '—') return '—';
  let normalized = nameStr.replace(/\r?\n|\r/g, ' ').trim();
  const scoreMatch = normalized.match(/\(\d+\)/);
  const score = scoreMatch ? ' ' + scoreMatch[0] : '';
  let nameOnly = scoreMatch ? normalized.replace(scoreMatch[0], '') : normalized;
  nameOnly = nameOnly.replace(/\s+/g, ' ').trim();
  const parts = nameOnly.split(' ');
  if (parts.length <= 1) return normalized;
  const firstName = parts[0];
  const lastInitial = parts[1].charAt(0).toUpperCase() + '.';
  return `${firstName} ${lastInitial}${score}`;
}

function AnalyticsHeader({ dateText, shiftText, dark }: { dateText: string; shiftText: string; dark: boolean }) {
  return (
    <LinearGradient
      colors={['#2A5DA8', '#347F80', '#3F9C71']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.heroBanner}
    >
      <View style={styles.heroGlowTL} />
      <View style={styles.heroGlowBR} />
      {/* <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg }}>
        <Image
          source={require('../../assets/mayzax-logo.png')}
          style={styles.heroLogo}
          resizeMode="contain"
        />
        <Text style={styles.heroAppName}>Mayzax Companion</Text>
      </View> */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Text style={styles.heroGreeting}>Performance & Stats</Text>
          <Text style={styles.heroName} numberOfLines={1}>Analytics Hub</Text>
          <View style={styles.heroBadgeRow}>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>{dateText}</Text>
            </View>
            {shiftText ? (
              <View style={[styles.heroBadge, { backgroundColor: 'rgba(255,255,255,0.12)' }]}>
                <Text style={styles.heroBadgeText}>{shiftText}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </LinearGradient>
  );
}

// ─── Big metric tile ──────────────────────────────────────────────────────────
function BigTile({ label, value, accent, icon, dark }: {
  label: string; value: string | number; accent: string; icon: string; dark: boolean;
}) {
  const isLongText = typeof value === 'string' && /[a-zA-Z]/.test(value);
  return (
    <Card style={[styles.bigTile, { borderLeftWidth: 3, borderLeftColor: accent }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        <Text
          style={[
            styles.bigTileValue,
            {
              color: accent,
              flex: 1,
              marginRight: spacing.xs,
              fontSize: isLongText ? 15 : 24,
              lineHeight: isLongText ? 18 : 28,
            },
          ]}
          numberOfLines={3}
        >
          {value}
        </Text>
        <MaterialCommunityIcons name={icon as any} size={24} color={accent} style={{ opacity: 0.7, marginRight: 6 }} />
      </View>
      <Text style={[styles.bigTileLabel, { color: dark ? colors.textMutedDark : colors.textMuted }]}>{label}</Text>
    </Card>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({ title, sub, dark }: { title: string; sub?: string; dark: boolean }) {
  return (
    <View style={{ marginTop: spacing.xl, marginBottom: spacing.sm }}>
      <Text style={[styles.sectionTitle, { color: dark ? colors.textDark : colors.text }]}>{title}</Text>
      {sub ? <Text style={[styles.sectionSub, { color: dark ? colors.textMutedDark : colors.textMuted }]}>{sub}</Text> : null}
    </View>
  );
}

// ─── Admin Analytics Screen ───────────────────────────────────────────────────
function AdminAnalyticsScreen({ dark }: { dark: boolean }) {
  const range = useMemo(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 13);
    return {
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
    };
  }, []);

  const { data: summary, isLoading: summaryLoading, isError: summaryError, refetch: refetchSummary } = useQuery({
    queryKey: ['analytics', 'summary'],
    queryFn: fetchAnalyticsSummary,
    refetchInterval: 60 * 1000,
  });

  const { data: portals, isLoading: portalsLoading, refetch: refetchPortals } = useQuery({
    queryKey: ['analytics', 'job-portals', 'currentShift'],
    queryFn: () => fetchJobPortalAnalytics('currentShift'),
    refetchInterval: 60 * 1000,
  });

  const { data: dailyCounts, isLoading: dailyLoading, refetch: refetchDaily } = useQuery({
    queryKey: ['analytics', 'daily-counts', range.from, range.to],
    queryFn: () => fetchDailyCounts({ from: range.from, to: range.to }),
    refetchInterval: 60 * 1000,
  });

  useFocusEffect(
    useCallback(() => {
      refetchSummary();
      refetchPortals();
      refetchDaily();
    }, [refetchSummary, refetchPortals, refetchDaily]),
  );

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchSummary(), refetchPortals(), refetchDaily()]);
    setRefreshing(false);
  }, [refetchSummary, refetchPortals, refetchDaily]);

  const chartData = useMemo(() => (dailyCounts ?? []).slice(-14), [dailyCounts]);
  const peak = chartData.reduce((m, d) => Math.max(m, d.count), 0);
  const totalInRange = chartData.reduce((s, d) => s + d.count, 0);
  const avgPerDay = chartData.length > 0 ? (totalInRange / chartData.length).toFixed(1) : '0';

  const portalList = (portals?.portals ?? [])
    .filter(p => p.count > 0)
    .sort((a, b) => b.count - a.count);
  const portalTotal = portals?.totalApplications ?? 0;

  const teams = summary?.teams ?? [];
  const roleBreakdown = summary?.roleBreakdown ?? {};

  if (summaryLoading && !summary) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: dark ? '#0B1220' : colors.background }} edges={['top']}>
        <Skeleton height={190} style={{ borderRadius: 0 }} />
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.lg }}>
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
            <Skeleton height={80} style={{ flex: 1 }} />
            <Skeleton height={80} style={{ flex: 1 }} />
          </View>
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg }}>
            <Skeleton height={80} style={{ flex: 1 }} />
            <Skeleton height={80} style={{ flex: 1 }} />
          </View>
          <Skeleton height={160} style={{ marginBottom: spacing.md }} />
          <Skeleton height={200} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (summaryError && !summary) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: dark ? '#0B1220' : colors.background, justifyContent: 'center' }}>
        <ErrorState message="Failed to load analytics" onRetry={() => { refetchSummary(); refetchPortals(); refetchDaily(); }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: dark ? '#0B1220' : colors.background }} edges={['top']}>
      <AnalyticsHeader
        dateText={summary?.currentBusinessDate || ''}
        shiftText={summary?.shiftWindowText || ''}
        dark={dark}
      />
      <ScrollView
        style={{ flex: 1, backgroundColor: dark ? colors.surfaceDark : colors.background }}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl * 2 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        {/* ─── Live Status Row ─── */}
        <SectionHeader title="Live Status" sub="Current shift activity" dark={dark} />
        <View style={styles.tileGrid}>
          <BigTile label="Active Now" value={summary?.activeMemberCount ?? 0} accent={colors.success} icon="account-check" dark={dark} />
          <BigTile label="On Break" value={summary?.onBreakMemberCount ?? 0} accent={colors.warning} icon="coffee" dark={dark} />
        </View>
        <View style={styles.tileGrid}>
          <BigTile label="Today's Applications" value={summary?.currentShiftApplications ?? 0} accent="#8b5cf6" icon="briefcase-upload" dark={dark} />
          <BigTile label="Top Performer" value={formatTopPerformer(summary?.topPerformer || '—')} accent={colors.accent} icon="trophy" dark={dark} />
        </View>

      {/* ─── Organisation Overview ─── */}
      <SectionHeader title="Organisation" sub="Total counts across all roles" dark={dark} />
      <View style={styles.tileGrid}>
        <BigTile label="Total Users" value={summary?.totalRecruiters ?? 0} accent={colors.primary} icon="account-group" dark={dark} />
        <BigTile label="Recruiters" value={summary?.activeRecruiters ?? 0} accent={colors.success} icon="account-check-outline" dark={dark} />
      </View>
      <View style={styles.tileGrid}>
        <BigTile label="Clients" value={summary?.totalProfiles ?? 0} accent={colors.warning} icon="card-account-details" dark={dark} />
        <BigTile label="Total Applications" value={summary?.totalApplications ?? 0} accent={colors.primaryLight} icon="briefcase-check" dark={dark} />
      </View>

      {/* Role breakdown pill row */}
      {Object.keys(roleBreakdown).length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm }}>
          {Object.entries(roleBreakdown).map(([role, count]) => (
            <View key={role} style={[styles.rolePill, { borderColor: dark ? '#334155' : '#E2E8F0', backgroundColor: dark ? '#1E293B' : '#F8FAFC' }]}>
              <Text style={[styles.rolePillText, { color: dark ? colors.textMutedDark : colors.textMuted }]}>
                {role.replace('_', ' ')} · <Text style={{ color: dark ? colors.textDark : colors.text, fontWeight: '700' }}>{count}</Text>
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* ─── Teams Breakdown ─── */}
      {teams.length > 0 && (
        <>
          <SectionHeader title={`Teams (${teams.length})`} sub="Per-team applications today vs all-time" dark={dark} />
          <View style={{ gap: spacing.sm }}>
            {teams.map((team) => {
              const initial = (team.teamName || team.tlName).charAt(0).toUpperCase();
              const pct = summary?.currentShiftApplications
                ? Math.round((team.currentApplications / summary.currentShiftApplications) * 100)
                : 0;
              return (
                <Card key={team.tlId} style={{ padding: 0, overflow: 'hidden' }}>
                  {/* Top accent bar */}
                  <View style={{ height: 3, backgroundColor: colors.primary, borderRadius: 0 }} />

                  <View style={{ padding: spacing.md }}>
                    {/* Header row */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
                      {/* Avatar */}
                      <View style={[styles.teamCardAvatar, { backgroundColor: colors.primary + '18' }]}>
                        <Text style={{ fontSize: 18, fontWeight: '900', color: colors.primary }}>{initial}</Text>
                      </View>
                      <View style={{ flex: 1, marginLeft: spacing.sm }}>
                        <Text style={[styles.teamCardName, { color: dark ? colors.textDark : colors.text }]}>
                          {team.teamName || team.tlName}
                        </Text>
                        <Text style={[styles.teamMeta, { color: dark ? colors.textMutedDark : colors.textMuted }]}>
                          TL: {team.tlName}
                        </Text>
                      </View>
                      {/* Today badge */}
                      <View style={styles.todayBadge}>
                        <Text style={styles.todayBadgeValue}>{team.currentApplications}</Text>
                        <Text style={styles.todayBadgeLabel}>today</Text>
                      </View>
                    </View>

                    {/* Stat chips row */}
                    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                      <StatChip
                        icon="account-multiple"
                        value={`${team.memberCount}`}
                        label="Members"
                        accent={colors.primary}
                        dark={dark}
                      />
                      <StatChip
                        icon="briefcase-check"
                        value={`${team.totalApplications}`}
                        label="All-time"
                        accent={colors.success}
                        dark={dark}
                      />
                      <StatChip
                        icon="chart-line"
                        value={`${pct}%`}
                        label="Share"
                        accent="#8b5cf6"
                        dark={dark}
                      />
                    </View>

                    {/* Progress bar */}
                    {summary?.currentShiftApplications ? (
                      <View style={{ marginTop: spacing.sm }}>
                        <View style={{ height: 5, borderRadius: 4, backgroundColor: dark ? '#334155' : '#E2E8F0', overflow: 'hidden', marginTop: 6 }}>
                          <View style={{ height: 5, borderRadius: 4, width: `${Math.min(pct, 100)}%`, backgroundColor: colors.primary }} />
                        </View>
                      </View>
                    ) : null}
                  </View>
                </Card>
              );
            })}
          </View>
        </>
      )}


      {/* ─── Applications Trend Chart ─── */}
      <SectionHeader title="Applications Trend" sub="Last 14 business days" dark={dark} />
      <Card>
        {dailyLoading && !dailyCounts ? (
          <Skeleton height={120} />
        ) : chartData.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>No data in range</Text>
        ) : (
          <>
            {/* Summary row above chart */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md }}>
              <View style={{ alignItems: 'center' }}>
                <Text style={[styles.chartStat, { color: colors.accent }]}>{totalInRange}</Text>
                <Text style={[styles.chartStatLabel, { color: dark ? colors.textMutedDark : colors.textMuted }]}>Total</Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={[styles.chartStat, { color: colors.success }]}>{avgPerDay}</Text>
                <Text style={[styles.chartStatLabel, { color: dark ? colors.textMutedDark : colors.textMuted }]}>Avg/Day</Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={[styles.chartStat, { color: colors.warning }]}>{peak}</Text>
                <Text style={[styles.chartStatLabel, { color: dark ? colors.textMutedDark : colors.textMuted }]}>Peak</Text>
              </View>
            </View>
            {/* Bar chart */}
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 110, gap: 2 }}>
              {chartData.map((d, i) => {
                const isToday = i === chartData.length - 1;
                const barH = peak > 0 ? Math.max(4, (d.count / peak) * 88) : 4;
                return (
                  <View key={d.businessDate} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
                    {d.count > 0 && (
                      <Text style={{ fontSize: 8, color: isToday ? colors.accent : colors.textMuted, marginBottom: 2, fontWeight: '700' }}>
                        {d.count}
                      </Text>
                    )}
                    <View style={{ width: '78%', height: barH, borderRadius: 3, backgroundColor: isToday ? colors.accent : (dark ? '#334155' : '#CBD5E1') }} />
                    <Text style={{ fontSize: 7.5, color: colors.textMuted, marginTop: 3 }}>
                      {d.businessDate.slice(5).replace('-', '/')}
                    </Text>
                  </View>
                );
              })}
            </View>
          </>
        )}
      </Card>

      {/* ─── Job Portal Breakdown ─── */}
      <SectionHeader title="Job Portals — Today" sub={`${portalTotal} applications this shift`} dark={dark} />
      <Card>
        {portalsLoading && !portals ? (
          <Skeleton height={140} />
        ) : portalList.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textMuted, textAlign: 'center' }]}>
            No applications this shift yet.
          </Text>
        ) : (
          <View style={{ gap: spacing.md }}>
            {portalList.map(p => {
              const pct = portalTotal > 0 ? p.count / portalTotal : 0;
              const accent = PORTAL_COLORS[p.portal] ?? colors.textMuted;
              return (
                <View key={p.portal}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: accent }} />
                      <Text style={[styles.portalName, { color: dark ? colors.textDark : colors.text }]}>
                        {portalLabel(p.portal)}
                      </Text>
                    </View>
                    <Text style={[styles.portalCount, { color: accent }]}>
                      {p.count} <Text style={{ color: dark ? colors.textMutedDark : colors.textMuted, fontWeight: '400' }}>({Math.round(pct * 100)}%)</Text>
                    </Text>
                  </View>
                  <View style={{ height: 6, borderRadius: 3, backgroundColor: dark ? '#334155' : '#E2E8F0', overflow: 'hidden' }}>
                    <View style={{ height: 6, borderRadius: 3, width: `${Math.round(pct * 100)}%`, backgroundColor: accent }} />
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </Card>
    </ScrollView>
  </SafeAreaView>
  );
}

// ─── Recruiter / TL Activity Screen ──────────────────────────────────────────
function AttendanceActivityScreen({ dark }: { dark: boolean }) {
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

  const breakInfo = data?.today.currentBreak;
  const countdown = useCountdown(breakInfo?.expiresAt ?? null, data?.serverTime ?? undefined);

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
  const timeline = data!.timeline.slice().reverse();
  const shortBreaksTaken = timeline.filter(t => t.status === 'SHORT_BREAK').length;
  const dinnerBreaksTaken = timeline.filter(t => t.status === 'DINNER_BREAK').length;

  return (
    <Screen onRefresh={() => refetch()} refreshing={false}>
      <Text style={[styles.pageTitle, { color: dark ? colors.textDark : colors.text }]}>Today's Activity</Text>
      <Text style={[styles.pageSub, { color: dark ? colors.textMutedDark : colors.textMuted }]}>
        {today.businessDate}
      </Text>

      <Card style={{ marginTop: spacing.md }}>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: dark ? colors.textMutedDark : colors.textMuted }]}>Current Status</Text>
            <StatusBadge status={today.currentStatus} label={today.currentStatusLabel} />
            <Text style={[styles.smallText, { color: dark ? colors.textMutedDark : colors.textMuted, marginTop: 4 }]}>
              since {today.currentStatusSince ? formatTime(today.currentStatusSince) : '--'}
            </Text>
          </View>
          {breakInfo ? (
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.countdown, { color: countdown.isOver ? colors.error : dark ? colors.textDark : colors.text }]}>
                {countdown.isOver ? '+' : ''}{formatDurationDigital(countdown.remainingSec)}
              </Text>
              <Text style={[styles.smallText, { color: countdown.isOver ? colors.error : colors.textMuted }]}>
                {countdown.isOver ? 'over break time' : 'remaining'}
              </Text>
            </View>
          ) : (
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.smallText, { color: dark ? colors.textMutedDark : colors.textMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, fontSize: 11 }]}>
                {data!.shift.name}
              </Text>
              <Text style={[styles.smallText, { color: colors.textMuted, marginTop: 4, fontSize: 12, fontWeight: '500' }]}>
                {data!.shift.windowText}
              </Text>
            </View>
          )}
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
          <Metric label="Short Break Left" value={`${Math.max(0, 2 - shortBreaksTaken)} / 2`} dark={dark} accent={colors.statusShortBreak} />
          <Metric label="Dinner Left" value={`${Math.max(0, 1 - dinnerBreaksTaken)} / 1`} dark={dark} accent={colors.statusDinnerBreak} />
        </View>
      </Card>

      <Text style={[styles.sectionTitle, { color: dark ? colors.textDark : colors.text, marginTop: spacing.lg, marginBottom: spacing.sm }]}>Timeline</Text>
      {timeline.length === 0 ? (
        <Card>
          <Text style={[styles.smallText, { color: colors.textMuted, textAlign: 'center' }]}>
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

// ─── Root export (role-aware) ──────────────────────────────────────────────────
export function ActivityScreen() {
  const dark = useResolvedTheme() === 'dark';
  const { user: authUser } = useAuth();
  const isAdmin = authUser?.role === 'ADMIN';

  if (isAdmin) {
    return <AdminAnalyticsScreen dark={dark} />;
  }

  return <AttendanceActivityScreen dark={dark} />;
}

// ─── Helpers ────────────────────────────────────────────────────────────────────
function Metric({ label, value, dark, accent }: { label: string; value: string; dark: boolean; accent?: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={[styles.smallText, { color: dark ? colors.textMutedDark : colors.textMuted, textTransform: 'uppercase', fontWeight: '700', letterSpacing: 0.5 }]}>
        {label}
      </Text>
      <Text style={[styles.metricValue, { color: accent ?? (dark ? colors.textDark : colors.text) }]}>{value}</Text>
    </View>
  );
}

function StatChip({ icon, value, label, accent, dark }: { icon: string; value: string; label: string; accent: string; dark: boolean }) {
  return (
    <View style={[styles.statChip, { backgroundColor: dark ? '#1E293B' : '#F8FAFC', borderColor: dark ? '#334155' : '#E2E8F0' }]}>
      <MaterialCommunityIcons name={icon as any} size={14} color={accent} />
      <Text style={[styles.statChipValue, { color: accent }]}>{value}</Text>
      <Text style={[styles.statChipLabel, { color: dark ? colors.textMutedDark : colors.textMuted }]}>{label}</Text>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Hero banner
  heroBanner: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    overflow: 'hidden',
  },
  heroGlowTL: {
    position: 'absolute', top: -50, left: -50, width: 180, height: 180,
    borderRadius: 90, backgroundColor: 'rgba(255,255,255,0.10)',
  },
  heroGlowBR: {
    position: 'absolute', bottom: -30, right: -30, width: 160, height: 160,
    borderRadius: 80, backgroundColor: 'rgba(63,156,113,0.22)',
  },
  heroLogo: { width: 32, height: 32, borderRadius: 8, marginRight: 8 },
  heroAppName: { fontSize: 18, fontWeight: '800', color: 'rgba(255,255,255,0.92)', letterSpacing: 0.5 },
  heroGreeting: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: 0.8 },
  heroName: { fontSize: 26, fontWeight: '800', color: '#fff', marginTop: 2, letterSpacing: -0.3 },
  heroBadgeRow: { flexDirection: 'row', gap: 6, marginTop: 6 },
  heroBadge: {
    backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 3,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)',
  },
  heroBadgeText: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.88)' },

  pageTitle: { ...typography.h2, fontWeight: '800' },
  pageSub: { ...typography.small, marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center' },
  label: { ...typography.small, marginBottom: 6 },
  smallText: { ...typography.small },
  countdown: { fontSize: 28, fontWeight: '800' },
  metricValue: { fontSize: 18, fontWeight: '700', marginTop: 2 },
  gridRow: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  sectionTitle: { ...typography.h3, fontSize: 16, fontWeight: '800' },
  sectionSub: { ...typography.small, marginTop: 1 },
  tileGrid: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  bigTile: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: 14,
  },
  bigTileValue: { fontSize: 24, fontWeight: '800' },
  bigTileLabel: { ...typography.small, marginTop: 2, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  rolePill: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  rolePillText: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  teamAvatar: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamName: { fontSize: 14, fontWeight: '700' },
  teamMeta: { fontSize: 12, marginTop: 1 },
  hairline: { height: StyleSheet.hairlineWidth },
  chartStat: { fontSize: 20, fontWeight: '800' },
  chartStatLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 1 },
  portalName: { fontSize: 13, fontWeight: '600' },
  portalCount: { fontSize: 13, fontWeight: '700' },
  emptyText: { ...typography.small, textAlign: 'center' },
  // ─── Team cards
  teamCardAvatar: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  teamCardName: { fontSize: 15, fontWeight: '800' },
  todayBadge: {
    alignItems: 'center',
    backgroundColor: '#EDE9FE',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 56,
  },
  todayBadgeValue: { fontSize: 18, fontWeight: '900', color: '#7C3AED' },
  todayBadgeLabel: { fontSize: 9, fontWeight: '700', color: '#8B5CF6', textTransform: 'uppercase', letterSpacing: 0.5 },
  statChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 6,
  },
  statChipValue: { fontSize: 13, fontWeight: '800' },
  statChipLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
});

