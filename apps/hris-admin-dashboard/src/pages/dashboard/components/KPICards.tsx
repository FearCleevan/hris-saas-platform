import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, UserCheck, CalendarOff, Clock, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { MOCK_STATS } from '@/hooks/useEmployees';

// Deliberately mock-only, like every sibling dashboard widget (ActivityFeed,
// AnnouncementBoard, DepartmentChart, etc.) — see
// CRUD_FIXES_FRONTEND_IMPLEMENTATION.md Phase F10. Was previously the one
// widget on this page hitting real Supabase data via useEmployeeStats(),
// which could visibly disagree with the rest of the still-mock dashboard.
export function KPICards() {
  const navigate = useNavigate();
  const stats = MOCK_STATS;

  const presentToday = Math.round(stats.active * 0.94);

  const cards = [
    {
      title: 'Total Employees',
      value: stats.total,
      change: `+${stats.newThisMonth} this month`,
      trend: 'up' as const,
      icon: Users,
      iconBg: 'bg-[#0038a8]/10',
      iconColor: 'text-[#0038a8]',
      link: '/employees',
    },
    {
      title: 'Present Today',
      value: presentToday,
      change: `${Math.round((presentToday / stats.total) * 100)}% attendance rate`,
      trend: 'up' as const,
      icon: UserCheck,
      iconBg: 'bg-green-100 dark:bg-green-950/30',
      iconColor: 'text-green-600 dark:text-green-400',
      link: '/attendance',
    },
    {
      title: 'On Leave Today',
      value: stats.onLeave,
      change: 'approved leaves',
      trend: 'neutral' as const,
      icon: CalendarOff,
      iconBg: 'bg-amber-100 dark:bg-amber-950/30',
      iconColor: 'text-amber-600 dark:text-amber-400',
      link: '/leaves',
    },
    {
      title: 'Pending Approvals',
      value: '—',
      change: 'leaves & overtime',
      trend: 'down' as const,
      icon: Clock,
      iconBg: 'bg-[#ce1126]/10',
      iconColor: 'text-[#ce1126]',
      link: '/leaves',
    },
    {
      title: 'Monthly Payroll',
      value: formatCurrency(stats.totalMonthlySalary),
      change: 'total basic salaries',
      trend: 'up' as const,
      icon: DollarSign,
      iconBg: 'bg-purple-100 dark:bg-purple-950/30',
      iconColor: 'text-purple-600 dark:text-purple-400',
      link: '/payroll',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
      {cards.map((card, i) => (
        <motion.button
          key={card.title}
          type="button"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.07 }}
          onClick={() => navigate(card.link)}
          className={cn(
            'group bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 sm:p-5 text-left hover:border-brand-blue/40 hover:shadow-md transition-all duration-200 cursor-pointer',
            // Last card spans full width on mobile (2-col grid) so it isn't orphaned alone
            i === cards.length - 1 && 'col-span-2 sm:col-span-1',
          )}
        >
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className={cn('w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center', card.iconBg)}>
              <card.icon className={cn('w-4 h-4', card.iconColor)} />
            </div>
            <span className={cn(
              'flex items-center gap-0.5 text-[10px] font-semibold',
              card.trend === 'up' ? 'text-green-600 dark:text-green-400' :
              card.trend === 'down' ? 'text-brand-red' : 'text-gray-400'
            )}>
              {card.trend === 'up' && <TrendingUp className="w-3 h-3" />}
              {card.trend === 'down' && <TrendingDown className="w-3 h-3" />}
            </span>
          </div>
          <p className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white mb-1 leading-none">
            {card.value}
          </p>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 leading-tight">
            {card.title}
          </p>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-tight">
            {card.change}
          </p>
        </motion.button>
      ))}
    </div>
  );
}
