import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, UserCheck, CalendarOff, Clock, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils';
import employeesData from '@/data/mock/employees.json';

const totalEmployees = employeesData.length;
const onLeave = employeesData.filter((e) => e.status === 'on_leave').length;
const active = employeesData.filter((e) => e.status === 'active').length;
const presentToday = Math.round(active * 0.94);
const totalPayroll = employeesData.reduce((sum, e) => sum + e.salary, 0);

const cards = [
  {
    title: 'Total Employees',
    value: totalEmployees,
    change: '+3 this month',
    trend: 'up',
    icon: Users,
    iconBg: 'bg-[#0038a8]/10',
    iconColor: 'text-[#0038a8]',
    link: '/employees',
  },
  {
    title: 'Present Today',
    value: presentToday,
    change: `${Math.round((presentToday / totalEmployees) * 100)}% attendance rate`,
    trend: 'up',
    icon: UserCheck,
    iconBg: 'bg-green-100 dark:bg-green-950/30',
    iconColor: 'text-green-600 dark:text-green-400',
    link: '/attendance',
  },
  {
    title: 'On Leave Today',
    value: onLeave + 2,
    change: '2 pending approval',
    trend: 'neutral',
    icon: CalendarOff,
    iconBg: 'bg-amber-100 dark:bg-amber-950/30',
    iconColor: 'text-amber-600 dark:text-amber-400',
    link: '/leaves',
  },
  {
    title: 'Pending Approvals',
    value: 7,
    change: '2 urgent',
    trend: 'down',
    icon: Clock,
    iconBg: 'bg-[#ce1126]/10',
    iconColor: 'text-[#ce1126]',
    link: '/leaves',
  },
  {
    title: 'Monthly Payroll',
    value: formatCurrency(totalPayroll),
    change: '+2.1% vs last month',
    trend: 'up',
    icon: DollarSign,
    iconBg: 'bg-purple-100 dark:bg-purple-950/30',
    iconColor: 'text-purple-600 dark:text-purple-400',
    link: '/payroll',
  },
];

export function KPICards() {
  const navigate = useNavigate();

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
