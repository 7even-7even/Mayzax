import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/auth-context';
import { FullPageLoader } from '@/components/shared/full-page-loader';

export default function HomeRedirect() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <FullPageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'ADMIN' ? '/dashboard' : '/applications'} replace />;
}
