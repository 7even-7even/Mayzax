import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/components/Card';
import { Avatar } from '@/components/Avatar';
import { Skeleton } from '@/components/Skeleton';
import { ErrorState } from '@/components/ErrorState';
import { useResolvedTheme } from '@/hooks/useThemeMode';
import { colors, spacing, typography } from '@/theme';
import { fetchProfile } from '@/services/profile';
import { useAuth } from '@/hooks/useAuth';
import type { RootStackParamList } from '@/navigation/RootNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrator',
  TEAM_LEADER: 'Team Leader',
  RECRUITER: 'Recruiter',
};

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
      <SafeAreaView style={{ flex: 1 }}>
        <Skeleton height={180} style={{ borderRadius: 0, marginBottom: 0 }} />
        <View style={{ padding: spacing.lg }}>
          <Skeleton height={200} style={{ borderRadius: 16 }} />
        </View>
      </SafeAreaView>
    );
  }
  if (isError && !data) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center' }}>
        <ErrorState message={(error as any)?.message} onRetry={() => refetch()} />
      </SafeAreaView>
    );
  }
  const u = data!;
  const roleLabel = ROLE_LABELS[u.role] ?? u.role;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: dark ? '#0B1220' : colors.background }}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => refetch()} tintColor={colors.accent} />}
      >
        {/* ─── Gradient banner header ─── */}
        <LinearGradient
          colors={['#2A5DA8', '#347F80', '#3F9C71']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.banner}
        >
          {/* Ambient glows */}
          <View style={styles.glowTL} />
          <View style={styles.glowBR} />

          {/* Avatar */}
          <View style={styles.avatarWrap}>
            <Avatar name={u.name} url={u.avatarUrl} size={84} />
            {/* Status indicator */}
            {u.isActive && (
              <View style={styles.activeDot} />
            )}
          </View>

          <Text style={styles.bannerName}>{u.name}</Text>

          {/* Role + designation */}
          <View style={styles.bannerBadgeRow}>
            <View style={styles.rolePill}>
              <Text style={styles.rolePillText}>{roleLabel}</Text>
            </View>
            {u.designation ? (
              <View style={[styles.rolePill, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                <Text style={styles.rolePillText}>{u.designation}</Text>
              </View>
            ) : null}
          </View>

          {u.employeeId ? (
            <Text style={styles.empId}>{u.employeeId}</Text>
          ) : null}
        </LinearGradient>

        {/* ─── Quick stats row ─── */}
        <View style={[styles.statsRow, { backgroundColor: dark ? colors.surfaceDark : colors.surface }]}>
          <StatPill icon="domain" label="Dept" value={u.department ?? '—'} dark={dark} />
          <View style={styles.statsDivider} />
          <StatPill icon="map-marker-outline" label="Location" value={u.location ?? '—'} dark={dark} />
          <View style={styles.statsDivider} />
          <StatPill icon="account-group-outline" label="Team" value={u.teamName ?? '—'} dark={dark} />
        </View>

        <View style={{ padding: spacing.lg, gap: spacing.lg }}>
          {/* ─── Contact info ─── */}
          <View>
            <SectionLabel label="Contact Information" dark={dark} />
            <Card style={{ padding: 0 }}>
              <InfoRow icon="email-outline" label="Email" value={u.email} dark={dark} />
              <InfoRow icon="phone-outline" label="Phone" value={u.phone ?? '—'} dark={dark} last />
            </Card>
          </View>

          {/* ─── Work info ─── */}
          <View>
            <SectionLabel label="Work Details" dark={dark} />
            <Card style={{ padding: 0 }}>
              <InfoRow icon="badge-account-horizontal-outline" label="Designation" value={u.designation ?? '—'} dark={dark} />
              <InfoRow icon="domain" label="Department" value={u.department ?? '—'} dark={dark} />
              <InfoRow icon="account-group-outline" label="Role" value={roleLabel} dark={dark} />
              {u.teamName ? <InfoRow icon="account-supervisor-outline" label="Team" value={u.teamName} dark={dark} /> : null}
              {u.reportingManager ? (
                <InfoRow icon="account-tie-outline" label="Reporting Manager" value={u.reportingManager.name} dark={dark} />
              ) : null}
              <InfoRow icon="shield-account-outline" label="Status" value={u.isActive ? 'Active' : 'Inactive'} dark={dark} last />
            </Card>
          </View>

          {/* ─── Actions ─── */}
          <View>
            <SectionLabel label="Actions" dark={dark} />
            <Card style={{ padding: 0 }}>
              <ActionRow icon="cog-outline" label="Settings" onPress={() => nav.navigate('Settings')} dark={dark} />
              <ActionRow icon="logout" label="Sign Out" onPress={() => logout()} dark={dark} destructive last />
            </Card>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionLabel({ label, dark }: { label: string; dark: boolean }) {
  return (
    <Text style={[styles.sectionLabel, { color: dark ? colors.textMutedDark : colors.textMuted }]}>
      {label.toUpperCase()}
    </Text>
  );
}

function StatPill({ icon, label, value, dark }: { icon: string; label: string; value: string; dark: boolean }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', paddingVertical: spacing.md }}>
      <MaterialCommunityIcons name={icon as any} size={18} color={colors.accent} />
      <Text style={[styles.statLabel, { color: dark ? colors.textMutedDark : colors.textMuted }]}>{label}</Text>
      <Text style={[styles.statValue, { color: dark ? colors.textDark : colors.text }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function InfoRow({ icon, label, value, dark, last }: {
  icon: string; label: string; value: string; dark: boolean; last?: boolean;
}) {
  return (
    <View style={[styles.infoRow, { borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth, borderBottomColor: dark ? '#1E293B' : '#E2E8F0' }]}>
      <View style={styles.infoIcon}>
        <MaterialCommunityIcons name={icon as any} size={17} color={colors.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.infoLabel, { color: dark ? colors.textMutedDark : colors.textMuted }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: dark ? colors.textDark : colors.text }]}>{value}</Text>
      </View>
    </View>
  );
}

function ActionRow({ icon, label, onPress, dark, destructive, last }: {
  icon: string; label: string; onPress: () => void; dark: boolean; destructive?: boolean; last?: boolean;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.menuItem, { borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth, borderBottomColor: dark ? '#1E293B' : '#E2E8F0' }]}>
        <View style={[styles.infoIcon, { backgroundColor: destructive ? '#FEE2E2' : 'rgba(19,168,158,0.10)' }]}>
          <MaterialCommunityIcons name={icon as any} size={17} color={destructive ? colors.error : colors.accent} />
        </View>
        <Text style={[styles.menuLabel, { color: destructive ? colors.error : (dark ? colors.textDark : colors.text) }]}>{label}</Text>
        <Ionicons name="chevron-forward" size={16} color={dark ? colors.textMutedDark : colors.textMuted} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  banner: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl + 8,
    alignItems: 'center',
    overflow: 'hidden',
  },
  glowTL: {
    position: 'absolute', top: -60, left: -60, width: 200, height: 200,
    borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.10)',
  },
  glowBR: {
    position: 'absolute', bottom: -40, right: -40, width: 180, height: 180,
    borderRadius: 90, backgroundColor: 'rgba(63,156,113,0.20)',
  },
  avatarWrap: { position: 'relative', marginBottom: spacing.md },
  activeDot: {
    position: 'absolute', bottom: 2, right: 2, width: 16, height: 16,
    borderRadius: 8, backgroundColor: '#34d399', borderWidth: 3, borderColor: '#2A5DA8',
  },
  bannerName: { fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },
  bannerBadgeRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  rolePill: {
    backgroundColor: 'rgba(255,255,255,0.20)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  rolePillText: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.90)' },
  empId: { fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 8, letterSpacing: 1, fontWeight: '600' },

  statsRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  statsDivider: { width: StyleSheet.hairlineWidth, backgroundColor: '#E2E8F0' },
  statLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 3 },
  statValue: { fontSize: 13, fontWeight: '700', marginTop: 2, textAlign: 'center' },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: spacing.sm,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', padding: spacing.md },
  infoIcon: {
    width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(19,168,158,0.10)',
    alignItems: 'center', justifyContent: 'center', marginRight: spacing.md,
  },
  infoLabel: { ...typography.tiny, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '700' },
  infoValue: { fontSize: 14, fontWeight: '600', marginTop: 2 },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: spacing.md },
  menuLabel: { flex: 1, fontSize: 14, fontWeight: '600', marginLeft: spacing.md },
});
