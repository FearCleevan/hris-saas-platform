import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIStore {
  sidebarOpen: boolean;
  notificationDrawerOpen: boolean;
  searchOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setNotificationDrawerOpen: (open: boolean) => void;
  setSearchOpen: (open: boolean) => void;
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      notificationDrawerOpen: false,
      searchOpen: false,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setNotificationDrawerOpen: (open) => set({ notificationDrawerOpen: open }),
      setSearchOpen: (open) => set({ searchOpen: open }),
    }),
    {
      name: 'hrisph-ui',
      partialize: (s) => ({ sidebarOpen: s.sidebarOpen }),
    }
  )
);
