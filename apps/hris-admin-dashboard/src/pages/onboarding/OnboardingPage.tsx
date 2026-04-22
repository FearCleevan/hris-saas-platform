import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  UserPlus, CheckCircle2, Clock, AlertCircle, ChevronRight,
  ClipboardList, Filter,
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import onboardingData from '@/data/mock/onboarding.json';
import employeesData from '@/data/mock/employees.json';

type OnboardingRecord = typeof onboardingData[number];

const statusConfig = {
  in_progress: { label: 'In Progress', icon: Clock, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800' },
  completed: { label: 'Completed', icon: CheckCircle2, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800' },
  overdue: { label: 'Overdue', icon: AlertCircle, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800' },
};

function getProgress(record: OnboardingRecord) {
  const all = record.checklist.flatMap((c) => c.items);
  const done = all.filter((i) => i.done).length;
  return { done, total: all.length, pct: Math.round((done / all.length) * 100) };
}

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
}

function KpiCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: React.ElementType; color: string }) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'in_progress' | 'completed' | 'overdue'>('all');

  const filtered = useMemo(() =>
    filter === 'all' ? onboardingData : onboardingData.filter((r) => r.status === filter),
    [filter]
  );

  const kpis = useMemo(() => ({
    total: onboardingData.length,
    inProgress: onboardingData.filter((r) => r.status === 'in_progress').length,
    completed: onboardingData.filter((r) => r.status === 'completed').length,
    overdue: onboardingData.filter((r) => r.status === 'overdue').length,
  }), []);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">Onboarding</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Track new hire checklists and pre-employment requirements</p>
        </div>
        <Button
          size="sm"
          onClick={() => navigate('/employees/new')}
          className="flex items-center gap-1.5 bg-[#0038a8] hover:bg-[#002d8a] text-white"
        >
          <UserPlus className="w-4 h-4" />
          New Hire
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Total Onboarding" value={kpis.total} icon={ClipboardList} color="bg-[#0038a8]/10 text-[#0038a8]" />
        <KpiCard label="In Progress" value={kpis.inProgress} icon={Clock} color="bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400" />
        <KpiCard label="Completed" value={kpis.completed} icon={CheckCircle2} color="bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400" />
        <KpiCard label="Overdue" value={kpis.overdue} icon={AlertCircle} color="bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400" />
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 mb-5">
        <Filter className="w-4 h-4 text-gray-400 mr-1" />
        {(['all', 'in_progress', 'completed', 'overdue'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === s
                ? 'bg-[#0038a8] text-white'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            {s === 'all' ? 'All' : s === 'in_progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-3">
        {filtered.map((record, i) => {
          const employee = employeesData.find((e) => e.id === record.employeeId);
          if (!employee) return null;
          const { done, total, pct } = getProgress(record);
          const cfg = statusConfig[record.status as keyof typeof statusConfig];
          const StatusIcon = cfg.icon;
          const daysElapsed = differenceInDays(new Date(), new Date(record.hireDate));

          return (
            <motion.div
              key={record.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 hover:border-[#0038a8]/40 hover:shadow-sm transition-all cursor-pointer"
              onClick={() => navigate(`/onboarding/${record.id}`)}
            >
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="w-11 h-11 rounded-full bg-[#0038a8] flex items-center justify-center text-white text-sm font-bold shrink-0">
                  {getInitials(employee.name)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-0.5">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{employee.name}</p>
                    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>
                      <StatusIcon className="w-3 h-3" />
                      {cfg.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mb-3">
                    {employee.position} · {employee.department} · Started {format(new Date(record.hireDate), 'MMM d, yyyy')} ({daysElapsed}d ago)
                  </p>

                  {/* Progress bar */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          record.status === 'completed' ? 'bg-green-500' :
                          record.status === 'overdue' ? 'bg-red-500' : 'bg-[#0038a8]'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 shrink-0">
                      {done}/{total} tasks
                    </span>
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300 shrink-0">{pct}%</span>
                  </div>

                  {/* Category mini-progress */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {record.checklist.map((cat) => {
                      const catDone = cat.items.filter((i) => i.done).length;
                      const catTotal = cat.items.length;
                      const allDone = catDone === catTotal;
                      return (
                        <span
                          key={cat.category}
                          className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                            allDone
                              ? 'bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800'
                              : 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700'
                          }`}
                        >
                          {allDone ? '✓' : `${catDone}/${catTotal}`} {cat.category}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Arrow */}
                <ChevronRight className="w-5 h-5 text-gray-300 dark:text-gray-600 shrink-0 mt-1" />
              </div>
            </motion.div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-16 text-sm text-gray-400">
            No onboarding records for this filter.
          </div>
        )}
      </div>
    </motion.div>
  );
}
