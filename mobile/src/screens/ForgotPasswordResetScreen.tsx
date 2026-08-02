import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { TextInput, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useResolvedTheme } from '@/hooks/useThemeMode';
import { colors, spacing } from '@/theme';
import * as authService from '@/services/auth';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '@/navigation/RootNavigator';

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
    <SafeAreaView style={[styles.safe, { backgroundColor: dark ? '#0B1220' : colors.background }]}>
      <View style={styles.container}>
        <Button
          icon="arrow-left"
          mode="text"
          onPress={() => navigation.goBack()}
          textColor={dark ? colors.textDark : colors.text}
          style={{ alignSelf: 'flex-start' }}
        >
          Back
        </Button>
        <Text style={[styles.title, { color: dark ? colors.textDark : colors.text }]}>Reset Password</Text>
        <View style={styles.qCard}>
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
          outlineColor={dark ? colors.borderDark : colors.border}
          activeOutlineColor={colors.accent}
          style={styles.input}
        />
        <TextInput
          label="New Password"
          mode="outlined"
          secureTextEntry={!showPw}
          value={newPw}
          onChangeText={setNewPw}
          outlineColor={dark ? colors.borderDark : colors.border}
          activeOutlineColor={colors.accent}
          style={styles.input}
          right={<TextInput.Icon icon={showPw ? 'eye-off' : 'eye'} onPress={() => setShowPw((s) => !s)} />}
        />
        <TextInput
          label="Confirm New Password"
          mode="outlined"
          secureTextEntry={!showPw}
          value={confirmPw}
          onChangeText={setConfirmPw}
          outlineColor={dark ? colors.borderDark : colors.border}
          activeOutlineColor={colors.accent}
          style={styles.input}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button
          mode="contained"
          onPress={submit}
          loading={loading}
          disabled={loading}
          buttonColor={colors.primary}
          style={{ marginTop: spacing.md, borderRadius: 10 }}
          contentStyle={{ paddingVertical: 6 }}
        >
          Reset Password
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { padding: spacing.xl, flex: 1 },
  title: { fontSize: 26, fontWeight: '700', marginTop: spacing.md },
  qCard: {
    backgroundColor: 'rgba(19, 168, 158, 0.08)',
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
    padding: spacing.md,
    borderRadius: 8,
    marginVertical: spacing.md,
  },
  qLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  qText: { fontSize: 15, fontWeight: '600' },
  input: { marginTop: spacing.sm, backgroundColor: 'transparent' },
  error: { color: colors.error, marginTop: spacing.sm },
});
