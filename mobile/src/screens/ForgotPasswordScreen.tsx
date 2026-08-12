import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useResolvedTheme } from '@/hooks/useThemeMode';
import { colors, spacing } from '@/theme';
import * as authService from '@/services/auth';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '@/navigation/RootNavigator';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

export function ForgotPasswordScreen({ navigation }: Props) {
  const dark = useResolvedTheme() === 'dark';
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await authService.forgotPasswordQuestion(email);
      navigation.navigate('ForgotPasswordReset', {
        email: res.email,
        securityQuestion: res.securityQuestion,
      });
    } catch (e: any) {
      setError(e?.message ?? 'Unable to find account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: dark ? '#0B1220' : '#F8FAFC' }]}>
      {/* Ambient background glows */}
      <View style={[styles.glowTL, { backgroundColor: dark ? 'rgba(42, 93, 168, 0.15)' : 'rgba(42, 93, 168, 0.08)' }]} />

      <View style={styles.container}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="arrow-left" size={20} color={dark ? colors.textDark : colors.text} />
          <Text style={[styles.backText, { color: dark ? colors.textDark : colors.text }]}>Back</Text>
        </TouchableOpacity>

        <Text style={[styles.title, { color: dark ? colors.textDark : colors.text }]}>Forgot Password</Text>
        <Text style={[styles.subtitle, { color: dark ? colors.textMutedDark : colors.textMuted }]}>
          Enter your email address below, and we'll prompt you with your security question to reset your password.
        </Text>

        <View style={[styles.card, { backgroundColor: dark ? '#131D31' : '#ffffff', borderColor: dark ? '#1E293B' : '#E2E8F0', shadowColor: dark ? '#000' : '#64748b' }]}>
          <TextInput
            label="Email Address"
            mode="outlined"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            outlineColor={dark ? '#334155' : '#E2E8F0'}
            activeOutlineColor={colors.accent}
            style={styles.input}
            theme={{ colors: { onSurfaceVariant: dark ? colors.textMutedDark : colors.textMuted } }}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            onPress={submit}
            disabled={loading}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#2A5DA8', '#3F9C71']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.btn, loading && { opacity: 0.7 }]}
            >
              <Text style={styles.btnText}>
                {loading ? 'Continuing...' : 'Continue'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { padding: spacing.lg, flex: 1, justifyContent: 'center' },
  glowTL: {
    position: 'absolute', top: -100, left: -100, width: 250, height: 250,
    borderRadius: 125,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    position: 'absolute',
    top: spacing.lg,
    left: spacing.lg,
    paddingVertical: 8,
  },
  backText: { fontSize: 15, fontWeight: '700' },
  title: { fontSize: 28, fontWeight: '900', letterSpacing: 0.5, marginBottom: spacing.xs },
  subtitle: { fontSize: 13, fontWeight: '600', lineHeight: 18, marginBottom: spacing.xl },
  card: {
    borderRadius: 20,
    padding: spacing.lg,
    borderWidth: 1,
    elevation: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  input: { backgroundColor: 'transparent' },
  error: { color: colors.error, fontSize: 12, marginTop: spacing.sm, fontWeight: '600', marginLeft: 4 },
  btn: {
    marginTop: spacing.md,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
