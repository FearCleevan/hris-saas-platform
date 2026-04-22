import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  UserMinus, CheckCircle2, Clock, ChevronRight,
  FileText, AlertCircle, Calendar,
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import offboardingData from '@/data/mock/offboarding.json';
import employeesData from '@/data/mock/employees.json';

type OffboardingRecord = typeof offboardingData[number];

const statusConfig = {
  in_progress: { label: 'In Progress', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800' },
  completed: { label: 'Completed', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800' },
};

const finalPayConfig = {
  pending: { label: 'Final Pay Pending', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30' },
  released: { label: 'Final Pay Released', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-950/30' },
};

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
}

function getClearanceProgress(record: OffboardingRecord) {
  const cleared = record.clearance.filter((c) => c.cleared).length;
  return { cleared, total: record.clearance.length, pct: Math.round((cleared / record.clearance.length) * 100) };
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

export default function OffboardingPage() {
  const navigate = useNavigate();

  const kpis = useMemo(() => ({
    total: offboardingData.length,
    inProgress: offboardingData.filter((r) => r.status === 'in_progress').length,
    completed: offboardingData.filter((r) => r.status === 'completed').length,
    exitPending: offboardingData.filter((r) => r.exitInterviewStatus !== 'done').length,
  }), []);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">Offboarding</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage clearance, exit interviews and final pay</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Total Offboarding" value={kpis.total} icon={UserMinus} color="bg-[#0038a8]/10 text-[#0038a8]" />
        <KpiCard label="In Progress" value={kpis.inProgress} icon={Clock} color="bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400" />
        <KpiCard label="Completed" value={kpis.completed} icon={CheckCircle2} color="bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400" />
        <KpiCard label="Exit Interview Pending" value={kpis.exitPending} icon={AlertCircle} color="bg-red-50 dark:bg-red-950/40 text-red-500 dark:text-red-400" />
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-3">
        {offboardingData.map((record, i) => {
          const employee = employeesData.find((e) => e.id === record.employeeId);
          if (!employee) return null;
          const { cleared, total, pct } = getClearanceProgress(record);
          const cfg = statusConfig[record.status as keyof typeof statusConfig];
          const payCfg = finalPayConfig[record.finalPayStatus as keyof typeof finalPayConfig];
          const daysLeft = differenceInDays(new Date(record.lastDay), new Date());

          return (
            <motion.div
              key={record.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 hover:border-[#0038a8]/40 hover:shadow-sm transition-all cursor-pointer"
              onClick={() => navigate(`/offboarding/${record.id}`)}
            >
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="w-11 h-11 rounded-full bg-gray-400 dark:bg-gray-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                  {getInitials(employee.name)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-0.5">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{employee.name}</p>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>
                      {cfg.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mb-1">{employee.position} · {employee.department}</p>

                  {/* Key dates */}
                  <div className="flex flex-wrap gap-4 text-xs text-gray-400 mb-3">
                    <span className="flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5" />
                      Resigned {format(new Date(record.resignationDate), 'MMM d, yyyy')}
                    </span>
                    <span className="flex items-center gap-1 font-medium" style={{ color: daysLeft <= 3 && record.status !== 'completed' ? '#ce1126' : undefined }}>
                      <Calendar className="w-3.5 h-3.5" />
                      Last day {format(new Date(record.lastDay), 'MMM d, yyyy')}
                      {record.status !== 'completed' && ` (${Math.max(0, daysLeft)}d left)`}
                    </span>
                    <span className="capitalize">{record.reason}</span>
                  </div>

                  {/* Clearance progress */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-green-500' : 'bg-amber-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">{cleared}/{total} clearances</span>
                  </div>

                  {/* Clearance dept badges */}
                  <div className="flex flex-wrap gap-1.5">
                    {record.clearance.map((c) => (
                      <span
                        key={c.department}
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                          c.cleared
                            ? 'bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800'
                            : 'bg-gray-50 dark:bg-gray-800 text-gray-400 border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        {c.cleared ? <CheckCircle2 className="w-2.5 h-2.5" /> : <Circle className="w-2.5 h-2.5" />}
                        {c.department}
                      </span>
                    ))}
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${payCfg.bg} ${payCfg.color}`}>
                      {payCfg.label}
                    </span>
                  </div>
                </div>

                <ChevronRight className="w-5 h-5 text-gray-300 dark:text-gray-600 shrink-0 mt-1" />
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

function Circle({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}
