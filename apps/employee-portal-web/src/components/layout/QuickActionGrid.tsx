import { Link } from 'react-router-dom';
import { Clock, CalendarDays, Banknote, Heart, FileText, Menu } from 'lucide-react';

const ACTIONS = [
  { to: '/attendance', label: 'Attendance', icon: Clock },
  { to: '/leaves', label: 'Leaves', icon: CalendarDays },
  { to: '/payslip', label: 'Payslip', icon: Banknote },
  { to: '/benefits', label: 'Benefits', icon: Heart },
  { to: '/documents', label: 'Documents', icon: FileText },
] as const;

interface QuickActionGridProps {
  onMoreClick: () => void;
}

// Thumb-sized 2x3 grid on Home, not a dense desktop-style menu list — see
// FRONTEND_IMPLEMENTATION.md's wireframe. The last cell reuses the same
// "More" sheet as BottomTabBar rather than duplicating its item list here.
export function QuickActionGrid({ onMoreClick }: QuickActionGridProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {ACTIONS.map(({ to, label, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 py-4 min-h-22 text-center hover:border-brand-blue/40 transition-colors"
        >
          <Icon size={22} className="text-brand-blue" />
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300 leading-tight">{label}</span>
        </Link>
      ))}
      <button
        type="button"
        onClick={onMoreClick}
        className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 py-4 min-h-22 text-center hover:border-brand-blue/40 transition-colors"
      >
        <Menu size={22} className="text-brand-blue" />
        <span className="text-xs font-medium text-gray-700 dark:text-gray-300 leading-tight">More</span>
      </button>
    </div>
  );
}
