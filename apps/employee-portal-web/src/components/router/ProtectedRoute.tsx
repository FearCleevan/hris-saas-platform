import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, user, loading, noEmployeeRecord, logout } = useAuth();
  const location = useLocation();

  // Session is still loading from storage — redirecting to /login here
  // would flash the login page on every refresh before the real session
  // has a chance to resolve.
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-blue/30 border-t-brand-blue rounded-full animate-spin" />
      </div>
    );
  }

  if (noEmployeeRecord) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
            This account isn&apos;t set up as an employee
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Your login was successful, but no employee record is linked to it. Contact your HR
            admin to get set up.
          </p>
          <button
            type="button"
            onClick={() => logout()}
            className="text-sm font-medium text-brand-blue hover:underline"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user?.mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  return <>{children}</>;
}
