import { useEffect, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Routes, Route } from 'react-router-dom';
import LoginPage from '@/pages/auth/login-page';
import SignupPage from '@/pages/auth/signup-page';
import ForgotPasswordPage from '@/pages/auth/forgot-password-page';
import { AppShell } from '@/components/layout/app-shell';
import { ProtectedRoute } from '@/routes/protected-route';
import DashboardPage from '@/pages/dashboard/dashboard-page';
import RecruiterDashboardPage from '@/pages/dashboard/recruiter-dashboard-page';
import AnalyticsPage from '@/pages/dashboard/analytics-page';
import RecruitersPage from '@/pages/recruiters/recruiters-page';
import ProfilesPage from '@/pages/profiles/profiles-page';
import ProfilePage from '@/pages/profile/profile-page';
import ApplicationsPage from '@/pages/applications/applications-page';
import UpdatesPage from '@/pages/updates/updates-page';
import NotFoundPage from '@/pages/not-found-page';
import UnauthorizedPage from '@/pages/unauthorized-page';
import HomeRedirect from '@/pages/home-redirect';
import { MayzaxIntro } from '@/components/shared/mayzax-intro';

export default function App() {
  const [showIntro, setShowIntro] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !window.sessionStorage.getItem('mayzax-intro-seen');
  });
  const hideTimerRef = useRef<ReturnType<typeof setTimeout>>();

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
    <>
      <AnimatePresence mode="popLayout">
        {showIntro && <MayzaxIntro key="intro" onComplete={handleIntroComplete} />}
      </AnimatePresence>

      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/" element={<HomeRedirect />} />

            <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'TEAM_LEADER']} />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/recruiters" element={<RecruitersPage />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['RECRUITER']} />}>
              <Route path="/recruiter-dashboard" element={<RecruiterDashboardPage />} />
            </Route>

            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/profiles" element={<ProfilesPage />} />
            <Route path="/applications" element={<ApplicationsPage />} />
            <Route path="/updates" element={<UpdatesPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}
