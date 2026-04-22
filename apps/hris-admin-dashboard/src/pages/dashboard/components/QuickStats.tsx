import { UserPlus, UserMinus, RefreshCw, TrendingUp } from 'lucide-react';
import employeesData from '@/data/mock/employees.json';

const newHires = employeesData.filter((e) => {
  const hire = new Date(e.hireDate);
  return hire >= new Date('2026-04-01') && hire <= new Date('2026-04-22');
}).length;

const probationary = employeesData.filter((e) => e.type === 'probationary').length;

const stats = [
  { label: 'New Hires (Apr)', value: newHires, icon: UserPlus, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-950/30' },
  { label: 'Probationary', value: probationary, icon: RefreshCw, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-950/30' },
  { label: 'Resignations (Apr)', value: 1, icon: UserMinus, color: 'text-[#ce1126]', bg: 'bg-red-100 dark:bg-red-950/30' },
  { label: 'Regularized (Apr)', value: 3, icon: TrendingUp, color: 'text-[#0038a8] dark:text-blue-400', bg: 'bg-[#0038a8]/10' },
];

export function QuickStats() {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
      <div className="mb-4">
        <h3 className="font-bold text-gray-900 dark:text-white text-sm">Quick Stats</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">Workforce changes this month</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat) => (
          <div key={stat.label} className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${stat.bg}`}>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </div>
            <div>
              <p className="text-lg font-extrabold text-gray-900 dark:text-white leading-none">{stat.value}</p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
