import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Skeleton } from '@/components/Skeleton';
import { useResolvedTheme } from '@/hooks/useThemeMode';
import { colors, spacing, typography } from '@/theme';
import { fetchNotifications, markAllRead, markNotificationRead } from '@/services/notifications';
import type { NotificationItem } from '@/types/api';
import dayjs from 'dayjs';
import calendar from 'dayjs/plugin/calendar';
import relativeTime from 'dayjs/plugin/relativeTime';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '@/hooks/useAuth';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/RootNavigator';

dayjs.extend(calendar);
dayjs.extend(relativeTime);

type Nav = NativeStackNavigationProp<RootStackParamList>;

const PAGE_SIZE = 20;

const TYPE_CONFIG: Record<string, { icon: string; color: string; bg: string }> = {
  BREAK_5MIN:           { icon: 'timer-sand', color: '#F59E0B', bg: '#FEF3C7' },
  BREAK_2MIN:           { icon: 'timer-sand', color: '#EF4444', bg: '#FEE2E2' },
  BREAK_EXPIRED:        { icon: 'alert-circle', color: '#EF4444', bg: '#FEE2E2' },
  SHIFT_ENDING_15MIN:   { icon: 'clock-alert', color: '#3B82F6', bg: '#DBEAFE' },
  SHIFT_ENDING_5MIN:    { icon: 'clock-alert', color: '#EF4444', bg: '#FEE2E2' },
  SHIFT_START_REMINDER: { icon: 'alarm', color: colors.primary, bg: '#DBEAFE' },
  ATTENDANCE_REMINDER:  { icon: 'calendar-clock', color: '#8B5CF6', bg: '#EDE9FE' },
  COMPANY_NOTICE:       { icon: 'bullhorn-variant', color: colors.accent, bg: '#D1FAE5' },
  PENALTY_NOTICE:       { icon: 'alert-octagon', color: '#EF4444', bg: '#FEE2E2' },
  SYSTEM:               { icon: 'bell-ring', color: colors.primary, bg: '#E0E7FF' },
  INTERVIEW_POSTED:     { icon: 'calendar-check', color: '#8B5CF6', bg: '#EDE9FE' },
  PAYMENT_POSTED:       { icon: 'credit-card-outline', color: '#10B981', bg: '#D1FAE5' },
};

function NotificationsHeader({ unreadCount, onMarkAllRead, markAllDisabled, dark }: {
  unreadCount: number;
  onMarkAllRead: () => void;
  markAllDisabled: boolean;
  dark: boolean;
}) {
  return (
    <LinearGradient
      colors={['#2A5DA8', '#347F80', '#3F9C71']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.heroBanner}
    >
      <View style={styles.heroGlowTL} />
      <View style={styles.heroGlowBR} />
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Text style={styles.heroGreeting}>ALERTS & REMINDERS</Text>
          <Text style={styles.heroName} numberOfLines={1}>Notifications</Text>
          <View style={styles.heroBadgeRow}>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>
                {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
              </Text>
            </View>
          </View>
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity
            onPress={onMarkAllRead}
            disabled={markAllDisabled}
            style={[styles.heroBadge, { backgroundColor: 'rgba(255,255,255,0.22)', borderColor: 'rgba(255,255,255,0.4)', paddingVertical: 6, paddingHorizontal: 12 }]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <MaterialCommunityIcons name="check-all" size={14} color="#fff" />
              <Text style={[styles.heroBadgeText, { color: '#fff' }]}>Mark all read</Text>
            </View>
          </TouchableOpacity>
        )}
      </View>
    </LinearGradient>
  );
}

function getTypeConfig(type: string) {
  return TYPE_CONFIG[type] ?? { icon: 'bell-ring', color: colors.primary, bg: '#E0E7FF' };
}

function mapTab(screen: string): 'HomeTab' | 'ActivityTab' | 'NotificationsTab' | 'ProfileTab' {
  switch (screen) {
    case 'Today': return 'ActivityTab';
    case 'Notifications': return 'NotificationsTab';
    case 'Profile': return 'ProfileTab';
    default: return 'HomeTab';
  }
}

