import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity, Alert, Image } from 'react-native';
import { TextInput, Checkbox } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/hooks/useAuth';
import { useResolvedTheme } from '@/hooks/useThemeMode';
import { colors, spacing } from '@/theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '@/navigation/RootNavigator';
import { LinearGradient } from 'expo-linear-gradient';

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
    <SafeAreaView style={[styles.safe, { backgroundColor: dark ? '#0B1220' : '#F8FAFC' }]} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Subtle Decorative Ambient Background Glows */}
        <View style={[styles.glowTL, { backgroundColor: dark ? 'rgba(42, 93, 168, 0.15)' : 'rgba(42, 93, 168, 0.08)' }]} />
        <View style={[styles.glowBR, { backgroundColor: dark ? 'rgba(63, 156, 113, 0.15)' : 'rgba(63, 156, 113, 0.08)' }]} />

        <View style={styles.container}>
          <View style={styles.logoWrap}>
            <View style={[styles.logoCard, { backgroundColor: dark ? '#1e293b' : '#ffffff', shadowColor: dark ? '#000' : '#64748b' }]}>
              <Image
                source={require('../../assets/mayzax-logo.png')}
                style={{ width: 70, height: 70, borderRadius: 14 }}
                resizeMode="contain"
              />
            </View>
            <Text style={[styles.title, { color: dark ? colors.textDark : colors.text }]}>Mayzax</Text>
            <Text style={[styles.subtitle, { color: dark ? colors.textMutedDark : colors.textMuted }]}>
              Employee & Candidate Companion
            </Text>
          </View>

          <View style={[styles.card, { backgroundColor: dark ? '#131D31' : '#ffffff', borderColor: dark ? '#1E293B' : '#E2E8F0', shadowColor: dark ? '#000' : '#64748b' }]}>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  label="Email Address"
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
                  outlineColor={dark ? '#334155' : '#E2E8F0'}
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
              )}
            />
            {errors.password ? <Text style={styles.error}>{errors.password.message}</Text> : null}

            <View style={styles.actionsRow}>
              <Controller
                control={control}
                name="rememberMe"
                render={({ field: { onChange, value } }) => (
                  <TouchableOpacity style={styles.checkboxRow} onPress={() => onChange(!value)} activeOpacity={0.7}>
                    <Checkbox.Android
                      status={value ? 'checked' : 'unchecked'}
                      onPress={() => onChange(!value)}
                      color={colors.accent}
                      uncheckedColor={dark ? '#475569' : '#CBD5E1'}
                    />
                    <Text style={[styles.rememberText, { color: dark ? colors.textDark : colors.text }]}>
                      Remember me
                    </Text>
                  </TouchableOpacity>
                )}
              />

              <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')} activeOpacity={0.7}>
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={handleSubmit(onSubmit)}
              disabled={submitting}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#2A5DA8', '#3F9C71']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.loginBtn, submitting && { opacity: 0.7 }]}
              >
                <Text style={styles.loginBtnText}>
                  {submitting ? 'Signing in...' : 'Sign In'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: dark ? colors.textMutedDark : colors.textMuted }]}>
              Secure connection verified • Mayzax Solutions LLC.
            </Text>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 6 }}>
              <TouchableOpacity onPress={() => (navigation as any).navigate('Terms')} activeOpacity={0.7}>
                <Text style={{ fontSize: 12, color: colors.accent, fontWeight: '700', textDecorationLine: 'underline' }}>Terms & Conditions</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 12, color: dark ? colors.textMutedDark : colors.textMuted }}>•</Text>
              <TouchableOpacity onPress={() => (navigation as any).navigate('Privacy')} activeOpacity={0.7}>
                <Text style={{ fontSize: 12, color: colors.accent, fontWeight: '700', textDecorationLine: 'underline' }}>Privacy Policy</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, padding: spacing.lg, justifyContent: 'center' },
  glowTL: {
    position: 'absolute', top: -100, left: -100, width: 250, height: 250,
    borderRadius: 125,
  },
  glowBR: {
    position: 'absolute', bottom: -100, right: -100, width: 250, height: 250,
    borderRadius: 125,
  },
  logoWrap: { alignItems: 'center', marginBottom: spacing.xl },
  logoCard: {
    padding: spacing.sm,
    borderRadius: 22,
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    marginBottom: spacing.md,
  },
  title: { fontSize: 32, fontWeight: '900', letterSpacing: 0.5 },
  subtitle: { fontSize: 13, fontWeight: '600', marginTop: 4 },
  card: {
    borderRadius: 20,
    padding: spacing.lg,
    borderWidth: 1,
    elevation: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  input: { marginBottom: spacing.xs, backgroundColor: 'transparent' },
  error: { color: colors.error, fontSize: 11, marginBottom: spacing.sm, marginLeft: 4, fontWeight: '600' },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: spacing.sm,
  },
  checkboxRow: { flexDirection: 'row', alignItems: 'center' },
  rememberText: { fontSize: 13, fontWeight: '600' },
  forgotText: { color: colors.accent, fontSize: 13, fontWeight: '700' },
  loginBtn: {
    marginTop: spacing.md,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  footer: { position: 'absolute', bottom: spacing.lg, left: spacing.lg, right: spacing.lg, alignItems: 'center' },
  footerText: { fontSize: 11, fontWeight: '600', letterSpacing: 0.3 },
});
