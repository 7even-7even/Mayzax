import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Application from 'expo-application';
import { colors, spacing, typography } from '@/theme';

export function SplashScreen() {
  const fadeAnim = React.useRef(new Animated.Value(0.3)).current;
  const scaleAnim = React.useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(fadeAnim, { toValue: 1, duration: 800, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(scaleAnim, { toValue: 1.05, duration: 800, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(fadeAnim, { toValue: 0.4, duration: 800, easing: Easing.in(Easing.quad), useNativeDriver: true }),
          Animated.timing(scaleAnim, { toValue: 0.95, duration: 800, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        ]),
      ]),
    ).start();
  }, [fadeAnim, scaleAnim]);

  const version = Application.nativeApplicationVersion
    ? `v${Application.nativeApplicationVersion}${Application.nativeBuildVersion ? ` (${Application.nativeBuildVersion})` : ''}`
    : 'v1.0.0';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.center}>
        <Animated.View style={[{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }, styles.logoWrap]}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>M</Text>
          </View>
        </Animated.View>
        <Text style={styles.title}>Mayzax</Text>
        <Text style={styles.subtitle}>Employee Companion</Text>
      </View>
      <View style={styles.footer}>
        <Text style={styles.version}>{version}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrap: {
    marginBottom: spacing.xl,
  },
  logoCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  logoText: {
    fontSize: 64,
    fontWeight: '800',
    color: colors.primary,
  },
  title: {
    ...typography.h1,
    color: '#fff',
    fontSize: 32,
    letterSpacing: 0.5,
  },
  subtitle: {
    color: '#B8C8E3',
    marginTop: 4,
    fontSize: 16,
    fontWeight: '500',
  },
  footer: {
    paddingVertical: spacing.lg,
  },
  version: {
    color: '#8FA4C6',
    fontSize: 12,
    letterSpacing: 1,
  },
});
