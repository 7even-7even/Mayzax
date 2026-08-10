import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, Linking, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import * as Application from 'expo-application';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Card } from '@/components/Card';
import { useResolvedTheme, useThemeStore, type ThemeMode } from '@/hooks/useThemeMode';
import { colors, spacing, typography, radius } from '@/theme';
import { useAuth } from '@/hooks/useAuth';
import { PRIVACY_URL, TERMS_URL, SUPPORT_EMAIL } from '@/utils/constants';

function SettingsHeader({ onBack, dark }: { onBack: () => void; dark: boolean }) {
  return (
    <LinearGradient
      colors={['#2A5DA8', '#347F80', '#3F9C71']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.heroBanner}
    >
      <View style={styles.heroGlowTL} />
      <View style={styles.heroGlowBR} />
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity onPress={onBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} style={{ marginRight: spacing.md }}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.heroGreeting}>APP PREFERENCES</Text>
          <Text style={styles.heroName} numberOfLines={1}>Settings</Text>
        </View>
      </View>
    </LinearGradient>
  );
}

export function SettingsScreen() {
  const dark = useResolvedTheme() === 'dark';
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);
  const nav = useNavigation<any>();
  const { logout } = useAuth();
  const [pushEnabled, setPushEnabled] = useState<boolean>(true);

  useEffect(() => {
    Notifications.getPermissionsAsync().then((p) => setPushEnabled(p.granted || p.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL)).catch(() => {});
  }, []);

  const togglePush = async () => {
    if (pushEnabled) {
      Alert.alert('Notifications', 'To disable notifications, please adjust permission in your device settings.');
      return;
    }
    const res = await Notifications.requestPermissionsAsync();
    setPushEnabled(res.granted);
  };

  const confirmLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => logout() },
    ]);
  };

  const version = Application.nativeApplicationVersion
    ? `${Application.nativeApplicationVersion} (${Application.nativeBuildVersion ?? '0'})`
    : '1.0.0';

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: dark ? '#0B1220' : colors.background }}>
      <SettingsHeader onBack={() => nav.goBack()} dark={dark} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
        <Text style={[styles.section, { color: dark ? colors.textMutedDark : colors.textMuted }]}>Appearance</Text>
        <Card style={{ padding: 0 }}>
          {(['light', 'dark', 'system'] as ThemeMode[]).map((m) => (
            <TouchableOpacity key={m} style={styles.row} onPress={() => setMode(m)} activeOpacity={0.6}>
              <MaterialCommunityIcons
                name={m === 'light' ? 'white-balance-sunny' : m === 'dark' ? 'weather-night' : 'theme-light-dark'}
                size={20}
                color={colors.accent}
                style={{ marginRight: spacing.md }}
              />
              <Text style={[styles.rowLabel, { color: dark ? colors.textDark : colors.text }]}>
                {m === 'light' ? 'Light mode' : m === 'dark' ? 'Dark mode' : 'System default'}
              </Text>
              <View style={{ flex: 1 }} />
              {mode === m ? <MaterialCommunityIcons name="check-circle" size={20} color={colors.accent} /> : null}
            </TouchableOpacity>
          ))}
        </Card>

        <Text style={[styles.section, { color: dark ? colors.textMutedDark : colors.textMuted, marginTop: spacing.lg }]}>
          Notifications
        </Text>
        <Card style={{ padding: 0 }}>
          <View style={styles.row}>
            <MaterialCommunityIcons name="bell-outline" size={20} color={colors.accent} style={{ marginRight: spacing.md }} />
            <Text style={[styles.rowLabel, { color: dark ? colors.textDark : colors.text }]}>Push notifications</Text>
            <View style={{ flex: 1 }} />
            <Switch value={pushEnabled} onValueChange={togglePush} trackColor={{ true: colors.accent, false: '#94A3B8' }} thumbColor="#fff" />
          </View>
        </Card>

        {/* <Text style={[styles.section, { color: dark ? colors.textMutedDark : colors.textMuted, marginTop: spacing.lg }]}>
          Support & About
        </Text>
        <Card style={{ padding: 0 }}>
          <LinkRow icon="help-circle-outline" label="Help & Support" onPress={() => nav.navigate('Help')} dark={dark} />
          <LinkRow icon="email-outline" label="Contact Support" onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)} dark={dark} />
          <LinkRow icon="shield-check-outline" label="Privacy Policy" onPress={() => Linking.openURL(PRIVACY_URL).catch(() => {})} dark={dark} />
          <LinkRow icon="file-document-outline" label="Terms of Service" onPress={() => Linking.openURL(TERMS_URL).catch(() => {})} dark={dark} />
          <View style={styles.row}>
            <MaterialCommunityIcons name="information-outline" size={20} color={colors.accent} style={{ marginRight: spacing.md }} />
            <Text style={[styles.rowLabel, { color: dark ? colors.textDark : colors.text }]}>Version</Text>
            <View style={{ flex: 1 }} />
            <Text style={{ color: dark ? colors.textMutedDark : colors.textMuted }}>{version}</Text>
          </View>
        </Card> */}

        <TouchableOpacity onPress={confirmLogout} activeOpacity={0.8} style={styles.logoutBtn}>
          <MaterialCommunityIcons name="logout" size={20} color={colors.error} style={{ marginRight: spacing.sm }} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function LinkRow({ icon, label, onPress, dark }: { icon: any; label: string; onPress: () => void; dark: boolean }) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.6}>
      <MaterialCommunityIcons name={icon} size={20} color={colors.accent} style={{ marginRight: spacing.md }} />
      <Text style={[styles.rowLabel, { color: dark ? colors.textDark : colors.text }]}>{label}</Text>
      <View style={{ flex: 1 }} />
      <MaterialCommunityIcons name="chevron-right" size={18} color={dark ? colors.textMutedDark : colors.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  heroBanner: { padding: spacing.lg, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, overflow: 'hidden' },
  heroGlowTL: { position: 'absolute', top: -50, left: -50, width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255,255,255,0.1)' },
  heroGlowBR: { position: 'absolute', bottom: -50, right: -50, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.05)' },
  heroGreeting: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  heroName: { color: '#fff', fontSize: 24, fontWeight: '800', marginTop: 4 },
  header: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg, paddingBottom: spacing.sm },
  title: { ...typography.h2, flex: 1, textAlign: 'center' },
  section: { ...typography.small, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '700', marginBottom: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E2E8F0' },
  rowLabel: { ...typography.body, fontWeight: '600' },
  logoutBtn: {
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: 'rgba(220,38,38,0.08)',
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: { ...typography.body, color: colors.error, fontWeight: '700' },
});
