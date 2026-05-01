import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { EmployeeUser } from '@/types';

interface AuthStore {
  user: EmployeeUser | null;
  isAuthenticated: boolean;
  darkMode: boolean;

  login: (user: EmployeeUser) => void;
  logout: () => void;
  toggleDarkMode: () => void;
  markPasswordChanged: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      darkMode: false,

      login: (user) =>
        set({
          user,
          isAuthenticated: true,
        }),

      logout: () =>
        set({
          user: null,
          isAuthenticated: false,
        }),

      toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),

      markPasswordChanged: () =>
        set((state) => ({
          user: state.user ? { ...state.user, mustChangePassword: false } : null,
        })),
    }),
    {
      name: 'hrisph-employee-auth',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        darkMode: state.darkMode,
      }),
    }
  )
);
