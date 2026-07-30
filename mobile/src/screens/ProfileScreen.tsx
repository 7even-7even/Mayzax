import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Avatar } from '@/components/Avatar';
import { Skeleton } from '@/components/Skeleton';
import { ErrorState } from '@/components/ErrorState';
import { useResolvedTheme } from '@/hooks/useThemeMode';
import { colors, radius, spacing, typography } from '@/theme';
import { fetchProfile } from '@/services/profile';
import { formatDate } from '@/utils/format';
import { useAuth } from '@/hooks/useAuth';
import type { RootStackParamList } from '@/navigation/RootNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function ProfileScreen() {
  const dark = useResolvedTheme() === 'dark';
  const nav = useNavigation<Nav>();
  const { logout } = useAuth();
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['profile'],
    queryFn: fetchProfile,
    staleTime: 30 * 60 * 1000,
  });

  useFocusEffect(useCallback(() => { refetch(); }, [refetch]));

  if (isLoading && !data) {
    return (
      <Screen>
        <Skeleton height={80} style={{ marginBottom: spacing.md }} />
        <Skeleton height={200} />
      </Screen>
    );
  }
  if (isError && !data) {
    return <Screen><ErrorState message={(error as any)?.message} onRetry={() => refetch()} /></Screen>;
  }
  const u = data!;

  return (
    <Screen onRefresh={() => refetch()} refreshing={false}>
      <Card style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
        <Avatar name={u.name} url={u.avatarUrl} size={90} />
        <Text style={[styles.name, { color: dark ? colors.textDark : colors.text }]}>{u.name}</Text>
        <Text style={[styles.role, { color: dark ? colors.textMutedDark : colors.textMuted }]}>
          {u.designation ?? 'Employee'}{u.department ? ` · ${u.department}` : ''}
        </Text>
        <Text style={[styles.id, { color: colors.accent, fontWeight: '700', marginTop: 4 }]}>
          {u.employeeId ?? `ID: ${u.id.slice(0, 8).toUpperCase()}`}
        </Text>
      </Card>

      <Card style={{ marginTop: spacing.lg, padding: 0 }}>
        <InfoRow icon="email-outline" label="Email" value={u.email} dark={dark} />
        <InfoRow icon="phone-outline" label="Phone" value={u.phone ?? '—'} dark={dark} />
        <InfoRow icon="domain" label="Department" value={u.department ?? '—'} dark={dark} />
        <InfoRow icon="badge-account-horizontal-outline" label="Designation" value={u.designation ?? '—'} dark={dark} />
        <InfoRow icon="calendar-outline" label="Joined" value={u.joinDate ? formatDate(u.joinDate) : '—'} dark={dark} last />
      </Card>

      <Card style={{ marginTop: spacing.md, padding: 0 }}>
        <InfoRow
          icon="account-supervisor-outline"
          label="Reporting Manager"
          value={u.reportingManager?.name ?? '—'}
          dark={dark}
        />
        <InfoRow
          icon="account-group-outline"
          label="Team"
          value={u.teamName ?? u.role.replace('_', ' ')}
          dark={dark}
          last
        />
      </Card>

      <Card style={{ marginTop: spacing.lg, padding: 0 }}>
        <MenuItem icon="cog-outline" label="Settings" onPress={() => nav.navigate('Settings')} dark={dark} />
        <MenuItem icon="help-circle-outline" label="Help & Support" onPress={() => nav.navigate('Help')} dark={dark} />
        <MenuItem icon="logout" label="Logout" onPress={() => logout()} dark={dark} destructive last />
      </Card>
    </Screen>
  );
}

function InfoRow({ icon, label, value, dark, last }: { icon: any; label: string; value: string; dark: boolean; last?: boolean }) {
  return (
    <View style={[styles.infoRow, last && { borderBottomWidth: 0 }]}>
      <View style={styles.infoIcon}>
        <MaterialCommunityIcons name={icon} size={18} color={colors.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.infoLabel, { color: dark ? colors.textMutedDark : colors.textMuted }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: dark ? colors.textDark : colors.text }]}>{value}</Text>
      </View>
    </View>
  );
}

function MenuItem({ icon, label, onPress, dark, destructive, last }: { icon: any; label: string; onPress: () => void; dark: boolean; destructive?: boolean; last?: boolean }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.menuItem, last && { borderBottomWidth: 0 }]}>
        <MaterialCommunityIcons
          name={icon}
          size={20}
          color={destructive ? colors.error : colors.accent}
          style={{ marginRight: spacing.md }}
        />
        <Text style={[styles.menuLabel, { color: destructive ? colors.error : (dark ? colors.textDark : colors.text) }]}>{label}</Text>
        <Ionicons name="chevron-forward" size={16} color={dark ? colors.textMutedDark : colors.textMuted} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  name: { ...typography.h2, marginTop: spacing.md },
  role: { ...typography.body, marginTop: 2 },
  id: { ...typography.small },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(19,168,158,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  infoLabel: { ...typography.small, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '600' },
  infoValue: { ...typography.body, fontWeight: '600', marginTop: 2 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  menuLabel: { ...typography.body, flex: 1, fontWeight: '600' },
});
