import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

const SET_PASSWORD_PATH = '/set-password';

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
  const { isAuthenticated, isTwoFactorVerified, tenant, user } = useAuth();
  const location = useLocation();

  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Invited users never set a password (they arrive via a magic link) —
  // force them through /set-password before anything else, same priority
  // as requireAuth. Guard against a redirect loop on the page itself.
  if (isAuthenticated && user?.mustChangePassword && location.pathname !== SET_PASSWORD_PATH) {
    return <Navigate to={SET_PASSWORD_PATH} replace />;
  }

  if (requireTwoFactor && isAuthenticated && !isTwoFactorVerified) {
    return <Navigate to="/verify-2fa" replace />;
  }

  if (requireTenant && isTwoFactorVerified && !tenant) {
    return <Navigate to="/select-tenant" replace />;
  }

  return <>{children}</>;
}
