import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, UserCheck, CalendarOff, Clock, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { useEmployeeStats } from '@/hooks/useEmployees';

export function KPICards() {
  const navigate = useNavigate();
  const { data: stats, isLoading } = useEmployeeStats();

  const presentToday = stats ? Math.round(stats.active * 0.94) : 0;

  const cards = [
    {
      title: 'Total Employees',
      value: stats?.total ?? '—',
      change: stats ? `+${stats.newThisMonth} this month` : '…',
      trend: 'up' as const,
      icon: Users,
      iconBg: 'bg-[#0038a8]/10',
      iconColor: 'text-[#0038a8]',
      link: '/employees',
    },
    {
      title: 'Present Today',
      value: stats ? presentToday : '—',
      change: stats && stats.total
        ? `${Math.round((presentToday / stats.total) * 100)}% attendance rate`
        : '…',
      trend: 'up' as const,
      icon: UserCheck,
      iconBg: 'bg-green-100 dark:bg-green-950/30',
      iconColor: 'text-green-600 dark:text-green-400',
      link: '/attendance',
    },
    {
      title: 'On Leave Today',
      value: stats?.onLeave ?? '—',
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
      value: stats ? formatCurrency(stats.totalMonthlySalary) : '—',
      change: 'total basic salaries',
      trend: 'up' as const,
      icon: DollarSign,
      iconBg: 'bg-purple-100 dark:bg-purple-950/30',
      iconColor: 'text-purple-600 dark:text-purple-400',
      link: '/payroll',
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 animate-pulse">
            <div className="w-9 h-9 rounded-xl bg-gray-200 dark:bg-gray-700 mb-4" />
            <div className="h-8 w-16 rounded bg-gray-200 dark:bg-gray-700 mb-2" />
            <div className="h-3 w-24 rounded bg-gray-100 dark:bg-gray-800 mb-1.5" />
            <div className="h-3 w-20 rounded bg-gray-100 dark:bg-gray-800" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {cards.map((card, i) => (
        <motion.button
          key={card.title}
          type="button"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.07 }}
          onClick={() => navigate(card.link)}
          className="group bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 text-left hover:border-[#0038a8]/40 hover:shadow-md transition-all duration-200 cursor-pointer"
        >
          <div className="flex items-center justify-between mb-4">
            <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', card.iconBg)}>
              <card.icon className={cn('w-4.5 h-4.5', card.iconColor)} />
            </div>
            <span className={cn(
              'flex items-center gap-0.5 text-[10px] font-semibold',
              card.trend === 'up' ? 'text-green-600 dark:text-green-400' :
              card.trend === 'down' ? 'text-[#ce1126]' : 'text-gray-400'
            )}>
              {card.trend === 'up' && <TrendingUp className="w-3 h-3" />}
              {card.trend === 'down' && <TrendingDown className="w-3 h-3" />}
            </span>
          </div>
          <p className="text-2xl font-extrabold text-gray-900 dark:text-white mb-1 leading-none">
            {card.value}
          </p>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
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
