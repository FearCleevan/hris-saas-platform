import { useLocation, NavLink } from 'react-router-dom';
import { navItems } from './navConfig';
import { useAuthStore } from '@/store/authStore';

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const user = useAuthStore((s) => s.user);

  function isActive(path: string): boolean {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  }

  const sidebarContent = (
    <aside className="w-[220px] h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col">
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-gray-100 dark:border-gray-800">
        <div className="w-8 h-8 bg-brand-blue rounded-lg flex items-center justify-center shrink-0">
          <span className="text-white font-extrabold text-sm">H</span>
        </div>
        <div className="min-w-0">
          <p className="font-extrabold text-gray-900 dark:text-white text-sm leading-tight">HRISPH</p>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight">Employee Portal</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {navItems.map((item) => {
          const active = isActive(item.path);
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={[
                'flex items-center gap-3 px-3 py-2.5 rounded-xl mb-0.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-brand-blue text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white',
              ].join(' ')}
            >
              <Icon size={16} className="shrink-0" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      {user && (
        <div className="border-t border-gray-100 dark:border-gray-800 px-3 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-brand-blue flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold">{getInitials(user.name)}</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{user.name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.department}</p>
          </div>
        </div>
      )}
    </aside>
  );

  return (
    <>
      <div className="hidden md:block fixed top-0 left-0 h-full z-20">{sidebarContent}</div>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 md:hidden"
          aria-label="Sidebar overlay"
        >
          <div
            className="absolute inset-0 bg-black/50"
            onClick={onClose}
            aria-hidden="true"
          />
          <div className="absolute top-0 left-0 h-full">{sidebarContent}</div>
        </div>
      )}
    </>
  );
}
