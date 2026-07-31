import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Skeleton } from '@/components/Skeleton';
import { useResolvedTheme } from '@/hooks/useThemeMode';
import { colors, radius, spacing, typography } from '@/theme';
import { fetchNotifications, markAllRead, markNotificationRead } from '@/services/notifications';
import type { NotificationItem } from '@/types/api';
import dayjs from 'dayjs';
import calendar from 'dayjs/plugin/calendar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/RootNavigator';

dayjs.extend(calendar);

type Nav = NativeStackNavigationProp<RootStackParamList>;

const PAGE_SIZE = 20;

export function NotificationsScreen() {
  const dark = useResolvedTheme() === 'dark';
  const nav = useNavigation<Nav>();
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data, fetchNextPage, hasNextPage, isLoading, isError, refetch, isFetchingNextPage } = useInfiniteQuery({
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
            items: page.items.map((n: NotificationItem) => n.id === id ? { ...n, readAt: new Date().toISOString() } : n),
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
    const data = n.data ?? {};
    if (data.screen && nav) {
      if (data.screen === 'AttendanceDetail' && data.date) {
        nav.navigate('AttendanceDetail', { date: data.date });
      } else if (['Home', 'Today', 'History', 'Notifications', 'Profile'].includes(data.screen)) {
        nav.navigate('Tabs', { screen: mapTab(data.screen) });
      }
    }
  };

  function mapTab(screen: string) {
    switch (screen) {
      case 'Today': return 'ActivityTab';
      case 'History': return 'HistoryTab';
      case 'Notifications': return 'NotificationsTab';
      case 'Profile': return 'ProfileTab';
      default: return 'HomeTab';
    }
  }

  const iconFor = (type: string) => {
    switch (type) {
      case 'BREAK_5MIN':
      case 'BREAK_2MIN': return { name: 'timer-sand', color: colors.warning };
      case 'BREAK_EXPIRED': return { name: 'alert-circle', color: colors.error };
      case 'SHIFT_ENDING_15MIN':
      case 'SHIFT_ENDING_5MIN': return { name: 'clock-alert', color: colors.info };
      case 'COMPANY_NOTICE': return { name: 'bullhorn-variant', color: colors.accent };
      case 'PENALTY_NOTICE': return { name: 'alert-octagon', color: colors.error };
      default: return { name: 'bell-ring', color: colors.primary };
    }
  };

  if (isLoading && items.length === 0) {
    return (
      <Screen>
        <Skeleton height={24} width="50%" style={{ marginBottom: spacing.md }} />
        <Skeleton height={80} style={{ marginBottom: spacing.sm }} />
        <Skeleton height={80} style={{ marginBottom: spacing.sm }} />
        <Skeleton height={80} />
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: dark ? colors.textDark : colors.text }]}>Notifications</Text>
        {unread > 0 ? (
          <TouchableOpacity onPress={() => readAll.mutate()} disabled={readAll.isPending}>
            <Text style={styles.markAll}>Mark all read</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ paddingVertical: spacing.sm, paddingBottom: spacing.xxl }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        ListEmptyComponent={<EmptyState title="You're all caught up" description="No notifications yet. We'll alert you about breaks, reminders, and company news." icon="🔔" />}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
        renderItem={({ item }) => {
          const { name, color } = iconFor(item.type);
          return (
            <TouchableOpacity activeOpacity={0.7} onPress={() => tap(item)}>
              <Card padded style={[styles.item, { backgroundColor: item.readAt ? (dark ? colors.cardDark : colors.surface) : (dark ? '#172554' : '#EEF3FB') }]}>
                <View style={styles.iconCircle}>
                  <MaterialCommunityIcons name={name as any} size={20} color={color} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.titleRow}>
                    <Text
                      style={[
                        styles.itemTitle,
                        { color: dark ? colors.textDark : colors.text },
                        !item.readAt && { fontWeight: '800' },
                      ]}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>
                    {!item.readAt ? <View style={[styles.unreadDot]} /> : null}
                  </View>
                  <Text style={[styles.itemBody, { color: dark ? colors.textMutedDark : colors.textMuted }]} numberOfLines={2}>
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  title: { ...typography.h2 },
  markAll: { color: colors.accent, fontWeight: '700' },
  item: { flexDirection: 'row', alignItems: 'flex-start' },
  iconCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(19,168,158,0.12)',
    alignItems: 'center', justifyContent: 'center',
    marginRight: spacing.md,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  itemTitle: { ...typography.body, fontSize: 15, flex: 1 },
  itemBody: { ...typography.small, marginTop: 2 },
  time: { ...typography.tiny, marginTop: 4, fontWeight: '600' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent, marginLeft: spacing.sm },
});
