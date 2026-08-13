import React, { useCallback, useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Dimensions,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { StatusBadge } from '@/components/StatusBadge';
import { Skeleton } from '@/components/Skeleton';
import { ErrorState } from '@/components/ErrorState';
import { EmptyState } from '@/components/EmptyState';
import { Avatar } from '@/components/Avatar';
import { colors, spacing, typography, radius } from '@/theme';
import { useResolvedTheme } from '@/hooks/useThemeMode';
import { fetchLiveStatus } from '@/services/attendance';
import { formatDurationDigital } from '@/utils/format';
import type { LiveStatusItemDto } from '@/types/api';

const { width: W } = Dimensions.get('window');

function RoleBadge({ role }: { role: string }) {
  const isTL = role === 'TEAM_LEADER';
  const isRE = role === 'RECRUITER';
  const isSE = role === 'SALES_EXEC';
  const isRA = role === 'RESUME_ASSIST';
  
  let label = role.replace('_', ' ');
  let bgColor = 'rgba(100, 116, 139, 0.1)';
  let textColor = colors.textMuted;
  
  if (isTL) {
    bgColor = 'rgba(139, 92, 246, 0.1)';
    textColor = '#8b5cf6';
  } else if (isRE) {
    bgColor = 'rgba(59, 130, 246, 0.1)';
    textColor = '#3b82f6';
  } else if (isSE) {
    bgColor = 'rgba(236, 72, 153, 0.1)';
    textColor = '#ec4899';
  } else if (isRA) {
    bgColor = 'rgba(16, 185, 129, 0.1)';
    textColor = '#10b981';
  }

  return (
    <View style={[styles.roleBadge, { backgroundColor: bgColor }]}>
      <Text style={[styles.roleBadgeText, { color: textColor }]}>{label}</Text>
    </View>
  );
}

// Simple live duration ticker cell
function DurationTicker({ startedAt, status }: { startedAt: string; status: string }) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (status === 'OFFLINE') {
      setSeconds(0);
      return;
    }

    const calculate = () => {
      const start = new Date(startedAt).getTime();
      const diff = Math.max(0, Math.floor((Date.now() - start) / 1000));
      setSeconds(diff);
    };

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [startedAt, status]);

  if (status === 'OFFLINE') return null;

  return (
    <View style={styles.tickerContainer}>
      <MaterialCommunityIcons name="clock-outline" size={12} color={colors.accent} style={{ marginRight: 3 }} />
      <Text style={styles.tickerText}>{formatDurationDigital(seconds)}</Text>
    </View>
  );
}

