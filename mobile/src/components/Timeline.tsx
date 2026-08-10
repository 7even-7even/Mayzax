import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useResolvedTheme } from '@/hooks/useThemeMode';
import { colors, radius, spacing, typography } from '@/theme';
import { formatTime, formatDuration } from '@/utils/format';
import type { TimelineItem } from '@/types/api';
import { StatusBadge } from './StatusBadge';

interface Props {
  items: TimelineItem[];
}

export function Timeline({ items }: Props) {
  const dark = useResolvedTheme() === 'dark';
  const borderColor = dark ? colors.borderDark : colors.border;
  return (
    <View>
      {items.map((it, idx) => {
        const isLast = idx === items.length - 1;
        const color = colorForStatus(it.status);
        return (
          <View key={it.id} style={styles.row}>
            <View style={styles.indicatorCol}>
              <View style={[styles.dot, { backgroundColor: color }]} />
              {!isLast ? <View style={[styles.line, { backgroundColor: borderColor }]} /> : null}
            </View>
            <View style={styles.contentCol}>
              <View style={styles.headerRow}>
                <Text style={[styles.time, { color: dark ? colors.textDark : colors.text }]}>
                  {formatTime(it.startedAt)}
                </Text>
                <StatusBadge status={it.status} size="sm" />
              </View>
              <Text style={[styles.duration, { color: dark ? colors.textMutedDark : colors.textMuted }]}>
                {it.endedAt ? `Duration ${formatDuration(it.durationSec)}` : 'In progress'}
              </Text>
              {it.note ? (
                <Text style={[styles.note, { color: dark ? colors.textMutedDark : colors.textMuted }]}>
                  {it.note}
                </Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function colorForStatus(s: string): string {
  switch (s) {
    case 'ACTIVE':
      return colors.statusActive;
    case 'SHORT_BREAK':
      return colors.statusShortBreak;
    case 'DINNER_BREAK':
      return colors.statusDinnerBreak;
    case 'BRIEFING_TRAINING':
      return colors.statusBriefing;
    case 'MEETING':
      return colors.statusMeeting;
    case 'SYSTEM_ISSUE':
      return colors.statusSystemIssue;
    case 'OFFLINE':
      return colors.statusOffline;
    default:
      return colors.textMuted;
  }
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    minHeight: 56,
  },
  indicatorCol: {
    width: 28,
    alignItems: 'center',
    paddingTop: 4,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  line: {
    flex: 1,
    width: 2,
    marginVertical: 2,
  },
  contentCol: {
    flex: 1,
    paddingBottom: spacing.md,
    paddingLeft: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 2,
  },
  time: {
    ...typography.body,
    fontWeight: '600',
  },
  duration: {
    ...typography.small,
    marginBottom: 2,
  },
  note: {
    ...typography.small,
    fontStyle: 'italic',
  },
});
