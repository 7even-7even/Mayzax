import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Application from 'expo-application';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, typography } from '@/theme';

const { width: W, height: H } = Dimensions.get('window');

// ─── Individual floating particle ────────────────────────────────────────────
function Particle({ x, y, size, delay, duration }: { x: number; y: number; size: number; delay: number; duration: number }) {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0.1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay * 1000),
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: -H * 0.25,
            duration: duration * 1000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(opacity, {
              toValue: 0.45,
              duration: (duration / 2) * 1000,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0.05,
              duration: (duration / 2) * 1000,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ]),
        ]),
      ]),
    ).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          left: x * W,
          top: y * H,
          width: size,
          height: size,
          borderRadius: size / 2,
          opacity,
          transform: [{ translateY }],
        },
      ]}
    />
  );
}

// ─── Rotating ambient glow ────────────────────────────────────────────────────
function AmbientGlow({ style }: { style?: object }) {
  const scale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.15,
          duration: 3500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0.9,
          duration: 3500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  return <Animated.View style={[style, { transform: [{ scale }] }]} />;
}

// ─── Particles config ─────────────────────────────────────────────────────────
const PARTICLES = [
  { x: 0.08, y: 0.65, size: 5, delay: 0, duration: 6 },
  { x: 0.22, y: 0.45, size: 3, delay: 0.8, duration: 5 },
  { x: 0.55, y: 0.72, size: 6, delay: 1.5, duration: 7 },
  { x: 0.75, y: 0.38, size: 4, delay: 0.3, duration: 5.5 },
  { x: 0.88, y: 0.60, size: 3, delay: 2.1, duration: 6.5 },
  { x: 0.35, y: 0.80, size: 5, delay: 1.0, duration: 8 },
  { x: 0.65, y: 0.55, size: 4, delay: 0.6, duration: 5 },
  { x: 0.12, y: 0.30, size: 3, delay: 1.8, duration: 7 },
  { x: 0.50, y: 0.20, size: 5, delay: 0.4, duration: 6 },
  { x: 0.82, y: 0.78, size: 4, delay: 2.4, duration: 5.5 },
  { x: 0.43, y: 0.92, size: 3, delay: 0.9, duration: 7.5 },
  { x: 0.92, y: 0.15, size: 5, delay: 1.3, duration: 6 },
];

