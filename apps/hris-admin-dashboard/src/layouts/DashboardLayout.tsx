import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sidebar } from '@/components/layout/Sidebar';
import { Navbar } from '@/components/layout/Navbar';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { NotificationDrawer } from '@/components/layout/NotificationDrawer';
import { GlobalSearch } from '@/components/layout/GlobalSearch';
import { AIChatWidget } from '@/components/ai/AIChatWidget';
import { CommandPalette } from '@/components/ui/CommandPalette';
import { useUIStore } from '@/store/uiStore';

export function DashboardLayout() {
  const { sidebarOpen } = useUIStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  // Track desktop breakpoint so framer-motion margin only applies on md+
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 768);

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen(v => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Close mobile menu on resize to desktop
  useEffect(() => {
    if (isDesktop) setMobileMenuOpen(false);
  }, [isDesktop]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex">
      <Sidebar mobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} />

      {/* On mobile: no left margin (sidebar is an overlay).
          On desktop: framer-motion animates margin to match sidebar width. */}
      <motion.div
        animate={{ marginLeft: isDesktop ? (sidebarOpen ? 240 : 64) : 0 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        className="flex-1 flex flex-col min-w-0"
      >
        <Navbar onMobileMenuClick={() => setMobileMenuOpen(true)} />

        <main className="flex-1 overflow-auto p-4 sm:p-5 lg:p-6">
          <Breadcrumbs />
          <Outlet />
        </main>
      </motion.div>

      {/* Global overlays */}
      <NotificationDrawer />
      <GlobalSearch />
      <AIChatWidget />
      <CommandPalette isOpen={cmdOpen} onClose={() => setCmdOpen(false)} />
    </div>
  );
}
