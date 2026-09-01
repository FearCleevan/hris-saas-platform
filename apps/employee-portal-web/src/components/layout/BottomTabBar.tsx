import { useLocation, NavLink } from 'react-router-dom';
import { Home, Clock, CalendarDays, Banknote, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/attendance', label: 'Attendance', icon: Clock },
  { path: '/leaves', label: 'Leaves', icon: CalendarDays },
  { path: '/payslip', label: 'Payslip', icon: Banknote },
] as const;

interface BottomTabBarProps {
  onMoreClick: () => void;
  moreActive: boolean;
}

// Primary mobile nav — 4 highest-frequency domains as real tabs, everything
// else (Expenses, Documents, Performance, Benefits, Notifications, Settings)
// lives one tap under "More" (MoreSheet) rather than crowding a 5th/6th/7th
// tab into a bar sized for a thumb, not a mouse.
export function BottomTabBar({ onMoreClick, moreActive }: BottomTabBarProps) {
  const location = useLocation();

  function isActive(path: string): boolean {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  }

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 pb-[env(safe-area-inset-bottom)]"
      aria-label="Primary"
    >
      <div className="grid grid-cols-5 h-16">
        {TABS.map((tab) => {
          const active = isActive(tab.path);
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.path}
              to={tab.path}
              className="flex flex-col items-center justify-center gap-1 min-w-0"
              aria-current={active ? 'page' : undefined}
            >
              <Icon
                size={22}
                className={cn(active ? 'text-brand-blue' : 'text-gray-400 dark:text-gray-500')}
              />
              <span
                className={cn(
                  'text-[10px] font-medium leading-none truncate max-w-full px-0.5',
                  active ? 'text-brand-blue' : 'text-gray-500 dark:text-gray-400',
                )}
              >
                {tab.label}
              </span>
            </NavLink>
          );
        })}

        <button
          type="button"
          onClick={onMoreClick}
          className="flex flex-col items-center justify-center gap-1 min-w-0"
          aria-haspopup="true"
          aria-expanded={moreActive}
        >
          <Menu size={22} className={cn(moreActive ? 'text-brand-blue' : 'text-gray-400 dark:text-gray-500')} />
          <span
            className={cn(
              'text-[10px] font-medium leading-none',
              moreActive ? 'text-brand-blue' : 'text-gray-500 dark:text-gray-400',
            )}
          >
            More
          </span>
        </button>
      </div>
    </nav>
  );
}
