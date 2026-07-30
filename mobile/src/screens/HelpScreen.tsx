import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Application from 'expo-application';
import { Card } from '@/components/Card';
import { useResolvedTheme } from '@/hooks/useThemeMode';
import { colors, spacing, typography, radius } from '@/theme';
import { SUPPORT_EMAIL, SUPPORT_PHONE, APP_NAME } from '@/utils/constants';

const FAQS = [
  { q: 'Can I mark attendance from this app?', a: 'No. The Mayzax Companion app is read-only. Attendance (login, logout, breaks, heartbeat) is managed exclusively through the desktop CMS to ensure accuracy and compliance.' },
  { q: 'Why is my status not updating?', a: 'The dashboard refreshes every 30 seconds. Pull down to manually refresh. If issues persist, you may be offline — cached data will be shown until connectivity returns.' },
  { q: 'What do the break countdowns mean?', a: 'Countdowns are calculated by the server based on your company\'s shift policy. When a break is about to end, you will receive push notifications at 5 minutes, 2 minutes, and when it expires.' },
  { q: 'How do I enable notifications?', a: 'When you first sign in, the app will ask for notification permission. You can also enable it from Settings > Notifications, or from your device Settings > Apps > Mayzax.' },
  { q: 'My data appears incorrect. What should I do?', a: 'All data is sourced from the backend. Please reach out to your reporting manager or the HR/admin team to get attendance data corrected.' },
  { q: 'Is my data stored on the device?', a: 'JWT tokens are stored securely in your device\'s keychain/keystore. Recent dashboard, profile and notification data is cached offline using encrypted storage and can be cleared by logging out.' },
];

export function HelpScreen() {
  const dark = useResolvedTheme() === 'dark';
  const nav = useNavigation<any>();
  const [open, setOpen] = useState<number | null>(null);
  const version = Application.nativeApplicationVersion
    ? `${Application.nativeApplicationVersion} (${Application.nativeBuildVersion ?? '0'})`
    : '1.0.0';

  const openMail = () => Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(APP_NAME + ' Support')}`);
  const openPhone = () => SUPPORT_PHONE && Linking.openURL(`tel:${SUPPORT_PHONE.replace(/\D/g, '')}`);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: dark ? '#0B1220' : colors.background }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={dark ? colors.textDark : colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: dark ? colors.textDark : colors.text }]}>Help & Support</Text>
        <View style={{ width: 22 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
        <Card style={{ padding: 0 }}>
          <TouchableOpacity style={styles.row} onPress={openMail}>
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons name="email-outline" size={20} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: dark ? colors.textDark : colors.text }]}>Email support</Text>
              <Text style={[styles.rowSub, { color: dark ? colors.textMutedDark : colors.textMuted }]}>{SUPPORT_EMAIL}</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textMuted} />
          </TouchableOpacity>
          {SUPPORT_PHONE ? (
            <TouchableOpacity style={styles.row} onPress={openPhone}>
              <View style={styles.iconCircle}>
                <MaterialCommunityIcons name="phone-outline" size={20} color={colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowLabel, { color: dark ? colors.textDark : colors.text }]}>Call support</Text>
                <Text style={[styles.rowSub, { color: dark ? colors.textMutedDark : colors.textMuted }]}>{SUPPORT_PHONE}</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </Card>

        <Text style={[styles.section, { color: dark ? colors.textMutedDark : colors.textMuted }]}>FAQ</Text>
        <Card style={{ padding: 0 }}>
          {FAQS.map((f, i) => {
            const isOpen = open === i;
            return (
              <View key={i} style={[styles.faqItem, i === FAQS.length - 1 && { borderBottomWidth: 0 }]}>
                <TouchableOpacity style={styles.faqHeader} onPress={() => setOpen(isOpen ? null : i)}>
                  <Text style={[styles.faqQ, { color: dark ? colors.textDark : colors.text }]}>{f.q}</Text>
                  <MaterialCommunityIcons
                    name={isOpen ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={dark ? colors.textMutedDark : colors.textMuted}
                  />
                </TouchableOpacity>
                {isOpen ? <Text style={[styles.faqA, { color: dark ? colors.textMutedDark : colors.textMuted }]}>{f.a}</Text> : null}
              </View>
            );
          })}
        </Card>

        <Text style={[styles.section, { color: dark ? colors.textMutedDark : colors.textMuted, marginTop: spacing.lg }]}>
          About
        </Text>
        <Card>
          <Text style={[styles.aboutTitle, { color: dark ? colors.textDark : colors.text }]}>{APP_NAME}</Text>
          <Text style={[styles.aboutText, { color: dark ? colors.textMutedDark : colors.textMuted }]}>
            Version {version}
          </Text>
          <Text style={[styles.aboutText, { color: dark ? colors.textMutedDark : colors.textMuted, marginTop: spacing.sm }]}>
            The Mayzax Companion app is your secure, read-only window into your workday at Mayzax.
            View your shift, breaks, attendance history, and company notices — all from your phone.
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg, paddingBottom: spacing.sm },
  title: { ...typography.h2, flex: 1, textAlign: 'center' },
  section: { ...typography.small, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '700', marginTop: spacing.lg, marginBottom: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E2E8F0' },
  iconCircle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(19,168,158,0.12)', alignItems: 'center', justifyContent: 'center',
    marginRight: spacing.md,
  },
  rowLabel: { ...typography.body, fontWeight: '700' },
  rowSub: { ...typography.small, marginTop: 2 },
  faqItem: { padding: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E2E8F0' },
  faqHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  faqQ: { ...typography.body, fontWeight: '600', flex: 1, paddingRight: spacing.md },
  faqA: { ...typography.small, marginTop: spacing.sm, lineHeight: 18 },
  aboutTitle: { ...typography.h3 },
  aboutText: { ...typography.small, marginTop: 2 },
});
