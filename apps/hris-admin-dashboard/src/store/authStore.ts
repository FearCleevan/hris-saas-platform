import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Tenant } from '@/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

interface AuthStore {
  user: User | null;
  tenant: Tenant | null;
  isAuthenticated: boolean;
  isTwoFactorVerified: boolean;
  pendingEmail: string | null;
  darkMode: boolean;

  login: (user: User, skipTwoFactor?: boolean) => void;
  setPendingEmail: (email: string) => void;
  verifyTwoFactor: () => void;
  setTenant: (tenant: Tenant) => void;
  logout: () => void;
  toggleDarkMode: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      tenant: null,
      isAuthenticated: false,
      isTwoFactorVerified: false,
      pendingEmail: null,
      darkMode: false,

      login: (user, skipTwoFactor = false) =>
        set({
          user,
          isAuthenticated: true,
          isTwoFactorVerified: skipTwoFactor,
          pendingEmail: null,
        }),

      setPendingEmail: (email) => set({ pendingEmail: email }),

      verifyTwoFactor: () => set({ isTwoFactorVerified: true }),

      setTenant: (tenant) => set({ tenant }),

      logout: () => {
        // Sign out from Supabase if configured; always clear local state
        if (isSupabaseConfigured && supabase) {
          supabase.auth.signOut().catch(() => {});
        }
        set({
          user: null,
          tenant: null,
          isAuthenticated: false,
          isTwoFactorVerified: false,
          pendingEmail: null,
        });
        window.location.href = '/login';
      },

      toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
    }),
    {
      name: 'hrisph-auth',
      partialize: (state) => ({
        user: state.user,
        tenant: state.tenant,
        isAuthenticated: state.isAuthenticated,
        isTwoFactorVerified: state.isTwoFactorVerified,
        darkMode: state.darkMode,
      }),
    }
  )
);
