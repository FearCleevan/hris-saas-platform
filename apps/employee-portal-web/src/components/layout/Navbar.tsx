import { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Menu, Bell, Sun, Moon, LogOut, User, ChevronDown } from 'lucide-react';
import { navItems } from './navConfig';
import { useAuthStore } from '@/store/authStore';
import notificationsData from '@/data/mock/notifications.json';

interface NavbarProps {
  onMenuClick: () => void;
}

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
}

const notifications = notificationsData as Notification[];

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getPageTitle(pathname: string): string {
  if (pathname === '/') return 'Home';
  const match = navItems.find((item) => item.path !== '/' && pathname.startsWith(item.path));
  return match?.label ?? 'Employee Portal';
}

function formatNotifTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

export function Navbar({ onMenuClick }: NavbarProps) {
  const location = useLocation();
  const { user, darkMode, toggleDarkMode, logout } = useAuthStore();
  const [bellOpen, setBellOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  const unread = notifications.filter((n) => !n.read).length;
  const recentNotifs = notifications.slice(0, 3);
  const pageTitle = getPageTitle(location.pathname);

  return (
    <header className="sticky top-0 z-10 h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center px-4 gap-3">
      <button
        type="button"
        onClick={onMenuClick}
        className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        aria-label="Open menu"
      >
        <Menu size={18} />
      </button>

      <span className="flex-1 font-semibold text-gray-900 dark:text-white text-sm md:text-base text-center md:text-left">
        {pageTitle}
      </span>

      <div className="flex items-center gap-1.5">
        <div className="relative">
          <button
            type="button"
            onClick={() => { setBellOpen((v) => !v); setUserOpen(false); }}
            className="relative w-9 h-9 flex items-center justify-center rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label={`Notifications (${unread} unread)`}
          >
            <Bell size={18} />
            {unread > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-brand-red text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unread}
              </span>
            )}
          </button>

          {bellOpen && (
            <div className="absolute right-0 top-11 w-80 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                <p className="font-semibold text-sm text-gray-900 dark:text-white">Notifications</p>
              </div>
              <ul>
                {recentNotifs.map((n) => (
                  <li
                    key={n.id}
                    className={[
                      'px-4 py-3 border-b border-gray-50 dark:border-gray-800 last:border-0',
                      !n.read ? 'bg-brand-blue-light dark:bg-gray-800' : '',
                    ].join(' ')}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-gray-900 dark:text-white leading-snug">{n.title}</p>
                      <span className="text-[10px] text-gray-400 shrink-0 mt-0.5">{formatNotifTime(n.time)}</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{n.message}</p>
                  </li>
                ))}
              </ul>
              <div className="px-4 py-2.5 text-center">
                <Link
                  to="/notifications"
                  onClick={() => setBellOpen(false)}
                  className="text-xs font-medium text-brand-blue hover:underline"
                >
                  View all notifications
                </Link>
              </div>
            </div>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => { setUserOpen((v) => !v); setBellOpen(false); }}
            className="flex items-center gap-2 px-2 py-1 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="User menu"
          >
            <div className="w-7 h-7 rounded-full bg-brand-blue flex items-center justify-center">
              <span className="text-white text-[10px] font-bold">{user ? getInitials(user.name) : 'U'}</span>
            </div>
            <span className="hidden sm:block text-sm font-medium text-gray-700 dark:text-gray-300 max-w-[120px] truncate">
              {user?.name}
            </span>
            <ChevronDown size={14} className="text-gray-400 hidden sm:block" />
          </button>

          {userOpen && (
            <div className="absolute right-0 top-11 w-52 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl z-50 overflow-hidden py-1">
              <Link
                to="/profile"
                onClick={() => setUserOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <User size={15} />
                My Profile
              </Link>
              <button
                type="button"
                onClick={() => { toggleDarkMode(); setUserOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                {darkMode ? <Sun size={15} /> : <Moon size={15} />}
                {darkMode ? 'Light Mode' : 'Dark Mode'}
              </button>
              <div className="border-t border-gray-100 dark:border-gray-800 my-1" />
              <button
                type="button"
                onClick={() => { logout(); setUserOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              >
                <LogOut size={15} />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
