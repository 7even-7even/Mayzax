import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { TextInput, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useResolvedTheme } from '@/hooks/useThemeMode';
import { colors, spacing } from '@/theme';
import * as authService from '@/services/auth';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '@/navigation/RootNavigator';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

export function ForgotPasswordScreen({ navigation }: Props) {
  const dark = useResolvedTheme() === 'dark';
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!email.trim()) {
      setError('Please enter your email');
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
        <Text style={[styles.title, { color: dark ? colors.textDark : colors.text }]}>Forgot Password</Text>
        <Text style={[styles.subtitle, { color: dark ? colors.textMutedDark : colors.textMuted }]}>
          Enter your email and we'll prompt you with your security question.
        </Text>
        <TextInput
          label="Email"
          mode="outlined"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
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
          Continue
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { padding: spacing.xl, flex: 1 },
  title: { fontSize: 26, fontWeight: '700', marginTop: spacing.lg },
  subtitle: { marginTop: spacing.sm, marginBottom: spacing.lg },
  input: { backgroundColor: 'transparent' },
  error: { color: colors.error, marginTop: spacing.sm },
});
