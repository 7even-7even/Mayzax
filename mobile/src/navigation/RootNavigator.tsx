import React, { useEffect } from 'react';
import { NavigationContainer, DarkTheme as NavDark, DefaultTheme as NavLight } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CommonActions, StackActions, createNavigationContainerRef } from '@react-navigation/native';
import { useAuth } from '@/hooks/useAuth';
import { useResolvedTheme } from '@/hooks/useThemeMode';
import { colors } from '@/theme';

import { SplashScreen } from '@/screens/SplashScreen';
import { LoginScreen } from '@/screens/LoginScreen';
import { ForgotPasswordScreen } from '@/screens/ForgotPasswordScreen';
import { ForgotPasswordResetScreen } from '@/screens/ForgotPasswordResetScreen';
import { HomeScreen } from '@/screens/HomeScreen';
import { ActivityScreen } from '@/screens/ActivityScreen';
import { HistoryScreen } from '@/screens/HistoryScreen';
import { NotificationsScreen } from '@/screens/NotificationsScreen';
import { ProfileScreen } from '@/screens/ProfileScreen';
import { AttendanceDetailScreen } from '@/screens/AttendanceDetailScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { HelpScreen } from '@/screens/HelpScreen';
import { TermsScreen } from '@/screens/TermsScreen';
import { PrivacyScreen } from '@/screens/PrivacyScreen';
import { setNavigateHandler } from '@/features/notifications/push';

export type RootStackParamList = {
  Splash: undefined;
  Auth: undefined;
  Tabs: { screen?: keyof TabParamList; params?: any };
  AttendanceDetail: { date: string };
  Settings: undefined;
  Help: undefined;
  Home: undefined;
  Terms: undefined;
  Privacy: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  ForgotPassword: undefined;
  ForgotPasswordReset: { email: string; securityQuestion: string };
};

export type TabParamList = {
  HomeTab: undefined;
  ActivityTab: undefined;
  NotificationsTab: undefined;
  ProfileTab: undefined;
};

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <AuthStack.Screen name="ForgotPasswordReset" component={ForgotPasswordResetScreen} />
    </AuthStack.Navigator>
  );
}

function TabIcon({ name, color, size }: { name: any; color: string; size: number }) {
  return <MaterialCommunityIcons name={name} color={color} size={size} />;
}

function TabsNavigator() {
  const dark = useResolvedTheme() === 'dark';
  const { user: authUser } = useAuth();
  const isAdmin = authUser?.role === 'ADMIN';
  const isClient = authUser?.role === 'CLIENT';
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: dark ? colors.textMutedDark : colors.textMuted,
        tabBarStyle: {
          backgroundColor: dark ? colors.surfaceDark : colors.surface,
          borderTopColor: dark ? colors.borderDark : colors.border,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        headerStyle: { backgroundColor: dark ? colors.surfaceDark : colors.surface },
        headerTintColor: dark ? colors.textDark : colors.text,
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <TabIcon name="view-dashboard" color={color} size={size} />,
        }}
      />
      {!isClient && (
        <Tab.Screen
          name="ActivityTab"
          component={ActivityScreen}
          options={{
            title: isAdmin ? 'Analytics' : 'Today',
            tabBarIcon: ({ color, size }) => (
              <TabIcon name={isAdmin ? 'chart-areaspline' : 'timeline-clock'} color={color} size={size} />
            ),
          }}
        />
      )}
      <Tab.Screen
        name="NotificationsTab"
        component={NotificationsScreen}
        options={{
          title: 'Alerts',
          tabBarIcon: ({ color, size }) => <TabIcon name="bell-outline" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <TabIcon name="account-circle-outline" color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
}

export const navigationRef = createNavigationContainerRef<RootStackParamList>();
let pendingNav: { screen: string; params?: any } | null = null;

function mapTab(screen: string): keyof TabParamList {
  switch (screen) {
    case 'Today':
    case 'Activity': return 'ActivityTab';
    case 'Notifications': return 'NotificationsTab';
    case 'Profile': return 'ProfileTab';
    default: return 'HomeTab';
  }
}

function navigateToScreen(screen: string, params?: any) {
  if (!navigationRef.isReady()) {
    pendingNav = { screen, params };
    return;
  }
  try {
    switch (screen) {
      case 'Home':
      case 'Dashboard':
        navigationRef.dispatch(StackActions.popToTop());
        navigationRef.navigate('Tabs', { screen: 'HomeTab' });
        break;
      case 'Today':
      case 'Activity':
      case 'Notifications':
      case 'Profile':
        navigationRef.navigate('Tabs', { screen: mapTab(screen) });
        break;
      case 'AttendanceDetail':
        if (params?.date) {
          navigationRef.navigate('AttendanceDetail', { date: params.date });
        }
        break;
      case 'Settings':
        navigationRef.navigate('Settings');
        break;
      case 'Help':
        navigationRef.navigate('Help');
        break;
      default:
        break;
    }
  } catch {
    // ignore navigation errors during startup
  }
}

export function RootNavigator() {
  const { status } = useAuth();
  const dark = useResolvedTheme() === 'dark';

  const navTheme = dark
    ? { ...NavDark, colors: { ...NavDark.colors, background: '#0B1220', card: colors.surfaceDark, text: colors.textDark, primary: colors.accent, border: colors.borderDark } }
    : { ...NavLight, colors: { ...NavLight.colors, background: colors.background, card: colors.surface, text: colors.text, primary: colors.primary, border: colors.border } };

  useEffect(() => {
    setNavigateHandler((screen, params) => navigateToScreen(screen, params));
    return () => setNavigateHandler(() => {});
  }, []);

  return (
    <NavigationContainer
      ref={navigationRef}
      theme={navTheme}
      onReady={() => {
        if (pendingNav) {
          navigateToScreen(pendingNav.screen, pendingNav.params);
          pendingNav = null;
        }
      }}
    >
      <RootStack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: dark ? colors.surfaceDark : colors.surface },
          headerTintColor: dark ? colors.textDark : colors.text,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: dark ? '#0B1220' : colors.background },
        }}
      >
        {status === 'loading' ? (
          <RootStack.Screen name="Splash" component={SplashScreen} options={{ headerShown: false }} />
        ) : (
          <>
            {status === 'unauthenticated' ? (
              <RootStack.Screen name="Auth" component={AuthNavigator} options={{ headerShown: false }} />
            ) : (
              <>
                <RootStack.Screen name="Tabs" component={TabsNavigator} options={{ headerShown: false }} />
                <RootStack.Screen name="AttendanceDetail" component={AttendanceDetailScreen} options={{ title: 'Attendance Details' }} />
                <RootStack.Screen name="Settings" component={SettingsScreen} options={{ headerShown: false, presentation: 'modal' }} />
                <RootStack.Screen name="Help" component={HelpScreen} options={{ headerShown: false, presentation: 'modal' }} />
              </>
            )}
            <RootStack.Screen name="Terms" component={TermsScreen} options={{ headerShown: false, presentation: 'modal' }} />
            <RootStack.Screen name="Privacy" component={PrivacyScreen} options={{ headerShown: false, presentation: 'modal' }} />
          </>
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

(Text as any).displayName = 'Text';
