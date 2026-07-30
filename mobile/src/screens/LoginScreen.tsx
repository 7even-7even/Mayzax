import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity, Alert } from 'react-native';
import { TextInput, Button, Checkbox } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/hooks/useAuth';
import { useResolvedTheme } from '@/hooks/useThemeMode';
import { colors, spacing, typography } from '@/theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '@/navigation/RootNavigator';

const schema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const dark = useResolvedTheme() === 'dark';
  const { login } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const { control, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '', rememberMe: true },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      setSubmitting(true);
      await login(values.email.trim().toLowerCase(), values.password, values.rememberMe);
    } catch (e: any) {
      Alert.alert('Login failed', e?.message ?? 'Please check your credentials and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: dark ? '#0B1220' : colors.background }]} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          <View style={styles.logoWrap}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>M</Text>
            </View>
            <Text style={[styles.title, { color: dark ? colors.textDark : colors.text }]}>Mayzax</Text>
            <Text style={[styles.subtitle, { color: dark ? colors.textMutedDark : colors.textMuted }]}>
              Employee Companion
            </Text>
          </View>

          <View style={styles.form}>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  label="Email"
                  mode="outlined"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  autoComplete="email"
                  value={value}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  error={!!errors.email}
                  outlineColor={dark ? colors.borderDark : colors.border}
                  activeOutlineColor={colors.accent}
                  style={styles.input}
                  theme={{ colors: { onSurfaceVariant: dark ? colors.textMutedDark : colors.textMuted } }}
                />
              )}
            />
            {errors.email ? <Text style={styles.error}>{errors.email.message}</Text> : null}

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  label="Password"
                  mode="outlined"
                  secureTextEntry={!showPw}
                  textContentType="password"
                  autoComplete="password"
                  value={value}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  error={!!errors.password}
                  outlineColor={dark ? colors.borderDark : colors.border}
                  activeOutlineColor={colors.accent}
                  style={styles.input}
                  right={<TextInput.Icon icon={showPw ? 'eye-off' : 'eye'} onPress={() => setShowPw((s) => !s)} />}
                />
              )}
            />
            {errors.password ? <Text style={styles.error}>{errors.password.message}</Text> : null}

            <Controller
              control={control}
              name="rememberMe"
              render={({ field: { onChange, value } }) => (
                <View style={styles.row}>
                  <Checkbox
                    status={value ? 'checked' : 'unchecked'}
                    onPress={() => onChange(!value)}
                    color={colors.accent}
                  />
                  <Text style={[styles.rememberText, { color: dark ? colors.textDark : colors.text }]}>
                    Remember me
                  </Text>
                </View>
              )}
            />

            <Button
              mode="contained"
              onPress={handleSubmit(onSubmit)}
              loading={submitting}
              disabled={submitting}
              style={styles.loginBtn}
              buttonColor={colors.primary}
              contentStyle={{ paddingVertical: 6 }}
              labelStyle={{ fontSize: 16, fontWeight: '700' }}
            >
              {submitting ? 'Signing in...' : 'Sign In'}
            </Button>

            <TouchableOpacity style={styles.forgotWrap} onPress={() => navigation.navigate('ForgotPassword')}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: dark ? colors.textMutedDark : colors.textMuted }]}>
              By signing in, you agree to Mayzax's terms & privacy policy.
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, padding: spacing.xl, justifyContent: 'center' },
  logoWrap: { alignItems: 'center', marginBottom: spacing.xl },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  logoText: { color: '#fff', fontSize: 44, fontWeight: '800' },
  title: { ...typography.h2, fontSize: 28 },
  subtitle: { ...typography.body, marginTop: 2 },
  form: { marginTop: spacing.md },
  input: { marginBottom: spacing.sm, backgroundColor: 'transparent' },
  error: { color: colors.error, fontSize: 12, marginBottom: spacing.sm, marginLeft: 4 },
  row: { flexDirection: 'row', alignItems: 'center', marginVertical: spacing.xs },
  rememberText: { ...typography.body, marginLeft: 4 },
  loginBtn: { marginTop: spacing.md, borderRadius: 10 },
  forgotWrap: { marginTop: spacing.md, alignItems: 'center' },
  forgotText: { color: colors.accent, fontWeight: '600' },
  footer: { position: 'absolute', bottom: spacing.xl, left: spacing.xl, right: spacing.xl, alignItems: 'center' },
  footerText: { ...typography.small, textAlign: 'center' },
});
