import { Menu, Search, Bell, Sun, Moon, LogOut, Building2, User, ChevronDown, Zap, UserPlus, DollarSign, BarChart2, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { getInitials } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useUIStore } from '@/store/uiStore';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import notificationsData from '@/data/mock/notifications.json';

interface NavbarProps {
  onMobileMenuClick: () => void;
}

const quickActions = [
  { label: 'New Employee', icon: UserPlus, path: '/employees/new' },
  { label: 'Run Payroll', icon: DollarSign, path: '/payroll' },
  { label: 'Generate Report', icon: BarChart2, path: '/reports' },
  { label: 'Import CSV', icon: Upload, path: '/employees' },
];

const roleLabels: Record<string, string> = {
  super_admin: 'Super Admin',
  hr_manager: 'HR Manager',
  hr_staff: 'HR Staff',
  accountant: 'Accountant',
};

export function Navbar({ onMobileMenuClick }: NavbarProps) {
  const navigate = useNavigate();
  const { user, tenant, logout, darkMode, toggleDarkMode } = useAuth();
  const { setSearchOpen, setNotificationDrawerOpen } = useUIStore();
  const unreadCount = notificationsData.filter((n) => !n.read).length;

  return (
    <header className="h-16 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 flex items-center gap-3 px-4 shrink-0 z-20 sticky top-0">
      {/* Mobile menu toggle */}
      <button
        type="button"
        onClick={onMobileMenuClick}
        className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300 md:hidden transition-colors cursor-pointer"
        aria-label="Toggle menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Tenant name */}
      {tenant && (
        <div className="hidden sm:flex items-center gap-2 text-sm">
          <Building2 className="w-4 h-4 text-gray-400" />
          <span className="font-medium text-gray-700 dark:text-gray-300 truncate max-w-48">
            {tenant.name}
          </span>
        </div>
      )}

      {/* Search bar */}
      <button
        type="button"
        onClick={() => setSearchOpen(true)}
        className="flex-1 max-w-sm flex items-center gap-2 px-3 h-9 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-400 text-sm hover:border-[#0038a8]/50 hover:bg-white dark:hover:bg-gray-800 transition-all cursor-pointer"
        aria-label="Open global search"
      >
        <Search className="w-4 h-4 shrink-0" />
        <span className="hidden sm:block">Search employees, payroll, reports…</span>
        <span className="sm:hidden">Search…</span>
        <kbd className="ml-auto hidden sm:inline-flex items-center gap-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-1.5 py-0.5 text-[10px] font-mono text-gray-400">
          ⌘K
        </kbd>
      </button>

      <div className="flex items-center gap-1 ml-auto">
        {/* Quick actions */}
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="hidden sm:flex items-center gap-1.5 px-3 h-9 rounded-lg bg-[#0038a8] hover:bg-[#002d8a] text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5" />
              Quick Actions
              <ChevronDown className="w-3 h-3 ml-0.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {quickActions.map((action) => (
              <DropdownMenuItem key={action.label} onClick={() => navigate(action.path)}>
                <action.icon className="w-4 h-4 text-gray-400" />
                {action.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notifications */}
        <button
          type="button"
          onClick={() => setNotificationDrawerOpen(true)}
          className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300 transition-colors cursor-pointer"
          aria-label={`Notifications (${unreadCount} unread)`}
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#ce1126] text-white text-[9px] font-bold flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>

        {/* Dark mode toggle */}
        <button
          type="button"
          onClick={toggleDarkMode}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300 transition-colors cursor-pointer"
          aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* User menu */}
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 pl-2 pr-1 h-9 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              aria-label="User menu"
            >
              <div className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0',
                'bg-[#0038a8]'
              )}>
                {getInitials(user?.name ?? 'U')}
              </div>
              <div className="hidden sm:flex flex-col items-start leading-none">
                <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                  {user?.name?.split(' ')[0]}
                </span>
                <span className="text-[10px] text-gray-400">{roleLabels[user?.role ?? '']}</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 hidden sm:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>
              <div className="flex flex-col gap-0.5">
                <span className="font-semibold text-gray-900 dark:text-white">{user?.name}</span>
                <span className="text-xs text-gray-400 font-normal">{user?.email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/settings/profile')}>
              <User className="w-4 h-4 text-gray-400" />
              My Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/select-tenant')}>
              <Building2 className="w-4 h-4 text-gray-400" />
              Switch Company
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => { logout(); navigate('/login'); }}
              className="text-[#ce1126] focus:text-[#ce1126] focus:bg-red-50 dark:focus:bg-red-950/20"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
