import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sidebar } from '@/components/layout/Sidebar';
import { Navbar } from '@/components/layout/Navbar';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { NotificationDrawer } from '@/components/layout/NotificationDrawer';
import { GlobalSearch } from '@/components/layout/GlobalSearch';
import { useUIStore } from '@/store/uiStore';

export function DashboardLayout() {
  const { sidebarOpen } = useUIStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex">
      <Sidebar mobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} />

      {/* Main content shifts right on desktop to accommodate sidebar */}
      <motion.div
        animate={{ marginLeft: sidebarOpen ? 240 : 64 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        className="flex-1 flex flex-col min-w-0 md:ml-16"
      >
        <Navbar onMobileMenuClick={() => setMobileMenuOpen(true)} />

        <main className="flex-1 overflow-auto p-5 sm:p-6">
          <Breadcrumbs />
          <Outlet />
        </main>
      </motion.div>

      {/* Global overlays */}
      <NotificationDrawer />
      <GlobalSearch />
    </div>
  );
}
