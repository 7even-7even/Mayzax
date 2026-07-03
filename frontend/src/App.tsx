import { Routes, Route } from 'react-router-dom';
import LoginPage from '@/pages/auth/login-page';
import { AppShell } from '@/components/layout/app-shell';
import { ProtectedRoute } from '@/routes/protected-route';
import DashboardPage from '@/pages/dashboard/dashboard-page';
import AnalyticsPage from '@/pages/dashboard/analytics-page';
import RecruitersPage from '@/pages/recruiters/recruiters-page';
import ProfilesPage from '@/pages/profiles/profiles-page';
import ApplicationsPage from '@/pages/applications/applications-page';
import NotFoundPage from '@/pages/not-found-page';
import UnauthorizedPage from '@/pages/unauthorized-page';
import HomeRedirect from '@/pages/home-redirect';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<HomeRedirect />} />

          <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/recruiters" element={<RecruitersPage />} />
          </Route>

          <Route path="/profiles" element={<ProfilesPage />} />
          <Route path="/applications" element={<ApplicationsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
