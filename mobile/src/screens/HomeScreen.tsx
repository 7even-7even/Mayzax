import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  Dimensions,
  Linking,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useResolvedTheme } from '@/hooks/useThemeMode';
import { useFocusEffect } from '@react-navigation/native';
import { Card } from '@/components/Card';
import { Avatar } from '@/components/Avatar';
import { StatusBadge } from '@/components/StatusBadge';
import { StatTile } from '@/components/StatTile';
import { CircularProgress } from '@/components/CircularProgress';
import { Skeleton } from '@/components/Skeleton';
import { ErrorState } from '@/components/ErrorState';
import { EmptyState } from '@/components/EmptyState';
import { Timeline } from '@/components/Timeline';
import { colors, spacing, typography } from '@/theme';
import { fetchToday, fetchAnalyticsSummary } from '@/services/attendance';
import { fetchClientStats, fetchClientApplications, fetchClientInterviews, fetchClientPayments } from '@/services/client';
import { formatDuration, formatDurationDigital, formatTime } from '@/utils/format';
import { useCountdown } from '@/hooks/useCountdown';
import type { RootStackParamList } from '@/navigation/RootNavigator';
import { useOnline } from '@/hooks/useOnline';
import { useAuth } from '@/hooks/useAuth';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

type Nav = NativeStackNavigationProp<RootStackParamList>;
const W = Dimensions.get('window').width;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getStatusColor(status: string) {
  switch (status) {
    case 'SHORT_BREAK': return colors.statusShortBreak;
    case 'DINNER_BREAK': return colors.statusDinnerBreak;
    case 'BRIEFING_TRAINING': return colors.statusBriefing;
    case 'MEETING': return colors.statusMeeting;
    case 'SYSTEM_ISSUE': return colors.statusSystemIssue;
    case 'ACTIVE': return colors.statusActive;
    default: return colors.textMuted;
  }
}

// ─── Shared components ────────────────────────────────────────────────────────

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

