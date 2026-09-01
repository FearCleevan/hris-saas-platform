import { useAuthContext } from '@/context/AuthContext';
import { useAuthStore } from '@/store/authStore';
import type { EmployeeUser } from '@/types';

type EmployeeRole = EmployeeUser['role'];

export function useAuth() {
  const { user, isAuthenticated, loading, noEmployeeRecord, login, logout } = useAuthContext();
  const { darkMode, toggleDarkMode } = useAuthStore();

  function hasRole(role: EmployeeRole): boolean {
    return user?.role === role;
  }

  function hasAnyRole(roles: EmployeeRole[]): boolean {
    return roles.includes(user?.role as EmployeeRole);
  }

  return {
    user,
    isAuthenticated,
    loading,
    noEmployeeRecord,
    darkMode,
    hasRole,
    hasAnyRole,
    login,
    logout,
    toggleDarkMode,
  };
}
