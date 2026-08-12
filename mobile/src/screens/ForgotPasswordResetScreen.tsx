import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useResolvedTheme } from '@/hooks/useThemeMode';
import { colors, spacing } from '@/theme';
import * as authService from '@/services/auth';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '@/navigation/RootNavigator';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPasswordReset'>;

export function ForgotPasswordResetScreen({ route, navigation }: Props) {
  const dark = useResolvedTheme() === 'dark';
  const { email, securityQuestion } = route.params;
  const [answer, setAnswer] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (!answer.trim()) return setError('Please answer your security question');
    if (newPw.length < 6) return setError('Password must be at least 6 characters');
    if (newPw !== confirmPw) return setError('Passwords do not match');
    setLoading(true);
    try {
      await authService.resetPassword({ email, securityAnswer: answer, newPassword: newPw });
      Alert.alert('Password reset', 'Your password has been reset. Please log in.', [
        { text: 'OK', onPress: () => navigation.popToTop() },
      ]);
    } catch (e: any) {
      setError(e?.message ?? 'Unable to reset password');
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

        <Text style={[styles.title, { color: dark ? colors.textDark : colors.text }]}>Reset Password</Text>
        <Text style={[styles.subtitle, { color: dark ? colors.textMutedDark : colors.textMuted }]}>
          Please answer the security question and type in a new secure password.
        </Text>

        <View style={[styles.card, { backgroundColor: dark ? '#131D31' : '#ffffff', borderColor: dark ? '#1E293B' : '#E2E8F0', shadowColor: dark ? '#000' : '#64748b' }]}>
          <View style={[styles.qCard, { backgroundColor: dark ? '#1E293B' : '#F1F5F9', borderLeftColor: colors.accent }]}>
            <Text style={[styles.qLabel, { color: dark ? colors.textMutedDark : colors.textMuted }]}>
              Security Question
            </Text>
            <Text style={[styles.qText, { color: dark ? colors.textDark : colors.text }]}>{securityQuestion}</Text>
          </View>

          <TextInput
            label="Your Answer"
            mode="outlined"
            value={answer}
            onChangeText={setAnswer}
            outlineColor={dark ? '#334155' : '#E2E8F0'}
            activeOutlineColor={colors.accent}
            style={styles.input}
            theme={{ colors: { onSurfaceVariant: dark ? colors.textMutedDark : colors.textMuted } }}
          />

          <TextInput
            label="New Password"
            mode="outlined"
            secureTextEntry={!showPw}
            value={newPw}
            onChangeText={setNewPw}
            outlineColor={dark ? '#334155' : '#E2E8F0'}
            activeOutlineColor={colors.accent}
            style={styles.input}
            theme={{ colors: { onSurfaceVariant: dark ? colors.textMutedDark : colors.textMuted } }}
            right={
              <TextInput.Icon
                icon={showPw ? 'eye-off' : 'eye'}
                onPress={() => setShowPw((s) => !s)}
                color={dark ? colors.textMutedDark : colors.textMuted}
              />
            }
          />

          <TextInput
            label="Confirm New Password"
            mode="outlined"
            secureTextEntry={!showPw}
            value={confirmPw}
            onChangeText={setConfirmPw}
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
                {loading ? 'Resetting Password...' : 'Reset Password'}
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
  qCard: {
    borderLeftWidth: 4,
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.md,
  },
  qLabel: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  qText: { fontSize: 15, fontWeight: '700' },
  input: { marginBottom: spacing.sm, backgroundColor: 'transparent' },
  error: { color: colors.error, fontSize: 12, marginTop: spacing.xs, fontWeight: '600', marginLeft: 4 },
  btn: {
    marginTop: spacing.md,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
