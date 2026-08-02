import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Skeleton } from '@/components/Skeleton';
import { ErrorState } from '@/components/ErrorState';
import { EmptyState } from '@/components/EmptyState';
import { useResolvedTheme } from '@/hooks/useThemeMode';
import { colors, radius, spacing, typography } from '@/theme';
import { fetchMonthSummary } from '@/services/attendance';
import type { RootStackParamList } from '@/navigation/RootNavigator';
import { getStatusColor } from '@/theme';
import dayjs from 'dayjs';
import { formatDuration } from '@/utils/format';

type Nav = NativeStackNavigationProp<RootStackParamList>;

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function HistoryScreen() {
  const dark = useResolvedTheme() === 'dark';
  const nav = useNavigation<Nav>();
  const [cursor, setCursor] = useState<Date>(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const month = monthKey(cursor);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['attendance', 'month', month],
    queryFn: () => fetchMonthSummary(month),
    staleTime: 5 * 60 * 1000,
  });

  useFocusEffect(useCallback(() => { refetch(); }, [refetch]));

  const calendarGrid = useMemo(() => {
    if (!data) return [];
    const firstOfMonth = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const lastOfMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    const leadingEmpty = firstOfMonth.getDay(); // Sunday = 0
    type DayItem = (typeof data.days)[number];
    const days: Array<{ date: string | null; info?: DayItem }> = [];
    for (let i = 0; i < leadingEmpty; i++) days.push({ date: null });
    const map = new Map<string, DayItem>(data.days.map((d: DayItem) => [d.date, d]));
    for (let d = 1; d <= lastOfMonth.getDate(); d++) {
      const dateObj = new Date(cursor.getFullYear(), cursor.getMonth(), d);
      const key = dateObj.toISOString().slice(0, 10);
      days.push({ date: key, info: map.get(key) });
    }
    return days;
  }, [data, cursor]);

  const isFuture = (dateStr: string) => dayjs(dateStr).isAfter(dayjs(), 'day');

  const changeMonth = (delta: number) => {
    const next = new Date(cursor);
    next.setMonth(next.getMonth() + delta);
    // Don't go past the current month+1
    const today = new Date();
    const maxDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    if (next > maxDate) return;
    const minDate = new Date(today.getFullYear() - 1, today.getMonth(), 1);
    if (next < minDate) return;
    setCursor(next);
  };

  return (
    <Screen scroll={false} refreshing={false}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>
        <Text style={[styles.title, { color: dark ? colors.textDark : colors.text }]}>Attendance History</Text>
        <View style={styles.monthHeader}>
          <TouchableOpacity onPress={() => changeMonth(-1)} hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}>
            <Text style={[styles.navBtn, { color: colors.accent }]}>{'‹'}</Text>
          </TouchableOpacity>
          <Text style={[styles.month, { color: dark ? colors.textDark : colors.text }]}>
            {dayjs(cursor).format('MMMM YYYY')}
          </Text>
          <TouchableOpacity onPress={() => changeMonth(1)} hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}>
            <Text style={[styles.navBtn, { color: colors.accent }]}>{'›'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {isLoading && !data ? (
        <View style={{ padding: spacing.lg }}>
          <Skeleton height={240} />
        </View>
      ) : isError && !data ? (
        <ErrorState message={(error as any)?.message} onRetry={() => refetch()} />
      ) : (
        <>
          <View style={styles.calendarWrap}>
            <View style={styles.weekdays}>
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((w, i) => (
                <Text key={i} style={[styles.weekday, { color: dark ? colors.textMutedDark : colors.textMuted }]}>{w}</Text>
              ))}
            </View>
            <View style={styles.grid}>
              {calendarGrid.map((cell, idx) => {
                if (!cell.date) return <View key={idx} style={styles.cell} />;
                const status = cell.info?.status ?? 'NOT_STARTED';
                const color = getStatusColor(status);
                const today = dayjs().format('YYYY-MM-DD') === cell.date;
                const future = isFuture(cell.date);
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.cell,
                      {
                        backgroundColor: dark ? 'rgba(255,255,255,0.02)' : '#fff',
                        borderColor: today ? colors.accent : dark ? colors.borderDark : colors.border,
                      },
                    ]}
                    disabled={future || status === 'NOT_STARTED'}
                    onPress={() => nav.navigate('AttendanceDetail', { date: cell.date! })}
                    activeOpacity={0.6}
                  >
                    <Text style={[styles.cellDay, { color: future ? (dark ? colors.textMutedDark : colors.textMuted) : (dark ? colors.textDark : colors.text) }]}>
                      {dayjs(cell.date).date()}
                    </Text>
                    {!future && cell.info && status !== 'NOT_STARTED' ? (
                      <View style={[styles.dot, { backgroundColor: color }]} />
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.legend}>
              <LegendItem color={colors.statusActive} label="Present" dark={dark} />
              <LegendItem color={colors.warning} label="Half day" dark={dark} />
              <LegendItem color={colors.error} label="Absent" dark={dark} />
              <LegendItem color={colors.statusShortBreak} label="On break" dark={dark} />
              <LegendItem color="#7C3AED" label="Wk off/Holiday" dark={dark} />
            </View>
          </View>

          <Text style={[styles.section, { color: dark ? colors.textDark : colors.text, paddingHorizontal: spacing.lg, marginTop: spacing.lg }]}>
            This month
          </Text>
          <FlatList
            data={data?.days.slice().reverse() ?? []}
            keyExtractor={(d) => d.date}
            contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xxl }}
            ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
            ListEmptyComponent={
              <EmptyState title="No attendance yet" description="Your attendance will appear here after you work a full day." />
            }
            renderItem={({ item }) => (
              <TouchableOpacity activeOpacity={0.7} onPress={() => nav.navigate('AttendanceDetail', { date: item.date })}>
                <Card padded>
                  <View style={styles.row}>
                    <View style={styles.dateCol}>
                      <Text style={[styles.dayBig, { color: dark ? colors.textDark : colors.text }]}>
                        {dayjs(item.date).format('DD')}
                      </Text>
                      <Text style={[styles.daySmall, { color: dark ? colors.textMutedDark : colors.textMuted }]}>
                        {dayjs(item.date).format('ddd, MMM')}
                      </Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: spacing.md }}>
                      <View style={styles.rowBetween}>
                        <Text style={[styles.listTitle, { color: dark ? colors.textDark : colors.text }]}>
                          {item.firstLoginAt ? formatLoginLogout(item) : 'No login'}
                        </Text>
                        <StatusPill status={item.status} />
                      </View>
                      <View style={[styles.rowBetween, { marginTop: 4 }]}>
                        <Text style={[styles.listMeta, { color: dark ? colors.textMutedDark : colors.textMuted }]}>
                          Worked {item.totalProductiveSec > 0 ? formatDuration(item.totalProductiveSec) : '—'}
                        </Text>
                        {item.penaltyMinutes > 0 ? (
                          <Text style={[styles.listMeta, { color: colors.error }]}>
                            Penalty {item.penaltyMinutes}m
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            )}
          />
        </>
      )}
    </Screen>
  );
}

