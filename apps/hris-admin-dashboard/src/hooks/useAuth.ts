import { useAuthStore } from '@/store/authStore';
import type { UserRole } from '@/types';

export function useAuth() {
  const store = useAuthStore();

  function hasRole(role: UserRole): boolean {
    return store.user?.role === role;
  }

  function hasAnyRole(roles: UserRole[]): boolean {
    return roles.includes(store.user?.role as UserRole);
  }

  const isFullyAuthenticated =
    store.isAuthenticated && store.isTwoFactorVerified && store.tenant !== null;

  return {
    user: store.user,
    tenant: store.tenant,
    isAuthenticated: store.isAuthenticated,
    isTwoFactorVerified: store.isTwoFactorVerified,
    isFullyAuthenticated,
    darkMode: store.darkMode,
    hasRole,
    hasAnyRole,
    login: store.login,
    logout: store.logout,
    setTenant: store.setTenant,
    verifyTwoFactor: store.verifyTwoFactor,
    setPendingEmail: store.setPendingEmail,
    toggleDarkMode: store.toggleDarkMode,
  };
}
