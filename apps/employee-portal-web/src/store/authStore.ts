import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Identity/session now lives in AuthContext (backed by a real Supabase
// session) — this store holds only UI-only state that has nothing to do
// with who's signed in.
interface AuthStore {
  darkMode: boolean;
  toggleDarkMode: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      darkMode: false,
      toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
    }),
    {
      name: 'hrisph-employee-auth',
      partialize: (state) => ({ darkMode: state.darkMode }),
    }
  )
);
