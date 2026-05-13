import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  UserPlus, CheckCircle2, Clock, AlertCircle, ChevronRight,
  ClipboardList, Search,
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useOnboardingRecords } from '@/hooks/useOnboarding';
import type { OnboardingRecord } from '@/services/onboarding';

const STATUS_CONFIG = {
  in_progress: {
    label: 'In Progress',
    icon:  Clock,
    color: 'text-blue-600 dark:text-blue-400',
    bg:    'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800',
    bar:   'bg-brand-blue',
  },
  completed: {
    label: 'Completed',
    icon:  CheckCircle2,
    color: 'text-green-600 dark:text-green-400',
    bg:    'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800',
    bar:   'bg-green-500',
  },
  overdue: {
    label: 'Overdue',
    icon:  AlertCircle,
    color: 'text-red-600 dark:text-red-400',
    bg:    'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800',
    bar:   'bg-red-500',
  },
};

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
}

function KpiCard({
  label, value, icon: Icon, color,
}: {
  label: string; value: number; icon: React.ElementType; color: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
}

function ProgressBar({ pct, barClass }: { pct: number; barClass: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        {/* eslint-disable-next-line react/forbid-dom-props -- dynamic width requires inline style */}
        <div className={`h-full rounded-full transition-all ${barClass}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-bold text-gray-700 dark:text-gray-300 shrink-0 w-9 text-right">
        {pct}%
      </span>
    </div>
  );
}

function OnboardingCard({ record, index }: { record: OnboardingRecord; index: number }) {
  const navigate = useNavigate();
  const cfg = STATUS_CONFIG[record.overallStatus];
  const StatusIcon = cfg.icon;
  const pct = record.totalTasks > 0
    ? Math.round((record.completedTasks / record.totalTasks) * 100)
    : 0;
  const daysElapsed = record.dateHired
    ? differenceInDays(new Date(), new Date(record.dateHired))
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 sm:p-5 hover:border-brand-blue/40 hover:shadow-sm transition-all cursor-pointer group"
      onClick={() => navigate(`/onboarding/${record.employeeId}`)}
    >
      <div className="flex items-start gap-4">
        <div className="w-11 h-11 rounded-full bg-brand-blue flex items-center justify-center text-white text-sm font-bold shrink-0">
          {getInitials(record.employeeName)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-0.5">
            <Link
              to={`/employees/${record.employeeId}`}
              className="text-sm font-semibold text-gray-900 dark:text-white hover:text-brand-blue dark:hover:text-blue-400 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              {record.employeeName}
            </Link>
            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>
              <StatusIcon className="w-3 h-3" />
              {cfg.label}
            </span>
          </div>

          <p className="text-xs text-gray-400 mb-3">
            {record.position} · {record.department}
            {record.dateHired && ` · Started ${format(new Date(record.dateHired), 'MMM d, yyyy')} (${daysElapsed}d ago)`}
          </p>

          <div className="flex items-center gap-3 mb-1">
            <ProgressBar pct={pct} barClass={cfg.bar} />
            <span className="text-xs text-gray-400 shrink-0">
              {record.completedTasks}/{record.totalTasks} tasks
            </span>
          </div>

          {record.categories.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {record.categories.map((cat) => {
                const allDone = cat.done === cat.total;
                return (
                  <span
                    key={cat.name}
                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                      allDone
                        ? 'bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800'
                        : 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    {allDone ? '✓' : `${cat.done}/${cat.total}`} {cat.name}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        <ChevronRight className="w-5 h-5 text-gray-300 dark:text-gray-600 shrink-0 mt-1 group-hover:text-brand-blue transition-colors" />
      </div>
    </motion.div>
  );
}

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_progress' | 'completed' | 'overdue'>('all');
  const [search, setSearch] = useState('');

  const { data: records = [], isLoading } = useOnboardingRecords();

  const kpis = useMemo(() => ({
    total:      records.length,
    inProgress: records.filter((r) => r.overallStatus === 'in_progress').length,
    completed:  records.filter((r) => r.overallStatus === 'completed').length,
    overdue:    records.filter((r) => r.overallStatus === 'overdue').length,
  }), [records]);

  const filtered = useMemo(() => {
    let out = statusFilter === 'all' ? records : records.filter((r) => r.overallStatus === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      out = out.filter(
        (r) =>
          r.employeeName.toLowerCase().includes(q) ||
          r.position.toLowerCase().includes(q) ||
          r.department.toLowerCase().includes(q),
      );
    }
    return out;
  }, [records, statusFilter, search]);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="flex items-center justify-between mb-5 sm:mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white">Onboarding</h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Track new hire checklists and pre-employment requirements
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => navigate('/employees/new')}
          className="flex items-center gap-1.5 bg-brand-blue hover:bg-brand-blue-dark text-white"
        >
          <UserPlus className="w-4 h-4" />
          New Hire
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-5 sm:mb-6">
        <KpiCard label="Total Onboarding" value={kpis.total}      icon={ClipboardList} color="bg-brand-blue/10 text-brand-blue" />
        <KpiCard label="In Progress"       value={kpis.inProgress} icon={Clock}         color="bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400" />
        <KpiCard label="Completed"         value={kpis.completed}  icon={CheckCircle2}  color="bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400" />
        <KpiCard label="Overdue"           value={kpis.overdue}    icon={AlertCircle}   color="bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400" />
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-0 w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employee, position…"
            className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition text-gray-800 dark:text-gray-200 placeholder-gray-400"
          />
        </div>

        <div className="flex items-center gap-1 flex-wrap">
          {(['all', 'in_progress', 'completed', 'overdue'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                statusFilter === s
                  ? 'bg-brand-blue text-white'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              {s === 'all' ? 'All' : s === 'in_progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-24">
          <div className="w-7 h-7 rounded-full border-2 border-brand-blue border-t-transparent animate-spin" />
        </div>
      )}

      {!isLoading && (
        <div className="flex flex-col gap-3">
          {filtered.map((record, i) => (
            <OnboardingCard key={record.employeeId} record={record} index={i} />
          ))}

          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-gray-200 dark:border-gray-700 rounded-2xl">
              <ClipboardList className="w-10 h-10 text-gray-200 dark:text-gray-700 mb-3" />
              <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                {search ? 'No results found' : 'No onboarding records'}
              </p>
              {!search && (
                <p className="text-xs text-gray-400 mt-1">New hires will appear here once added.</p>
              )}
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="mt-3 text-xs text-brand-blue hover:underline"
                >
                  Clear search
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
