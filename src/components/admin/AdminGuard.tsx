import { Navigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';

interface AdminGuardProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'staff';
}

export default function AdminGuard({ children, requiredRole = 'admin' }: AdminGuardProps) {
  const { session } = useApp();

  if (!session?.twoFactorVerified) {
    return <Navigate to="/admin/login" replace />;
  }

  if (requiredRole === 'admin' && session.role !== 'admin') {
    return <Navigate to="/staff" replace />;
  }

  return <>{children}</>;
}