/** Metric tile with icon, bold value, small label */
function DashTile({
  icon, label, value, accent, dark, wide,
}: {
  icon: string; label: string; value: string | number; accent: string; dark: boolean; wide?: boolean;
}) {
  const isLongText = typeof value === 'string' && /[a-zA-Z]/.test(value);
  return (
    <Card style={[styles.dashTile, wide && { flex: 2 }, { borderLeftWidth: 3, borderLeftColor: accent }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        <Text
          style={[
            styles.dashTileValue,
            {
              color: accent,
              flex: 1,
              marginRight: spacing.xs,
              fontSize: isLongText ? 14 : 22,
              lineHeight: isLongText ? 17 : 26,
            },
          ]}
          numberOfLines={3}
        >
          {value}
        </Text>
        <MaterialCommunityIcons name={icon as any} size={22} color={accent} style={{ opacity: 0.65, marginRight: 6 }} />
      </View>
      <Text style={[styles.dashTileLabel, { color: dark ? colors.textMutedDark : colors.textMuted }]}>{label}</Text>
    </Card>
  );
}

/** Section heading with optional subtitle */
function SectionHead({ title, sub, dark }: { title: string; sub?: string; dark: boolean }) {
  return (
    <View style={{ marginTop: spacing.xl, marginBottom: spacing.sm }}>
      <Text style={[styles.sectionTitle, { color: dark ? colors.textDark : colors.text }]}>{title}</Text>
      {sub ? <Text style={[styles.sectionSub, { color: dark ? colors.textMutedDark : colors.textMuted }]}>{sub}</Text> : null}
    </View>
  );
}

/** Gradient banner hero for the greeting area */
function HeroBanner({ greeting, name, role, department, avatarName, avatarUrl, dark, onAvatarPress }: {
  greeting: string; name: string; role: string; department?: string | null;
  avatarName: string; avatarUrl: string | null; dark: boolean; onAvatarPress: () => void;
}) {
  return (
    <LinearGradient
      colors={['#2A5DA8', '#347F80', '#3F9C71']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.heroBanner}
    >
      {/* Ambient glows */}
      <View style={styles.heroGlowTL} />
      <View style={styles.heroGlowBR} />

      {/* Logo + app name */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xl }}>
        <Image
          source={require('../../assets/mayzax-logo.png')}
          style={styles.heroLogo}
          resizeMode="contain"
        />
        <Text style={styles.heroAppName}>Mayzax Companion</Text>
      </View>

      {/* Greeting + avatar */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Text style={styles.heroGreeting}>{greeting},</Text>
          <Text style={styles.heroName} numberOfLines={1}>{name}</Text>
          <View style={styles.heroBadgeRow}>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>{role}</Text>
            </View>
            {department ? (
              <View style={[styles.heroBadge, { backgroundColor: 'rgba(255,255,255,0.12)' }]}>
                <Text style={styles.heroBadgeText}>{department}</Text>
              </View>
            ) : null}
          </View>
        </View>
        <TouchableOpacity onPress={onAvatarPress} style={{ marginLeft: spacing.md }}>
          <View style={styles.heroAvatarWrap}>
            <Avatar name={avatarName} url={avatarUrl} size={54} />
          </View>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

// ─── Main HomeScreen ──────────────────────────────────────────────────────────
export function HomeScreen() {
  const dark = useResolvedTheme() === 'dark';
  const nav = useNavigation<Nav>();
  const online = useOnline();
  const { user: authUser } = useAuth();

  const isAdmin = authUser?.role === 'ADMIN';
  const isTeamLeader = authUser?.role === 'TEAM_LEADER';
  const isClient = authUser?.role === 'CLIENT';
  const clientProfile = authUser?.clientProfile;
  const [clientTab, setClientTab] = useState<'overview' | 'applications' | 'interviews' | 'payments'>('overview');

  const { data, isLoading, isError, error, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['attendance', 'today'],
    queryFn: fetchToday,
    enabled: !isAdmin && !isClient,
    refetchInterval: 30 * 1000,
    staleTime: 10 * 1000,
  });

  const { data: analytics, isLoading: analyticsLoading, isError: analyticsIsError, error: analyticsError, refetch: refetchAnalytics, dataUpdatedAt: analyticsUpdatedAt } = useQuery({
    queryKey: ['analytics', 'summary'],
    queryFn: fetchAnalyticsSummary,
    enabled: isAdmin || isTeamLeader,
    refetchInterval: 30 * 1000,
    staleTime: 10 * 1000,
  });

  const { data: clientStats, isLoading: clientStatsLoading, isError: clientStatsIsError, refetch: refetchClientStats } = useQuery({
    queryKey: ['client-stats'],
    queryFn: fetchClientStats,
    enabled: isClient,
  });

  const { data: clientAppsData, isLoading: clientAppsLoading, isError: clientAppsIsError, refetch: refetchClientApps } = useQuery({
    queryKey: ['client-apps'],
    queryFn: () => fetchClientApplications({ page: 1, pageSize: 15 }),
    enabled: isClient,
  });

  const { data: clientInterviews, isLoading: clientInterviewsLoading, isError: clientInterviewsIsError, refetch: refetchClientInterviews } = useQuery({
    queryKey: ['client-interviews', clientProfile?.id],
    queryFn: () => fetchClientInterviews(clientProfile!.id),
    enabled: isClient && !!clientProfile?.id,
  });

  const { data: clientPayments, isLoading: clientPaymentsLoading, isError: clientPaymentsIsError, refetch: refetchClientPayments } = useQuery({
    queryKey: ['client-payments', clientProfile?.id],
    queryFn: () => fetchClientPayments(clientProfile!.id),
    enabled: isClient && !!clientProfile?.id,
  });

  useFocusEffect(
    useCallback(() => {
      if (isClient) {
        refetchClientStats();
        refetchClientApps();
        if (clientProfile?.id) {
          refetchClientInterviews();
          refetchClientPayments();
        }
      } else if (isAdmin) {
        refetchAnalytics();
      } else if (isTeamLeader) {
        refetch();
        refetchAnalytics();
      } else {
        refetch();
      }
    }, [refetch, refetchAnalytics, refetchClientStats, refetchClientApps, refetchClientInterviews, refetchClientPayments, isAdmin, isTeamLeader, isClient, clientProfile?.id]),
  );

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

  const mainLoading = isClient
    ? (clientStatsLoading || clientAppsLoading || (!!clientProfile?.id && (clientInterviewsLoading || clientPaymentsLoading)))
    : isAdmin
      ? (analyticsLoading && !analytics)
      : isTeamLeader
        ? ((isLoading && !data) || (analyticsLoading && !analytics))
        : (isLoading && !data);

  if (mainLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: dark ? '#0B1220' : colors.background }}>
        <Skeleton height={200} style={{ borderRadius: 0 }} />
        <View style={{ padding: spacing.lg, gap: spacing.md }}>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Skeleton height={80} style={{ flex: 1 }} />
            <Skeleton height={80} style={{ flex: 1 }} />
          </View>
          <Skeleton height={200} />
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Skeleton height={70} style={{ flex: 1 }} />
            <Skeleton height={70} style={{ flex: 1 }} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const mainError = isClient
    ? (clientStatsIsError || clientAppsIsError || clientInterviewsIsError || clientPaymentsIsError)
    : isAdmin
      ? (analyticsIsError && !analytics)
      : isTeamLeader
        ? ((isError && !data) || (analyticsIsError && !analytics))
        : (isError && !data);

  if (mainError) {
    const errObj = isClient
      ? new Error('Failed to load candidate dashboard metrics')
      : isAdmin
        ? analyticsError
        : isTeamLeader
          ? (error ?? analyticsError)
          : error;
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: dark ? '#0B1220' : colors.background, justifyContent: 'center' }}>
        <ErrorState message={(errObj as any)?.message} onRetry={() => {
          if (isClient) {
            refetchClientStats();
            refetchClientApps();
            if (clientProfile?.id) {
              refetchClientInterviews();
              refetchClientPayments();
            }
          } else if (isAdmin) {
            refetchAnalytics();
          } else if (isTeamLeader) {
            refetch();
            refetchAnalytics();
          } else {
            refetch();
          }
        }} />
      </SafeAreaView>
    );
  }

  const user = isAdmin || isClient ? authUser! : (data?.user ?? authUser!);
  const today = data?.today;
  const shift = data?.shift;
  const timeline = data?.timeline ?? [];

  const shortBreaksTaken = timeline.filter(t => t.status === 'SHORT_BREAK').length;
  const dinnerBreaksTaken = timeline.filter(t => t.status === 'DINNER_BREAK').length;

  const roleLabel = isClient
    ? 'Candidate'
    : isAdmin
      ? 'Administrator'
      : isTeamLeader
        ? 'Team Leader'
        : authUser?.role === 'SALES_EXEC'
          ? 'Sales Executive'
          : authUser?.role === 'RESUME_ASSIST'
            ? 'Resume Assistant'
            : (user.designation ?? 'Recruiter');

  const onRefresh = () => {
    if (isClient) {
      refetchClientStats();
      refetchClientApps();
      if (clientProfile?.id) {
        refetchClientInterviews();
        refetchClientPayments();
      }
    } else if (isAdmin) {
      refetchAnalytics();
    } else if (isTeamLeader) {
      refetch();
      refetchAnalytics();
    } else {
      refetch();
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: dark ? '#0B1220' : colors.background }} edges={['top']}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} tintColor={colors.accent} />}
        contentContainerStyle={{ paddingBottom: spacing.xl * 2 }}
      >
        {/* ── Gradient Hero Banner ── */}
        <HeroBanner
          greeting={greeting}
          name={user.name}
          role={roleLabel}
          department={isClient ? null : user.department}
          avatarName={user.name}
          avatarUrl={(user as any).avatarUrl ?? null}
          dark={dark}
          onAvatarPress={() => nav.navigate('Tabs', { screen: 'ProfileTab' })}
        />

        <View style={{ padding: spacing.lg }}>
          {/* ─────────────── CLIENT VIEW ─────────────── */}
          {isClient ? (
            <>
              {/* Tab Selector */}
              <View style={{ flexDirection: 'row', backgroundColor: dark ? '#1e293b' : '#f1f5f9', borderRadius: 12, padding: 4, marginBottom: spacing.md }}>
                {(['overview', 'applications', 'interviews', 'payments'] as const).map((tab) => (
                  <TouchableOpacity
                    key={tab}
                    onPress={() => setClientTab(tab)}
                    style={{
                      flex: 1,
                      paddingVertical: 8,
                      alignItems: 'center',
                      borderRadius: 8,
                      backgroundColor: clientTab === tab ? (dark ? '#334155' : '#ffffff') : 'transparent',
                    }}
                  >
                    <Text style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: clientTab === tab ? colors.accent : (dark ? colors.textMutedDark : colors.textMuted),
                      textTransform: 'capitalize',
                    }}>
                      {tab}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* OVERVIEW TAB */}
              {clientTab === 'overview' && (
                <>
                  <SectionHead title="Overview" sub="Summary of your candidate profile" dark={dark} />
                  <View style={styles.tileRow}>
                    <DashTile icon="briefcase-outline" label="Total Apps" value={clientStats?.totalApps ?? 0} accent={colors.primary} dark={dark} />
                    <DashTile icon="shield-check-outline" label="Current Apps" value={clientStats?.appsToday ?? 0} accent={colors.success} dark={dark} />
                  </View>
                  <View style={styles.tileRow}>
                    <DashTile icon="calendar-clock" label="Interviews" value={clientStats?.statuses?.interviews ?? 0} accent={colors.warning} dark={dark} />
                    <DashTile icon="account-cog" label="Status" value={clientProfile?.isActive ? 'Active' : 'Inactive'} accent={colors.accent} dark={dark} />
                  </View>

                  {/* Profile info card */}
                  <Card style={{ marginTop: spacing.md, padding: spacing.md }}>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: dark ? colors.textDark : colors.text, marginBottom: spacing.sm }}>
                      Candidate Details
                    </Text>
                    <View style={{ gap: spacing.sm }}>
                      <DetailRow label="Technology" value={clientProfile?.technology ?? '—'} dark={dark} />
                      <DetailRow label="Location" value={clientProfile?.currentLocation ?? '—'} dark={dark} />
                      <DetailRow label="Visa Status" value={clientProfile?.visaStatus ?? '—'} dark={dark} />
                      <DetailRow label="Email" value={clientProfile?.email ?? authUser?.email ?? '—'} dark={dark} />
                      <DetailRow label="Phone" value={clientProfile?.phone ?? '—'} dark={dark} />
                    </View>
                  </Card>
                </>
              )}

              {/* APPLICATIONS TAB */}
              {clientTab === 'applications' && (
                <>
                  <SectionHead title="Job Applications" sub="List of your job submissions" dark={dark} />
                  {(!clientAppsData || clientAppsData.items?.length === 0) ? (
                    <EmptyState title="No job applications found." />
                  ) : (
                    <View style={{ gap: spacing.sm }}>
                      {clientAppsData.items.map((app: any) => (
                        <Card key={app.id} style={{ padding: spacing.md }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 15, fontWeight: '800', color: dark ? colors.textDark : colors.text }} numberOfLines={1}>
                                {app.companyName}
                              </Text>
                              <Text style={{ fontSize: 13, color: dark ? colors.textMutedDark : colors.textMuted, marginTop: 2 }}>
                                {app.jobTitle}
                              </Text>
                            </View>
                            <StatusBadge status={app.status} label={app.status.replace(/_/g, ' ')} />
                          </View>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm, paddingTop: spacing.xs, borderTopWidth: 1, borderTopColor: dark ? colors.borderDark : colors.border }}>
                            {/* <Text style={{ fontSize: 11, color: dark ? colors.textMutedDark : colors.textMuted }}>
                              {app.verified ? `✓ Verified (${app.verificationScore}%)` : 'Unverified'}
                            </Text> */}
                            <Text style={{ fontSize: 11, color: dark ? colors.textMutedDark : colors.textMuted }}>
                              {dayjs(app.appliedAt).format('MMM DD, YYYY')}
                            </Text>
                          </View>
                        </Card>
                      ))}
                    </View>
                  )}
                </>
              )}

              {/* INTERVIEWS TAB */}
              {clientTab === 'interviews' && (
                <>
                  <SectionHead title="Interviews" sub="Scheduled rounds and discussions" dark={dark} />
                  {(!clientInterviews || clientInterviews.length === 0) ? (
                    <EmptyState title="No scheduled interviews found." />
                  ) : (
                    <View style={{ gap: spacing.sm }}>
                      {clientInterviews.map((item: any) => (
                        <Card key={item.id} style={{ padding: spacing.md }}>
                          <Text style={{ fontSize: 15, fontWeight: '800', color: dark ? colors.textDark : colors.text }}>
                            {item.roundName || 'Interview'}
                          </Text>
                          <Text style={{ fontSize: 13, color: dark ? colors.textMutedDark : colors.textMuted, marginTop: 2 }}>
                            Status: {item.status || 'Scheduled'}
                          </Text>
                          <View style={{ gap: 4, marginTop: spacing.sm }}>
                            <DetailRow label="Date/Time" value={`${item.date} • ${item.startTime} - ${item.endTime} (${item.timezone})`} dark={dark} />
                            <DetailRow label="Interviewer" value={item.interviewer || '—'} dark={dark} />
                            <DetailRow label="Mode" value={item.mode || '-'} dark={dark} />
                          </View>
                          {item.meetingLink ? (
                            <TouchableOpacity
                              onPress={() => Linking.openURL(item.meetingLink)}
                              style={{
                                marginTop: spacing.md,
                                backgroundColor: colors.accent + '20',
                                paddingVertical: 8,
                                borderRadius: 8,
                                alignItems: 'center',
                              }}
                            >
                              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.accent }}>
                                Join Interview Meeting
                              </Text>
                            </TouchableOpacity>
                          ) : null}
                        </Card>
                      ))}
                    </View>
                  )}
                </>
              )}

              {/* PAYMENTS TAB */}
              {clientTab === 'payments' && (
                <>
                  <SectionHead title="Payments History" sub="Your invoices and transaction logs" dark={dark} />
                  {(!clientPayments || clientPayments.length === 0) ? (
                    <EmptyState title="No payment records found." />
                  ) : (
                    <View style={{ gap: spacing.sm }}>
                      {clientPayments.map((item: any) => (
                        <Card key={item.id} style={{ padding: spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <View>
                            <Text style={{ fontSize: 14, fontWeight: '800', color: dark ? colors.textDark : colors.text }}>
                              Ref: {item.paymentRef || 'N/A'}
                            </Text>
                            <Text style={{ fontSize: 12, color: dark ? colors.textMutedDark : colors.textMuted, marginTop: 2 }}>
                              {dayjs(item.paymentDate || item.createdAt).format('MMM DD, YYYY')}
                            </Text>
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={{ fontSize: 16, fontWeight: '800', color: colors.success }}>
                              ${item.amountPaid || item.amount || 0}
                            </Text>
                            <Text style={{ fontSize: 11, color: colors.success, fontWeight: '700', marginTop: 2 }}>
                              Paid
                            </Text>
                          </View>
                        </Card>
                      ))}
                    </View>
                  )}
                </>
              )}
            </>
          ) : isAdmin ? (
            <>
              {/* Live status row */}
              <SectionHead title="Live Status" sub="Who's clocked in right now" dark={dark} />
              <View style={styles.tileRow}>
                <DashTile icon="account-check" label="Active Now" value={analytics?.activeMemberCount ?? 0} accent={colors.success} dark={dark} />
                <DashTile icon="coffee" label="On Break" value={analytics?.onBreakMemberCount ?? 0} accent={colors.warning} dark={dark} />
              </View>
              <View style={styles.tileRow}>
                <DashTile icon="briefcase-upload" label="Today's Applications" value={analytics?.currentShiftApplications ?? 0} accent="#8b5cf6" dark={dark} />
                {/* <DashTile icon="account" label="Top Performer" value={formatTopPerformer(analytics?.topPerformer || '—')} accent={colors.accent} dark={dark} /> */}
              </View>

              {/* Organisation row */}
              <SectionHead title="Organisation" sub="All-time totals" dark={dark} />
              <View style={styles.tileRow}>
                <DashTile icon="account-group" label="Total Users" value={analytics?.totalRecruiters ?? 0} accent={colors.primary} dark={dark} />
                <DashTile icon="account-check-outline" label="Recruiters" value={analytics?.activeRecruiters ?? 0} accent={colors.success} dark={dark} />
              </View>
              <View style={styles.tileRow}>
                <DashTile icon="card-account-details" label="Clients" value={analytics?.totalProfiles ?? 0} accent={colors.warning} dark={dark} />
                <DashTile icon="briefcase-check" label="Total Applications" value={analytics?.totalApplications ?? 0} accent={colors.primaryLight} dark={dark} />
              </View>

              {/* Quick actions */}
              <SectionHead title="Quick Actions" dark={dark} />
              <View style={{ gap: spacing.sm }}>
                <QuickLink label="View Analytics Hub" icon="chart-areaspline" onPress={() => nav.navigate('Tabs', { screen: 'ActivityTab' })} dark={dark} accent="#8b5cf6" />
                <QuickLink label="Notifications" icon="bell-outline" onPress={() => nav.navigate('Tabs', { screen: 'NotificationsTab' })} dark={dark} accent={colors.primary} />
                <QuickLink label="Settings" icon="cog-outline" onPress={() => nav.navigate('Settings')} dark={dark} accent={colors.accent} />
              </View>
            </>
          ) : (
            <>
              {/* ─────────────── RECRUITER / TL VIEW ─────────────── */}

              {/* Status card */}
              <Card style={{ marginTop: spacing.sm }}>
                <View style={styles.statusHeader}>
                  <StatusBadge status={today!.currentStatus} label={today!.currentStatusLabel} />
                  <Text style={[styles.shiftWindow, { color: dark ? colors.textMutedDark : colors.textMuted }]}>
                    <MaterialCommunityIcons name="clock-outline" size={12} /> {shift!.windowText}
                  </Text>
                </View>
                <View style={styles.statusBody}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.bigTime, { color: dark ? colors.textDark : colors.text }]}>
                      {today!.firstLoginAt ? formatTime(today!.firstLoginAt) : '-- : --'}
                    </Text>
                    <Text style={[styles.subMeta, { color: dark ? colors.textMutedDark : colors.textMuted }]}>
                      {today!.isLoggedIn ? 'Logged in since' : 'Not logged in yet'}
                    </Text>
                  </View>
                </View>
              </Card>

              {/* Work progress ring */}
              <Card style={{ marginTop: spacing.lg, alignItems: 'center', paddingVertical: spacing.xl }}>
                <CircularProgress
                  value={workProgress}
                  label={formatDurationDigital(today!.productiveSeconds)}
                  sublabel={`of ${formatDuration(shift!.expectedWorkSeconds)} worked`}
                  size={180}
                  color={workProgress >= 1 ? colors.success : colors.accent}
                  trackColor={dark ? '#334155' : '#E2E8F0'}
                />
                <View style={[styles.tileRow, { marginTop: spacing.lg, width: '100%' }]}>
                  <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={[styles.metricValue, { color: colors.success }]}>
                      {formatDurationDigital(today!.productiveSeconds)}
                    </Text>
                    <Text style={[styles.metricLabel, { color: dark ? colors.textMutedDark : colors.textMuted }]}>Productive</Text>
                  </View>
                  <View style={styles.divider} />
                  <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={[styles.metricValue, { color: colors.warning }]}>
                      {formatDurationDigital(today!.breakSeconds)}
                    </Text>
                    <Text style={[styles.metricLabel, { color: dark ? colors.textMutedDark : colors.textMuted }]}>On break</Text>
                  </View>
                </View>
              </Card>

              {/* Active break card */}
              {today!.currentBreak ? (
                <Card style={{ marginTop: spacing.lg, borderLeftWidth: 4, borderLeftColor: getStatusColor(today!.currentStatus) }}>
                  <View style={styles.tileRow}>
                    <MaterialCommunityIcons name="coffee-outline" size={22} color={colors.warning} style={{ marginRight: 8 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.breakTitle, { color: dark ? colors.textDark : colors.text }]}>
                        {today!.currentBreak.label}
                      </Text>
                      <Text style={[styles.breakMeta, { color: dark ? colors.textMutedDark : colors.textMuted }]}>
                        Started {formatTime(today!.currentBreak.startedAt)} · Allowed {formatDuration(today!.currentBreak.allowedSec)}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.breakRemaining, { color: breakCountdown.isOver ? colors.error : dark ? colors.textDark : colors.text }]}>
                        {breakCountdown.isOver ? `+${formatDurationDigital(breakCountdown.remainingSec)}` : formatDurationDigital(breakCountdown.remainingSec)}
                      </Text>
                      <Text style={[styles.breakMeta, { color: breakCountdown.isOver ? colors.error : colors.textMuted }]}>
                        {breakCountdown.isOver ? 'Over' : 'remaining'}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.progressBar, { backgroundColor: dark ? '#1f2937' : '#E2E8F0', marginTop: spacing.md }]}>
                    <View style={{
                      height: '100%',
                      width: `${Math.min(100, Math.max(0, (today!.currentBreak.usedSec / Math.max(1, today!.currentBreak.allowedSec)) * 100))}%`,
                      backgroundColor: breakCountdown.isOver ? colors.error : colors.accent,
                      borderRadius: 4,
                    }} />
                  </View>
                </Card>
              ) : null}

              {/* Break allowance tiles */}
              <SectionHead title="Break Allowances" sub="Remaining for today" dark={dark} />
              <View style={styles.tileRow}>
                <DashTile icon="coffee" label="Short Breaks Left" value={`${Math.max(0, 2 - shortBreaksTaken)} / 2`} accent={colors.statusShortBreak} dark={dark} />
                <DashTile icon="silverware-fork-knife" label="Dinner Left" value={`${Math.max(0, 1 - dinnerBreaksTaken)} / 1`} accent={colors.statusDinnerBreak} dark={dark} />
              </View>

              {/* Team Leader extra section */}
              {isTeamLeader ? (
                <>
                  <SectionHead title="Team Overview" sub="Your team's current performance" dark={dark} />
                  <View style={styles.tileRow}>
                    <DashTile icon="account-group" label="Team Recruiters" value={analytics?.totalRecruiters ?? 0} accent={colors.primary} dark={dark} />
                    <DashTile icon="account-check" label="Active Now" value={analytics?.activeMemberCount ?? 0} accent={colors.success} dark={dark} />
                  </View>
                  <View style={styles.tileRow}>
                    <DashTile icon="briefcase-check" label="Team Applications" value={analytics?.totalApplications ?? 0} accent={colors.primaryLight} dark={dark} />
                    <DashTile icon="chart-line" label="Today's Team" value={analytics?.currentShiftApplications ?? 0} accent="#8b5cf6" dark={dark} />
                  </View>
                  <View style={styles.tileRow}>
                    <DashTile icon="coffee" label="On Break" value={analytics?.onBreakMemberCount ?? 0} accent={colors.warning} dark={dark} />
                    <DashTile icon="trophy" label="Top Performer" value={formatTopPerformer(analytics?.topPerformer || '—')} accent={colors.accent} dark={dark} />
                  </View>
                </>
              ) : null}

              {/* Quick links */}
              <SectionHead title="Quick Actions" dark={dark} />
              <View style={{ gap: spacing.sm }}>
                <QuickLink label="View today's activity timeline" icon="timeline-clock" onPress={() => nav.navigate('Tabs', { screen: 'ActivityTab' })} dark={dark} accent={colors.primary} />
                <QuickLink label="Settings" icon="cog-outline" onPress={() => nav.navigate('Settings')} dark={dark} accent={colors.accent} />
              </View>
            </>
          )}

          {/* Footer */}
          <View style={{ marginTop: spacing.xl, alignItems: 'center', gap: 4 }}>
            {!online ? (
              <Text style={[styles.cacheHint, { color: colors.warning }]}>⚠️ You're offline — showing cached data</Text>
            ) : null}
            {/* <Text style={[styles.cacheHint, { color: dark ? colors.textMutedDark : colors.textMuted }]}>
              Last updated {dayjs(isAdmin || isTeamLeader ? analyticsUpdatedAt : dataUpdatedAt).fromNow()}
            </Text> */}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function QuickLink({ label, icon, onPress, dark, accent }: {
  label: string; icon: string; onPress: () => void; dark: boolean; accent?: string;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75}>
      <Card padded style={styles.quickLink}>
        <View style={[styles.quickLinkIcon, { backgroundColor: (accent ?? colors.accent) + '18' }]}>
          <MaterialCommunityIcons name={icon as any} size={20} color={accent ?? colors.accent} />
        </View>
        <Text style={[styles.quickLinkText, { color: dark ? colors.textDark : colors.text }]}>{label}</Text>
        <Ionicons name="chevron-forward" size={16} color={dark ? colors.textMutedDark : colors.textMuted} />
      </Card>
    </TouchableOpacity>
  );
}

