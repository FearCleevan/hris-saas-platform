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
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm mb-5">
      <Link
        to="/"
        className="text-gray-400 hover:text-[#0038a8] dark:hover:text-blue-400 transition-colors flex items-center"
        aria-label="Dashboard"
      >
        <Home className="w-3.5 h-3.5" />
      </Link>
      {crumbs.map((crumb) => (
        <span key={crumb.path} className="flex items-center gap-1.5">
          <ChevronRight className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600" />
          {crumb.isLast ? (
            <span className="font-medium text-gray-800 dark:text-gray-200">{crumb.label}</span>
          ) : (
            <Link
              to={crumb.path}
              className="text-gray-400 hover:text-[#0038a8] dark:hover:text-blue-400 transition-colors"
            >
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
