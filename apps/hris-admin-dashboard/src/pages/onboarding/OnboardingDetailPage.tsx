import { useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, CheckCircle2, Circle, AlertCircle, Clock,
  User, Building2, Calendar, ChevronDown, ChevronUp,
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import onboardingData from '@/data/mock/onboarding.json';
import employeesData from '@/data/mock/employees.json';

type OnboardingRecord = typeof onboardingData[number];

const statusConfig = {
  in_progress: { label: 'In Progress', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800' },
  completed: { label: 'Completed', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800' },
  overdue: { label: 'Overdue', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800' },
};

const assigneeLabels: Record<string, string> = {
  employee: 'New Hire',
  hr: 'HR Team',
  it: 'IT Team',
  admin: 'Admin',
  supervisor: 'Supervisor',
};

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
}

function getProgress(record: OnboardingRecord) {
  const all = record.checklist.flatMap((c) => c.items);
  const done = all.filter((i) => i.done).length;
  return { done, total: all.length, pct: Math.round((done / all.length) * 100) };
}

export default function OnboardingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const record = useMemo(() => onboardingData.find((r) => r.id === id), [id]);
  const employee = useMemo(() => record ? employeesData.find((e) => e.id === record.employeeId) : null, [record]);
  const hrAssignee = useMemo(() => record ? employeesData.find((e) => e.id === record.assignedHR) : null, [record]);

  if (!record || !employee) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <AlertCircle className="w-10 h-10 text-gray-300 mb-4" />
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Record not found</p>
        <Button variant="outline" size="sm" onClick={() => navigate('/onboarding')} className="mt-4">Back</Button>
      </div>
    );
  }

  const { done, total, pct } = getProgress(record);
  const cfg = statusConfig[record.status as keyof typeof statusConfig];
  const daysElapsed = differenceInDays(new Date(), new Date(record.hireDate));

  const toggleCategory = (cat: string) =>
    setExpanded((prev) => ({ ...prev, [cat]: !prev[cat] }));

  const isCategoryOpen = (cat: string) => expanded[cat] !== false;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Link
        to="/onboarding"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors mb-5"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Onboarding
      </Link>

      {/* Header card */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 mb-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-[#0038a8] flex items-center justify-center text-white text-xl font-bold shrink-0">
            {getInitials(employee.name)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-xl font-extrabold text-gray-900 dark:text-white">{employee.name}</h1>
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>
                {cfg.label}
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{employee.position} · {employee.department}</p>
            <div className="flex flex-wrap gap-4 text-xs text-gray-400">
              <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />Started {format(new Date(record.hireDate), 'MMM d, yyyy')}</span>
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{daysElapsed} days elapsed</span>
              {hrAssignee && <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" />HR: {hrAssignee.name}</span>}
              <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />{employee.department}</span>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate(`/employees/${employee.id}`)}>
            View Profile
          </Button>
        </div>

        {/* Overall progress */}
        <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Overall Progress</p>
            <p className="text-sm font-bold text-gray-800 dark:text-white">{done}/{total} tasks · {pct}%</p>
          </div>
          <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className={`h-full rounded-full ${
                record.status === 'completed' ? 'bg-green-500' :
                record.status === 'overdue' ? 'bg-red-500' : 'bg-[#0038a8]'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Checklist */}
      <div className="flex flex-col gap-3">
        {record.checklist.map((cat) => {
          const catDone = cat.items.filter((i) => i.done).length;
          const catTotal = cat.items.length;
          const catPct = Math.round((catDone / catTotal) * 100);
          const open = isCategoryOpen(cat.category);

          return (
            <div key={cat.category} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
              {/* Category header */}
              <button
                type="button"
                onClick={() => toggleCategory(cat.category)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {catDone === catTotal ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                  ) : (
                    <Circle className="w-5 h-5 text-gray-300 dark:text-gray-600 shrink-0" />
                  )}
                  <div className="text-left">
                    <p className="text-sm font-semibold text-gray-800 dark:text-white">{cat.category}</p>
                    <p className="text-xs text-gray-400">{catDone} of {catTotal} done · {catPct}%</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-24 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#0038a8] rounded-full transition-all"
                      style={{ width: `${catPct}%`, backgroundColor: catDone === catTotal ? '#22c55e' : '#0038a8' }}
                    />
                  </div>
                  {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </div>
              </button>

              {/* Items */}
              {open && (
                <div className="border-t border-gray-100 dark:border-gray-800">
                  {cat.items.map((item, idx) => (
                    <div
                      key={item.id}
                      className={`flex items-start gap-3 px-4 py-3 ${idx < cat.items.length - 1 ? 'border-b border-gray-50 dark:border-gray-800/80' : ''}`}
                    >
                      {item.done ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 text-gray-300 dark:text-gray-600 mt-0.5 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${item.done ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-200'}`}>
                          {item.task}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 mt-0.5">
                          <span className="text-[10px] text-gray-400">
                            Due {format(new Date(item.dueDate), 'MMM d, yyyy')}
                          </span>
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                            {assigneeLabels[item.assignee] ?? item.assignee}
                          </span>
                        </div>
                      </div>
                      {!item.done && (
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium shrink-0 mt-0.5">Pending</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {record.notes && (
        <div className="mt-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Notes</p>
          <p className="text-sm text-gray-700 dark:text-gray-300">{record.notes}</p>
        </div>
      )}
    </motion.div>
  );
}
