import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useResolvedTheme } from '@/hooks/useThemeMode';
import { colors, spacing } from '@/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Terms'>;

export function TermsScreen({ navigation }: Props) {
  const dark = useResolvedTheme() === 'dark';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: dark ? '#0B1220' : '#F8FAFC' }]} edges={['top', 'left', 'right', 'bottom']}>
      {/* Background decoration */}
      <View style={[styles.glowTL, { backgroundColor: dark ? 'rgba(42, 93, 168, 0.15)' : 'rgba(42, 93, 168, 0.08)' }]} />

      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: dark ? colors.textDark : colors.text }]}>Terms & Conditions</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn} activeOpacity={0.7}>
          <MaterialCommunityIcons name="close" size={24} color={dark ? colors.textDark : colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.card, { backgroundColor: dark ? '#131D31' : '#ffffff', borderColor: dark ? '#1E293B' : '#E2E8F0', shadowColor: dark ? '#000' : '#64748b' }]}>
          <Text style={[styles.lastUpdated, { color: dark ? colors.textMutedDark : colors.textMuted }]}>Last updated: August 2026</Text>

          <Text style={[styles.p, { color: dark ? colors.textDark : colors.text }]}>
            By accessing and using the services provided by Mayzax Solutions LLC ("we," "us," or "our"), you agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use our services.
          </Text>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.accent }]}>1. Services Provided</Text>
            <Text style={[styles.bullet, { color: dark ? colors.textMutedDark : colors.textMuted }]}>• IT Career Placement Services</Text>
            <Text style={[styles.bullet, { color: dark ? colors.textMutedDark : colors.textMuted }]}>• Professional Training and Coaching</Text>
            <Text style={[styles.bullet, { color: dark ? colors.textMutedDark : colors.textMuted }]}>• Resume Writing and Optimization</Text>
            <Text style={[styles.bullet, { color: dark ? colors.textMutedDark : colors.textMuted }]}>• Interview Preparation</Text>
            <Text style={[styles.bullet, { color: dark ? colors.textMutedDark : colors.textMuted }]}>• Career Analytics and Guidance</Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.accent }]}>2. Service Plans & Payments</Text>
            <Text style={[styles.subSectionTitle, { color: dark ? colors.textDark : colors.text }]}>Plan Selection</Text>
            <Text style={[styles.p, { color: dark ? colors.textMutedDark : colors.textMuted }]}>
              We offer three service tiers: Basic, Gold, and Premium. Each plan includes specific services and durations as outlined on our pricing pages.
            </Text>
            <Text style={[styles.subSectionTitle, { color: dark ? colors.textDark : colors.text }]}>Payment Terms</Text>
            <Text style={[styles.bullet, { color: dark ? colors.textMutedDark : colors.textMuted }]}>• Payment must be made upfront before services commence.</Text>
            <Text style={[styles.bullet, { color: dark ? colors.textMutedDark : colors.textMuted }]}>• All fees are in USD and non-refundable unless otherwise stated.</Text>
            <Text style={[styles.bullet, { color: dark ? colors.textMutedDark : colors.textMuted }]}>• Additional services may incur extra charges.</Text>
            <Text style={[styles.bullet, { color: dark ? colors.textMutedDark : colors.textMuted }]}>• We reserve the right to modify pricing with 30 days notice.</Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.accent }]}>3. Client Responsibilities</Text>
            <Text style={[styles.bullet, { color: dark ? colors.textMutedDark : colors.textMuted }]}>• Provide accurate and complete information.</Text>
            <Text style={[styles.bullet, { color: dark ? colors.textMutedDark : colors.textMuted }]}>• Respond promptly to interview requests and communications.</Text>
            <Text style={[styles.bullet, { color: dark ? colors.textMutedDark : colors.textMuted }]}>• Actively participate in training and coaching sessions.</Text>
            <Text style={[styles.bullet, { color: dark ? colors.textMutedDark : colors.textMuted }]}>• Follow our recommendations and guidelines.</Text>
            <Text style={[styles.bullet, { color: dark ? colors.textMutedDark : colors.textMuted }]}>• Notify us immediately of any job offers or acceptances.</Text>
            <Text style={[styles.bullet, { color: dark ? colors.textMutedDark : colors.textMuted }]}>• Maintain professional conduct throughout the process.</Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.accent }]}>4. Service Guarantee</Text>
            <Text style={[styles.p, { color: dark ? colors.textMutedDark : colors.textMuted }]}>
              While we maintain a 95% interview success rate and work diligently to secure job placements, we cannot guarantee specific job offers, salaries, placement at particular companies, or immediate placement within a specific timeframe.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.accent }]}>5. Intellectual Property & Liability</Text>
            <Text style={[styles.p, { color: dark ? colors.textMutedDark : colors.textMuted }]}>
              All materials provided by Mayzax Solutions, including training content, templates, and resources, remain our intellectual property. You may not reproduce or distribute these materials without written permission.
            </Text>
            <Text style={[styles.p, { color: dark ? colors.textMutedDark : colors.textMuted, marginTop: spacing.sm }]}>
              Mayzax Solutions shall not be liable for any indirect, incidental, special, or consequential damages arising from the use of our services.
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