function DetailRow({ label, value, dark }: { label: string; value: string; dark: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
      <Text style={{ fontSize: 13, color: dark ? colors.textMutedDark : colors.textMuted, fontWeight: '600' }}>
        {label}
      </Text>
      <Text style={{ fontSize: 13, color: dark ? colors.textDark : colors.text, fontWeight: '700', textAlign: 'right', flex: 1, marginLeft: 20 }}>
        {value}
      </Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
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
  heroAvatarWrap: {
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)', borderRadius: 32,
    padding: 2,
  },

  // Tiles
  tileRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  dashTile: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: 14,
  },
  dashTileValue: { fontSize: 22, fontWeight: '900' },
  dashTileLabel: {
    fontSize: 10, fontWeight: '700', textTransform: 'uppercase',
    letterSpacing: 0.5, marginTop: 4,
  },

  // Section headers
  sectionTitle: { fontSize: 16, fontWeight: '800' as const },
  sectionSub: { ...typography.small, marginTop: 2 },

  // Status / attendance
  statusHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  shiftWindow: { ...typography.small },
  statusBody: { flexDirection: 'row', marginTop: spacing.md },
  bigTime: { fontSize: 22, fontWeight: '700' },
  subMeta: { ...typography.small, marginTop: 2 },
  divider: { width: StyleSheet.hairlineWidth, height: 28, backgroundColor: '#E2E8F0' },
  metricValue: { fontSize: 20, fontWeight: '700' },
  metricLabel: { ...typography.small, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  breakTitle: { ...typography.h3, fontSize: 15 },
  breakMeta: { ...typography.small, marginTop: 2 },
  breakRemaining: { fontSize: 22, fontWeight: '800' },
  progressBar: { height: 8, borderRadius: 4, overflow: 'hidden' },

  // Quick links
  quickLink: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: spacing.md, paddingHorizontal: spacing.md, gap: spacing.md,
  },
  quickLinkIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  quickLinkText: { ...typography.body, flex: 1, fontWeight: '600' },
  cacheHint: { ...typography.small },
});
