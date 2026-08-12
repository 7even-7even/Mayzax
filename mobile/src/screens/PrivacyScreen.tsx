import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useResolvedTheme } from '@/hooks/useThemeMode';
import { colors, spacing } from '@/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Privacy'>;

export function PrivacyScreen({ navigation }: Props) {
  const dark = useResolvedTheme() === 'dark';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: dark ? '#0B1220' : '#F8FAFC' }]} edges={['top', 'left', 'right', 'bottom']}>
      {/* Background decoration */}
      <View style={[styles.glowTL, { backgroundColor: dark ? 'rgba(42, 93, 168, 0.15)' : 'rgba(42, 93, 168, 0.08)' }]} />

      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: dark ? colors.textDark : colors.text }]}>Privacy Policy</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn} activeOpacity={0.7}>
          <MaterialCommunityIcons name="close" size={24} color={dark ? colors.textDark : colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.card, { backgroundColor: dark ? '#131D31' : '#ffffff', borderColor: dark ? '#1E293B' : '#E2E8F0', shadowColor: dark ? '#000' : '#64748b' }]}>
          <Text style={[styles.lastUpdated, { color: dark ? colors.textMutedDark : colors.textMuted }]}>Last updated: August 2026</Text>

          <Text style={[styles.p, { color: dark ? colors.textDark : colors.text }]}>
            At Mayzax Solutions LLC, we are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our services.
          </Text>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.accent }]}>1. Information We Collect</Text>
            <Text style={[styles.subSectionTitle, { color: dark ? colors.textDark : colors.text }]}>Personal Information</Text>
            <Text style={[styles.bullet, { color: dark ? colors.textMutedDark : colors.textMuted }]}>• Name, email address, and phone number.</Text>
            <Text style={[styles.bullet, { color: dark ? colors.textMutedDark : colors.textMuted }]}>• Resume, work experience, and educational background.</Text>
            <Text style={[styles.bullet, { color: dark ? colors.textMutedDark : colors.textMuted }]}>• Professional skills and certifications.</Text>
            <Text style={[styles.bullet, { color: dark ? colors.textMutedDark : colors.textMuted }]}>• Communication history with our team.</Text>

            <Text style={[styles.subSectionTitle, { color: dark ? colors.textDark : colors.text }]}>Technical Information</Text>
            <Text style={[styles.bullet, { color: dark ? colors.textMutedDark : colors.textMuted }]}>• Device information, IP address, and operating system.</Text>
            <Text style={[styles.bullet, { color: dark ? colors.textMutedDark : colors.textMuted }]}>• App usage metrics, logs, and analytics.</Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.accent }]}>2. How We Use Your Information</Text>
            <Text style={[styles.bullet, { color: dark ? colors.textMutedDark : colors.textMuted }]}>• Matching you with suitable career placement opportunities.</Text>
            <Text style={[styles.bullet, { color: dark ? colors.textMutedDark : colors.textMuted }]}>• Providing personalized coaching and support services.</Text>
            <Text style={[styles.bullet, { color: dark ? colors.textMutedDark : colors.textMuted }]}>• Sending notifications, alert updates, and messaging communications.</Text>
            <Text style={[styles.bullet, { color: dark ? colors.textMutedDark : colors.textMuted }]}>• Improving app performance and features.</Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.accent }]}>3. Data Security</Text>
            <Text style={[styles.p, { color: dark ? colors.textMutedDark : colors.textMuted }]}>
              We implement industry-standard encryption, secure servers, and authorization tokens to safeguard your personal data. We do not sell your personal information to third parties.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.accent }]}>4. SMS & Contact Consent</Text>
            <Text style={[styles.p, { color: dark ? colors.textMutedDark : colors.textMuted }]}>
              By registering or logging in, you agree to receive career notifications and text message alerts regarding schedules, dashboard metrics, and payments. You can opt-out at any time by contacting support.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  glowTL: {
    position: 'absolute', top: -100, left: -100, width: 250, height: 250,
    borderRadius: 125,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: { fontSize: 20, fontWeight: '800', letterSpacing: 0.5 },
  closeBtn: { padding: 4 },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxl },
  card: {
    borderRadius: 20,
    padding: spacing.lg,
    borderWidth: 1,
    elevation: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  lastUpdated: { fontSize: 11, fontWeight: '700', marginBottom: spacing.md },
  p: { fontSize: 14, lineHeight: 20, fontWeight: '500' },
  section: { marginTop: spacing.lg, gap: spacing.xs },
  sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: spacing.xs },
  subSectionTitle: { fontSize: 14, fontWeight: '700', marginTop: spacing.xs },
  bullet: { fontSize: 13, lineHeight: 18, fontWeight: '600', marginLeft: spacing.xs },
});