export function MonitoringScreen() {
  const dark = useResolvedTheme() === 'dark';
  const textColor = dark ? colors.textDark : colors.text;
  const textMutedColor = dark ? colors.textMutedDark : colors.textMuted;
  const surfaceColor = dark ? colors.surfaceDark : colors.surface;
  const borderColor = dark ? colors.borderDark : colors.border;

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['live-status-monitoring'],
    queryFn: fetchLiveStatus,
    refetchInterval: 15000,
  });

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const stats = useMemo(() => {
    if (!data) return { active: 0, break: 0, issue: 0, offline: 0 };
    return {
      active: data.totalActiveCount,
      break: data.totalBreakCount,
      issue: data.totalIssueCount,
      offline: data.totalOfflineCount,
    };
  }, [data]);

  const filteredMembers = useMemo(() => {
    if (!data?.members) return [];
    return data.members.filter((m) => {
      const matchesSearch =
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.email.toLowerCase().includes(search.toLowerCase()) ||
        m.role.toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && m.status === 'ACTIVE') ||
        (statusFilter === 'BREAK' && m.status !== 'ACTIVE' && m.status !== 'OFFLINE' && m.status !== 'SYSTEM_ISSUE') ||
        (statusFilter === 'ISSUE' && m.status === 'SYSTEM_ISSUE') ||
        (statusFilter === 'OFFLINE' && m.status === 'OFFLINE');

      const matchesRole =
        roleFilter === 'ALL' || m.role === roleFilter;

      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [data, search, statusFilter, roleFilter]);

  if (isLoading) {
    return (
      <Screen scroll={false} contentContainerStyle={{ padding: 0 }}>
        <View style={styles.searchContainer}>
          <Skeleton style={styles.searchSkeleton} />
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.lg }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i} style={styles.memberCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Skeleton style={{ width: 44, height: 44, borderRadius: 22 }} />
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <Skeleton style={{ width: 120, height: 16, marginBottom: 6 }} />
                  <Skeleton style={{ width: 160, height: 12 }} />
                </View>
              </View>
            </Card>
          ))}
        </ScrollView>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen scroll={false} contentContainerStyle={{ padding: 0 }}>
        <ErrorState message={error instanceof Error ? error.message : 'Failed to load monitoring data'} onRetry={refetch} />
      </Screen>
    );
  }

  return (
    <Screen scroll={false} contentContainerStyle={{ padding: 0 }}>
      <LinearGradient
        colors={['#1a365d', '#1e40af', '#1e3a8a']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroBanner}
      >
        <View style={styles.heroGlowTL} />
        <View style={styles.heroGlowBR} />
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <View>
            <Text style={styles.heroGreeting}>Real-Time Roster</Text>
            <Text style={styles.heroName}>Monitoring Board</Text>
          </View>
          <View style={styles.pulseContainer}>
            <View style={styles.pulseDot} />
            <Text style={styles.pulseText}>Live</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Grid Stats Overview */}
      <View style={styles.statsOverview}>
        {[
          { key: 'ALL', label: 'Total', count: (data?.members?.length ?? 0), color: '#3b82f6', icon: 'account-multiple' },
          { key: 'ACTIVE', label: 'Active', count: stats.active, color: colors.statusActive, icon: 'check-circle' },
          { key: 'BREAK', label: 'Break', count: stats.break, color: colors.statusShortBreak, icon: 'coffee' },
          { key: 'OFFLINE', label: 'Offline', count: stats.offline, color: colors.statusOffline, icon: 'power-off' },
        ].map((item) => (
          <TouchableOpacity
            key={item.key}
            onPress={() => setStatusFilter(item.key)}
            style={[
              styles.statCard,
              { backgroundColor: surfaceColor, borderColor: borderColor },
              statusFilter === item.key && { borderColor: item.color, borderBottomWidth: 3 },
            ]}
          >
            <View style={styles.statCardHeader}>
              <MaterialCommunityIcons name={item.icon as any} size={16} color={item.color} />
              <Text style={[styles.statCardLabel, { color: item.color }]}>{item.label}</Text>
            </View>
            <Text style={[styles.statCardCount, { color: textColor }]}>{item.count}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Search Input */}
      <View style={styles.searchWrapper}>
        <View style={[styles.searchInputContainer, { backgroundColor: surfaceColor, borderColor: borderColor }]}>
          <MaterialCommunityIcons name="magnify" size={20} color={textMutedColor} style={{ marginLeft: spacing.sm }} />
          <TextInput
            placeholder="Search member, email, role..."
            placeholderTextColor={textMutedColor}
            style={[styles.searchInput, { color: textColor }]}
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <MaterialCommunityIcons name="close-circle" size={18} color={textMutedColor} style={{ marginRight: spacing.sm }} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Role Filter Pills */}
      <View style={styles.roleFilterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.roleFilterScroll}>
          {[
            { key: 'ALL', label: 'All Roles' },
            { key: 'RECRUITER', label: 'Recruiter' },
            { key: 'TEAM_LEADER', label: 'Team Leader' },
            { key: 'SALES_EXEC', label: 'Sales Exec' },
            { key: 'RESUME_ASSIST', label: 'Resume Assist' },
          ].map((r) => {
            const isSelected = roleFilter === r.key;
            const pillBgColor = isSelected
              ? colors.primary
              : (dark ? colors.surfaceDark : '#f1f5f9');
            const pillBorderColor = isSelected ? colors.primary : borderColor;
            const pillTextColor = isSelected ? '#fff' : (dark ? colors.textDark : colors.text);

            return (
              <TouchableOpacity
                key={r.key}
                onPress={() => setRoleFilter(r.key)}
                style={[
                  styles.roleFilterPill,
                  { backgroundColor: pillBgColor, borderColor: pillBorderColor },
                ]}
              >
                <Text style={[styles.roleFilterPillText, { color: pillTextColor }]}>
                  {r.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={onRefresh} colors={[colors.primary]} />}
      >
        {filteredMembers.length === 0 ? (
          <EmptyState
            title="No Users Found"
            description={search ? "Try adjusting your search criteria" : "No users are currently logged in with this status."}
          />
        ) : (
          filteredMembers.map((member) => (
            <Card key={member.userId} style={styles.memberCard}>
              <View style={styles.cardHeader}>
                <View style={styles.userInfo}>
                  <Avatar name={member.name} url={null} size={42} />
                  <View style={styles.userMeta}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={[styles.userName, { color: textColor }]}>{member.name}</Text>
                      {member.isOnline ? (
                        <View style={styles.onlineIndicator} />
                      ) : (
                        <View style={[styles.onlineIndicator, { backgroundColor: colors.statusOffline }]} />
                      )}
                    </View>
                    <Text style={[styles.userEmail, { color: textMutedColor }]} numberOfLines={1}>
                      {member.email}
                    </Text>
                  </View>
                </View>
                <RoleBadge role={member.role} />
              </View>

              <View style={[styles.cardDivider, { backgroundColor: borderColor }]} />

              <View style={styles.cardFooter}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <StatusBadge status={member.status} />
                  <DurationTicker startedAt={member.startedAt} status={member.status} />
                </View>
                {member.optionalNote && (
                  <Text style={[styles.noteText, { color: textMutedColor }]} numberOfLines={1}>
                    {member.optionalNote}
                  </Text>
                )}
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heroBanner: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    overflow: 'hidden',
  },
  heroGlowTL: {
    position: 'absolute',
    top: -50,
    left: -50,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  heroGlowBR: {
    position: 'absolute',
    bottom: -30,
    right: -30,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  heroGreeting: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  heroName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    marginTop: 2,
    letterSpacing: -0.5,
  },
  pulseContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.18)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
    marginRight: 4,
  },
  pulseText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10b981',
    textTransform: 'uppercase',
  },
  statsOverview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginTop: -spacing.md,
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.8)',
  },
  statCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  statCardLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  statCardCount: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    marginTop: 2,
  },
  searchWrapper: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    paddingHorizontal: spacing.sm,
    height: '100%',
  },
  searchSkeleton: {
    height: 44,
    borderRadius: radius.md,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  listContainer: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
  },
  memberCard: {
    marginBottom: spacing.md,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  userMeta: {
    marginLeft: spacing.md,
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  onlineIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.statusActive,
  },
  userEmail: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  roleBadge: {
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  roleBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  cardDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(63, 156, 113, 0.08)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tickerText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent,
    fontVariant: ['tabular-nums'],
  },
  noteText: {
    fontSize: 11,
    color: colors.textMuted,
    fontStyle: 'italic',
    maxWidth: '45%',
  },
  roleFilterContainer: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  roleFilterScroll: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  roleFilterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleFilterPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