// ─── Main SplashScreen ────────────────────────────────────────────────────────
export function SplashScreen() {
  // Logo reveal
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoTranslateY = useRef(new Animated.Value(-12)).current;

  // Title reveal
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(18)).current;

  // Subtitle reveal
  const subtitleOpacity = useRef(new Animated.Value(0)).current;

  // Badge reveal
  const badgeOpacity = useRef(new Animated.Value(0)).current;

  // Status dot pulse
  const dotScale = useRef(new Animated.Value(0.8)).current;
  const dotOpacity = useRef(new Animated.Value(0.6)).current;

  // Tagline cards stagger
  const card1Opacity = useRef(new Animated.Value(0)).current;
  const card2Opacity = useRef(new Animated.Value(0)).current;
  const card3Opacity = useRef(new Animated.Value(0)).current;
  const card1Y = useRef(new Animated.Value(10)).current;
  const card2Y = useRef(new Animated.Value(10)).current;
  const card3Y = useRef(new Animated.Value(10)).current;

  const version = Application.nativeApplicationVersion
    ? `ATS v${Application.nativeApplicationVersion}`
    : 'ATS v1.1';

  useEffect(() => {
    // Step 1: Logo
    Animated.parallel([
      Animated.timing(logoOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(logoTranslateY, { toValue: 0, duration: 500, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();

    // Step 2: Title (delay 200ms)
    Animated.delay(200).start(() => {
      Animated.parallel([
        Animated.timing(titleOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(titleTranslateY, { toValue: 0, duration: 600, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]).start();
    });

    // Step 3: Subtitle + badge
    Animated.delay(500).start(() => {
      Animated.parallel([
        Animated.timing(subtitleOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(badgeOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]).start();
    });

    // Step 4: Cards stagger
    Animated.delay(700).start(() => {
      Animated.stagger(120, [
        Animated.parallel([
          Animated.timing(card1Opacity, { toValue: 1, duration: 450, useNativeDriver: true }),
          Animated.timing(card1Y, { toValue: 0, duration: 450, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(card2Opacity, { toValue: 1, duration: 450, useNativeDriver: true }),
          Animated.timing(card2Y, { toValue: 0, duration: 450, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(card3Opacity, { toValue: 1, duration: 450, useNativeDriver: true }),
          Animated.timing(card3Y, { toValue: 0, duration: 450, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        ]),
      ]).start();
    });

    // Status dot pulse loop
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(dotScale, { toValue: 1.5, duration: 800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(dotOpacity, { toValue: 0.2, duration: 800, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(dotScale, { toValue: 0.8, duration: 800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(dotOpacity, { toValue: 0.8, duration: 800, useNativeDriver: true }),
        ]),
      ]),
    ).start();
  }, []);

  const cardAnims = [
    { opacity: card1Opacity, translateY: card1Y, icon: '🛡️', label: 'Enterprise', sub: 'JWT rotation' },
    { opacity: card2Opacity, translateY: card2Y, icon: '⚡', label: 'Real-time', sub: 'Live updates' },
    { opacity: card3Opacity, translateY: card3Y, icon: '✨', label: 'Intelligent', sub: 'IST shift logic' },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient
        colors={['#2A5DA8', '#347F80', '#3F9C71']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Ambient glows (web-inspired) */}
      <AmbientGlow style={styles.glowTopLeft} />
      <AmbientGlow style={styles.glowBottomRight} />

      {/* Subtle overlay */}
      <View style={styles.darkOverlay} />

      {/* Floating particles */}
      {PARTICLES.map((p, i) => (
        <Particle key={i} {...p} />
      ))}

      {/* ─── Brand header (top section) ─── */}
      <Animated.View
        style={[
          styles.brandRow,
          { opacity: logoOpacity, transform: [{ translateY: logoTranslateY }] },
        ]}
      >
        {/* Logo with status dot */}
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/mayzax-logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Animated.View
            style={[
              styles.statusDot,
              { transform: [{ scale: dotScale }], opacity: dotOpacity },
            ]}
          />
        </View>

        <Text style={styles.brandName}>Mayzax Solutions</Text>

        <Animated.View style={[styles.badge, { opacity: badgeOpacity }]}>
          <Text style={styles.badgeText}>{version}</Text>
        </Animated.View>
      </Animated.View>

      {/* ─── Center content ─── */}
      <View style={styles.center}>
        {/* Tagline */}
        <Animated.View style={{ opacity: titleOpacity, transform: [{ translateY: titleTranslateY }] }}>
          <Text style={styles.tagline}>
            Where talent{'\n'}
            <Text style={styles.taglineHighlight}>meets opportunity</Text>
          </Text>
        </Animated.View>

        <Animated.Text style={[styles.subtitle, { opacity: subtitleOpacity }]}>
          Employee Companion App
        </Animated.Text>

        {/* Feature cards row */}
        <View style={styles.cardRow}>
          {cardAnims.map((c, i) => (
            <Animated.View
              key={i}
              style={[
                styles.featureCard,
                { opacity: c.opacity, transform: [{ translateY: c.translateY }] },
              ]}
            >
              <Text style={styles.cardIcon}>{c.icon}</Text>
              <Text style={styles.cardLabel}>{c.label}</Text>
              <Text style={styles.cardSub}>{c.sub}</Text>
            </Animated.View>
          ))}
        </View>
      </View>

      {/* ─── Footer ─── */}
      <View style={styles.footer}>
        <View style={styles.footerLine} />
        <Text style={styles.footerText}>Powered by Mayzax ATS</Text>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  glowTopLeft: {
    position: 'absolute',
    top: -80,
    left: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  glowBottomRight: {
    position: 'absolute',
    bottom: -60,
    right: -60,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(63,156,113,0.22)',
  },
  particle: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.6)',
  },

  // Brand header row
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    gap: 10,
  },
  logoContainer: {
    position: 'relative',
  },
  logo: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  statusDot: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: '#34d399',
    borderWidth: 2,
    borderColor: '#2A5DA8',
  },
  brandName: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.92)',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.80)',
    letterSpacing: 1,
  },

  // Center
  center: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  tagline: {
    fontSize: 40,
    fontWeight: '800',
    color: '#fff',
    lineHeight: 46,
    letterSpacing: -0.5,
  },
  taglineHighlight: {
    color: 'rgba(255,255,255,0.72)',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.62)',
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },

  // Feature cards
  cardRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  featureCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 14,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
  },
  cardIcon: {
    fontSize: 22,
    marginBottom: 4,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  cardSub: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
    marginTop: 2,
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  footerLine: {
    width: 40,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginBottom: spacing.sm,
  },
  footerText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.40)',
    letterSpacing: 1.2,
  },
});
