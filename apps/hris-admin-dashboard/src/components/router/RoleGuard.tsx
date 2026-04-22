import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import type { UserRole } from '@/types';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  fallback?: string;
}

export function RoleGuard({ children, allowedRoles, fallback = '/' }: RoleGuardProps) {
  const { hasAnyRole } = useAuth();

  if (!hasAnyRole(allowedRoles)) {
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
}
