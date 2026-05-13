import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

const routeLabels: Record<string, string> = {
  employees: 'Employees',
  new: 'New Employee',
  onboarding: 'Onboarding',
  offboarding: 'Offboarding',
  attendance: 'Attendance',
  leaves: 'Leave Management',
  schedule: 'Shifts & Schedule',
  payroll: 'Payroll',
  benefits: 'Benefits',
  expenses: 'Expenses',
  documents: 'Documents',
  performance: 'Performance',
  recruitment: 'Recruitment',
  reports: 'Reports',
  analytics: 'Analytics',
  settings: 'Settings',
  profile: 'My Profile',
};

export function Breadcrumbs() {
  const { pathname } = useLocation();
  if (pathname === '/') return null;

  const segments = pathname.split('/').filter(Boolean);
  const crumbs = segments.map((segment, i) => {
    const path = '/' + segments.slice(0, i + 1).join('/');
    const label = routeLabels[segment] ?? segment.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    const isLast = i === segments.length - 1;
    return { label, path, isLast };
  });

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm mb-4 sm:mb-5 min-w-0 overflow-hidden">
      <Link
        to="/"
        className="text-gray-400 hover:text-brand-blue dark:hover:text-blue-400 transition-colors flex items-center shrink-0"
        aria-label="Dashboard"
      >
        <Home className="w-3.5 h-3.5" />
      </Link>
      {crumbs.map((crumb, idx) => (
        <span
          key={crumb.path}
          className={[
            'flex items-center gap-1 sm:gap-1.5 min-w-0',
            // On mobile: hide intermediate crumbs when path is 3+ deep, only show first and last
            !crumb.isLast && idx > 0 && crumbs.length > 2 ? 'hidden sm:flex' : '',
          ].join(' ')}
        >
          <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-300 dark:text-gray-600 shrink-0" />
          {crumb.isLast ? (
            <span className="font-medium text-gray-800 dark:text-gray-200 truncate max-w-35 sm:max-w-none">
              {crumb.label}
            </span>
          ) : (
            <Link
              to={crumb.path}
              className="text-gray-400 hover:text-brand-blue dark:hover:text-blue-400 transition-colors truncate max-w-25 sm:max-w-none"
            >
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
