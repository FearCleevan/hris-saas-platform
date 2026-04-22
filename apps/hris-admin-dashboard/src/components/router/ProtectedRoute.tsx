import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireTwoFactor?: boolean;
  requireTenant?: boolean;
}

export function ProtectedRoute({
  children,
  requireAuth = true,
  requireTwoFactor = true,
  requireTenant = true,
}: ProtectedRouteProps) {
  const { isAuthenticated, isTwoFactorVerified, tenant } = useAuth();
  const location = useLocation();

  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireTwoFactor && isAuthenticated && !isTwoFactorVerified) {
    return <Navigate to="/verify-2fa" replace />;
  }

  if (requireTenant && isTwoFactorVerified && !tenant) {
    return <Navigate to="/select-tenant" replace />;
  }

  return <>{children}</>;
}
