import { useEffect, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Routes, Route } from 'react-router-dom';
import LoginPage from '@/pages/auth/login-page';
import ClientLoginPage from '@/pages/auth/client-login-page';
import SignupPage from '@/pages/auth/signup-page';
import ForgotPasswordPage from '@/pages/auth/forgot-password-page';
import { AppShell } from '@/components/layout/app-shell';
import { ProtectedRoute } from '@/routes/protected-route';
import DashboardPage from '@/pages/dashboard/dashboard-page';
import RecruiterDashboardPage from '@/pages/dashboard/recruiter-dashboard-page';
import ClientDashboardPage from '@/pages/dashboard/client-dashboard-page';
import AnalyticsPage from '@/pages/dashboard/analytics-page';
import RecruitersPage from '@/pages/recruiters/recruiters-page';
import ProfilesPage from '@/pages/profiles/profiles-page';
import ProfilePage from '@/pages/profile/profile-page';
import ApplicationsPage from '@/pages/applications/applications-page';
import ActivityTrackingPage from '@/pages/activity/activity-tracking-page';
import UpdatesPage from '@/pages/updates/updates-page';
import NotFoundPage from '@/pages/not-found-page';
import UnauthorizedPage from '@/pages/unauthorized-page';
import HomeRedirect from '@/pages/home-redirect';
import { MayzaxIntro } from '@/components/shared/mayzax-intro';
import { ErrorBoundary } from '@/components/shared/error-boundary';
import OnboardPage from '@/pages/onboard/onboard-page';
import AdminOnboardingPage from '@/pages/onboard/admin-onboarding-page';
import TermsPage from '@/pages/legal/terms-page';
import PrivacyPage from '@/pages/legal/privacy-page';
import { apiClient } from '@/lib/api-client';
import { initializeShiftConfig } from '@/lib/businessDate';

export default function App() {
  const [showIntro, setShowIntro] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !window.sessionStorage.getItem('mayzax-intro-seen');
  });
  const hideTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Load shift config from backend env
  useEffect(() => {
    apiClient.get('/shifts/config')
      .then(({ data }) => {
        if (data.success && data.data) {
          initializeShiftConfig(data.data);
        }
      })
      .catch((err) => {
        console.error('Failed to load business shift configuration from backend:', err);
      });
  }, []);

  useEffect(() => {
    if (!showIntro) return;

    const fallbackTimer = setTimeout(() => {
      window.sessionStorage.setItem('mayzax-intro-seen', 'true');
      setShowIntro(false);
    }, 5000);

    return () => {
      clearTimeout(fallbackTimer);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [showIntro]);

  const handleIntroComplete = () => {
    hideTimerRef.current = setTimeout(() => {
      window.sessionStorage.setItem('mayzax-intro-seen', 'true');
      setShowIntro(false);
    }, 2000);
  };

  return (
    <ErrorBoundary>
      <AnimatePresence mode="popLayout">
        {showIntro && <MayzaxIntro key="intro" onComplete={handleIntroComplete} />}
      </AnimatePresence>

      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/client-login" element={<ClientLoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route path="/onboard" element={<OnboardPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/" element={<HomeRedirect />} />

            <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'TEAM_LEADER']} />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/recruiters" element={<RecruitersPage />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['RECRUITER', 'RESUME_ASSIST', 'SALES_EXEC']} />}>
              <Route path="/recruiter-dashboard" element={<RecruiterDashboardPage />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['CLIENT']} />}>
              <Route path="/client-dashboard" element={<ClientDashboardPage />} />
            </Route>

            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/profiles" element={<ProfilesPage />} />
            <Route path="/applications" element={<ApplicationsPage />} />
            <Route path="/activity" element={<ActivityTrackingPage />} />
            <Route path="/updates" element={<UpdatesPage />} />
            <Route path="/admin/onboarding" element={<AdminOnboardingPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </ErrorBoundary>
  );
}
