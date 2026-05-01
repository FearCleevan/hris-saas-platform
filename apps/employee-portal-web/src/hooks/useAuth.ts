import { useAuthStore } from '@/store/authStore';
import type { EmployeeUser } from '@/types';

type EmployeeRole = EmployeeUser['role'];

export function useAuth() {
  const store = useAuthStore();

  function hasRole(role: EmployeeRole): boolean {
    return store.user?.role === role;
  }

  function hasAnyRole(roles: EmployeeRole[]): boolean {
    return roles.includes(store.user?.role as EmployeeRole);
  }

  return {
    user: store.user,
    isAuthenticated: store.isAuthenticated,
    darkMode: store.darkMode,
    hasRole,
    hasAnyRole,
    login: store.login,
    logout: store.logout,
    toggleDarkMode: store.toggleDarkMode,
    markPasswordChanged: store.markPasswordChanged,
  };
}