export function NotificationsScreen() {
  const dark = useResolvedTheme() === 'dark';
  const nav = useNavigation<Nav>();
  const qc = useQueryClient();
  const { user: authUser } = useAuth();
  const isClient = authUser?.role === 'CLIENT';
  const [refreshing, setRefreshing] = useState(false);

  const { data, fetchNextPage, hasNextPage, isLoading, refetch, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['notifications'],
    queryFn: async ({ pageParam = 1 }) => fetchNotifications(pageParam, PAGE_SIZE),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage?.pagination && lastPage.pagination.page < lastPage.pagination.totalPages) {
        return lastPage.pagination.page + 1;
      }
      return undefined;
    },
  });

  const items = data?.pages.flatMap((p) => p.items) ?? [];
  const unread = data?.pages[0]?.unreadCount ?? 0;

  const readOne = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['notifications'] });
      qc.setQueriesData({ queryKey: ['notifications'] }, (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            items: page.items.map((n: NotificationItem) =>
              n.id === id ? { ...n, readAt: new Date().toISOString() } : n,
            ),
            unreadCount: Math.max(0, (page.unreadCount ?? 0) - 1),
          })),
        };
      });
    },
  });

  const readAll = useMutation({
    mutationFn: () => markAllRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  useFocusEffect(
    useCallback(() => { refetch(); }, [refetch]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const tap = (n: NotificationItem) => {
    if (!n.readAt) readOne.mutate(n.id);
    const d = n.data ?? {};
    if (d.screen && nav) {
      if (d.screen === 'AttendanceDetail' && d.date) {
        nav.navigate('AttendanceDetail', { date: d.date });
      } else if (['Home', 'Today', 'Notifications', 'Profile'].includes(d.screen)) {
        nav.navigate('Tabs', { screen: mapTab(d.screen) });
      }
    }
  };

  if (isLoading && items.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: dark ? '#0B1220' : colors.background }} edges={['top']}>
        <Skeleton height={190} style={{ borderRadius: 0 }} />
        <View style={{ flex: 1, padding: spacing.lg }}>
          <Skeleton height={80} style={{ marginBottom: spacing.sm }} />
          <Skeleton height={80} style={{ marginBottom: spacing.sm }} />
          <Skeleton height={80} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: dark ? '#0B1220' : colors.background }} edges={['top']}>
      <NotificationsHeader
        unreadCount={unread}
        onMarkAllRead={() => readAll.mutate()}
        markAllDisabled={readAll.isPending}
        dark={dark}
      />
      <View style={{ flex: 1, paddingHorizontal: spacing.lg }}>
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ paddingVertical: spacing.sm, paddingBottom: spacing.xxl }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          ListEmptyComponent={
            isClient ? (
              <EmptyState
                title="No new updates"
                icon="🔔"
              />
            ) : (
              <EmptyState
                title="You're all caught up!"
                description="No notifications yet. We'll alert you about reminders and company news."
                icon="🔔"
              />
            )
          }
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) fetchNextPage();
          }}
          onEndReachedThreshold={0.5}
          renderItem={({ item }) => {
            const cfg = getTypeConfig(item.type);
            const isUnread = !item.readAt;
            return (
              <TouchableOpacity activeOpacity={0.75} onPress={() => tap(item)}>
                <Card
                  padded
                  style={[
                    styles.item,
                    {
                      backgroundColor: isUnread
                        ? (dark ? '#1E293B' : '#F0F7FF')
                        : (dark ? colors.cardDark : colors.surface),
                      borderLeftWidth: 3,
                      borderLeftColor: isUnread ? cfg.color : 'transparent',
                    },
                  ]}
                >
                  {/* Icon circle */}
                  <View style={[styles.iconCircle, { backgroundColor: cfg.bg }]}>
                    <MaterialCommunityIcons name={cfg.icon as any} size={20} color={cfg.color} />
                  </View>

                  {/* Content */}
                  <View style={{ flex: 1 }}>
                    <View style={styles.titleRow}>
                      <Text
                        style={[
                          styles.itemTitle,
                          { color: dark ? colors.textDark : colors.text },
                          isUnread && { fontWeight: '800' },
                        ]}
                        numberOfLines={1}
                      >
                        {item.title}
                      </Text>
                      {isUnread && (
                        <View style={[styles.unreadDot, { backgroundColor: cfg.color }]} />
                      )}
                    </View>
                    <Text
                      style={[styles.itemBody, { color: dark ? colors.textMutedDark : colors.textMuted }]}
                      numberOfLines={2}
                    >
                      {item.body}
                    </Text>
                    <Text style={[styles.time, { color: dark ? colors.textMutedDark : colors.textMuted }]}>
                      {dayjs(item.createdAt).fromNow()}
                    </Text>
                  </View>
                </Card>
              </TouchableOpacity>
            );
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  heroBanner: { padding: spacing.lg, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, overflow: 'hidden' },
  heroGlowTL: { position: 'absolute', top: -50, left: -50, width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255,255,255,0.1)' },
  heroGlowBR: { position: 'absolute', bottom: -50, right: -50, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.05)' },
  heroGreeting: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  heroName: { color: '#fff', fontSize: 24, fontWeight: '800', marginTop: 4 },
  heroBadgeRow: { flexDirection: 'row', marginTop: 12 },
  heroBadge: { backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: 12, paddingVertical: 4, paddingHorizontal: 10 },
  heroBadgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  title: { ...typography.h2, fontWeight: '800' },
  subtitle: { ...typography.small, marginTop: 2 },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(19,168,158,0.10)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  markAllText: { color: colors.accent, fontWeight: '700', fontSize: 12 },
  item: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  itemTitle: { ...typography.body, fontSize: 14, flex: 1 },
  itemBody: { ...typography.small, marginTop: 3, lineHeight: 18 },
  time: { ...typography.tiny, marginTop: 5, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, marginLeft: spacing.sm },
});
