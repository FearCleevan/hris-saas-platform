import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/uiStore';
import { useAuth } from '@/hooks/useAuth';
import { navSections } from './navConfig';
import type { NavItem } from './navConfig';

const SIDEBAR_W = 240;
const COLLAPSED_W = 64;

interface SidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
}

function NavItemRow({ item, collapsed, onClick }: { item: NavItem; collapsed: boolean; onClick?: () => void }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));

  return (
    <button
      type="button"
      title={collapsed ? item.label : undefined}
      onClick={() => { navigate(item.path); onClick?.(); }}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 group cursor-pointer',
        isActive
          ? 'bg-[#0038a8]/10 text-[#0038a8] dark:bg-[#0038a8]/20 dark:text-blue-400'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100',
        collapsed && 'justify-center px-2'
      )}
    >
      <item.icon
        className={cn(
          'shrink-0 transition-colors',
          collapsed ? 'w-5 h-5' : 'w-4 h-4',
          isActive ? 'text-[#0038a8] dark:text-blue-400' : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'
        )}
      />
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.15 }}
            className="truncate overflow-hidden whitespace-nowrap"
          >
            {item.label}
          </motion.span>
        )}
      </AnimatePresence>
      {!collapsed && item.badge && (
        <span className="ml-auto text-[10px] font-bold bg-[#ce1126] text-white px-1.5 py-0.5 rounded-full">
          {item.badge}
        </span>
      )}
    </button>
  );
}

function SidebarContent({ collapsed, onItemClick }: { collapsed: boolean; onItemClick?: () => void }) {
  const { user } = useAuth();

  const visibleSections = navSections.map((section) => ({
    ...section,
    items: section.items.filter(
      (item) => !item.roles || item.roles.includes(user?.role as string as Parameters<typeof item.roles.includes>[0])
    ),
  })).filter((section) => section.items.length > 0);

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-2">
      {visibleSections.map((section) => (
        <div key={section.label || 'main'} className="mb-2">
          <AnimatePresence initial={false}>
            {!collapsed && section.label && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1 }}
                className="px-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-600"
              >
                {section.label}
              </motion.p>
            )}
          </AnimatePresence>
          {collapsed && section.label && (
            <div className="my-2 mx-3 h-px bg-gray-100 dark:bg-gray-800" />
          )}
          <div className="flex flex-col gap-0.5">
            {section.items.map((item) => (
              <NavItemRow key={item.path} item={item} collapsed={collapsed} onClick={onItemClick} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const { sidebarOpen, toggleSidebar } = useUIStore();

  return (
    <>
      {/* Desktop sidebar */}
      <motion.aside
        animate={{ width: sidebarOpen ? SIDEBAR_W : COLLAPSED_W }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        className="hidden md:flex flex-col h-screen bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 fixed left-0 top-0 z-30 shrink-0"
      >
        {/* Logo */}
        <div className={cn('flex items-center h-16 px-4 border-b border-gray-100 dark:border-gray-800 shrink-0', !sidebarOpen && 'justify-center')}>
          <div className="w-7 h-7 rounded-lg bg-[#0038a8] flex items-center justify-center shrink-0">
            <span className="text-white font-extrabold text-xs">H</span>
          </div>
          <AnimatePresence initial={false}>
            {sidebarOpen && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.15 }}
                className="ml-2.5 font-extrabold text-gray-900 dark:text-white text-sm whitespace-nowrap overflow-hidden"
              >
                HRISPH Admin
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <SidebarContent collapsed={!sidebarOpen} />

        {/* Collapse toggle */}
        <div className="p-3 border-t border-gray-100 dark:border-gray-800">
          <button
            type="button"
            onClick={toggleSidebar}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300 transition-colors cursor-pointer',
              !sidebarOpen && 'justify-center'
            )}
            title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {sidebarOpen ? (
              <>
                <ChevronLeft className="w-4 h-4 shrink-0" />
                <span>Collapse</span>
              </>
            ) : (
              <ChevronRight className="w-4 h-4 shrink-0" />
            )}
          </button>
        </div>
      </motion.aside>

      {/* Mobile sidebar — overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50 md:hidden"
              onClick={onMobileClose}
            />
            <motion.aside
              initial={{ x: -SIDEBAR_W }}
              animate={{ x: 0 }}
              exit={{ x: -SIDEBAR_W }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed left-0 top-0 z-50 h-screen w-60 bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 flex flex-col md:hidden"
            >
              <div className="flex items-center justify-between h-16 px-4 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[#0038a8] flex items-center justify-center">
                    <span className="text-white font-extrabold text-xs">H</span>
                  </div>
                  <span className="font-extrabold text-gray-900 dark:text-white text-sm">HRISPH Admin</span>
                </div>
                <button type="button" onClick={onMobileClose} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <SidebarContent collapsed={false} onItemClick={onMobileClose} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