function formatLoginLogout(item: { firstLoginAt: string | null }) {
  return item.firstLoginAt ? dayjs(item.firstLoginAt).format('hh:mm A') : '—';
}

function LegendItem({ color, label, dark }: { color: string; label: string; dark: boolean }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.legendText, { color: dark ? colors.textMutedDark : colors.textMuted }]}>{label}</Text>
    </View>
  );
}

function StatusPill({ status }: { status: string }) {
  const color = getStatusColor(status);
  const label = status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <View style={[styles.pill, { backgroundColor: color + '22', borderColor: color }]}>
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.h2 },
  monthHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: spacing.md },
  month: { ...typography.h3 },
  navBtn: { fontSize: 28, fontWeight: '700', paddingHorizontal: spacing.md },
  calendarWrap: {
    marginHorizontal: spacing.lg,
    borderRadius: radius.lg,
    padding: spacing.md,
    backgroundColor: '#fff',
  },
  weekdays: { flexDirection: 'row', marginBottom: spacing.xs },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    paddingVertical: 6,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    margin: 0,
  },
  cellDay: { fontSize: 13, fontWeight: '600' },
  dot: { width: 6, height: 6, borderRadius: 3, marginTop: 3 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.md, gap: spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginRight: spacing.md },
  legendText: { marginLeft: 4, fontSize: 11, fontWeight: '500' },
  section: { ...typography.h3, marginBottom: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateCol: { alignItems: 'center', width: 56 },
  dayBig: { fontSize: 24, fontWeight: '800' },
  daySmall: { ...typography.tiny, fontWeight: '600' },
  listTitle: { ...typography.body, fontWeight: '700' },
  listMeta: { ...typography.small },
  pill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill, borderWidth: StyleSheet.hairlineWidth },
  pillText: { fontSize: 10, fontWeight: '700' },
});
