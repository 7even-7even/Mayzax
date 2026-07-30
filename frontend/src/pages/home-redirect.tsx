import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/auth-context';
import { FullPageLoader } from '@/components/shared/full-page-loader';
export default function HomeRedirect() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <FullPageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'ADMIN' || user.role === 'TEAM_LEADER') {
    return <Navigate to="/dashboard" replace />;
  } else if (user.role === 'RESUME_ASSIST' || user.role === 'SALES_EXEC') {
    return <Navigate to="/companion-dashboard" replace />;
  } else {
    return <Navigate to="/recruiter-dashboard" replace />;
  }
}
