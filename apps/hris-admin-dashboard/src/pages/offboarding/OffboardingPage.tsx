import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserMinus, CheckCircle2, Clock, ChevronRight,
  FileText, AlertCircle, Calendar, X, Loader2, Search,
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { useOffboardingRecords, useInitiateOffboarding, type OffboardingRecord } from '@/hooks/useOffboarding';
import { useEmployees } from '@/hooks/useEmployees';

const statusConfig = {
  in_progress: { label: 'In Progress', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800' },
  completed:   { label: 'Completed',   color: 'text-green-600 dark:text-green-400',  bg: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800' },
};

const finalPayConfig = {
  pending:  { label: 'Final Pay Pending',  color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30' },
  computed: { label: 'Final Pay Computed', color: 'text-blue-600 dark:text-blue-400',   bg: 'bg-blue-50 dark:bg-blue-950/30' },
  approved: { label: 'Final Pay Approved', color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-950/30' },
  released: { label: 'Final Pay Released', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-950/30' },
};

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
        <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
}

function OffboardingCard({ record, index }: { record: OffboardingRecord; index: number }) {
  const navigate = useNavigate();
  const cfg    = statusConfig[record.overallStatus] ?? statusConfig.in_progress;
  const payCfg = finalPayConfig[record.finalPayStatus as keyof typeof finalPayConfig] ?? finalPayConfig.pending;
  const daysLeft = differenceInDays(new Date(record.lastDayOfWork), new Date());

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 sm:p-5 hover:border-brand-blue/40 hover:shadow-sm transition-all cursor-pointer"
      onClick={() => navigate(`/offboarding/${record.id}`)}
    >
      <div className="flex items-start gap-4">
        <div className="w-11 h-11 rounded-full bg-gray-400 dark:bg-gray-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
          {getInitials(record.employeeName)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-0.5">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{record.employeeName}</p>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>
              {cfg.label}
            </span>
          </div>
          <p className="text-xs text-gray-400 mb-1">{record.position} · {record.department}</p>

          <div className="flex flex-wrap gap-4 text-xs text-gray-400 mb-3">
            {record.resignationDate && (
              <span className="flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" />
                Resigned {format(new Date(record.resignationDate), 'MMM d, yyyy')}
              </span>
            )}
            <span
              className={`flex items-center gap-1 font-medium ${daysLeft <= 3 && record.overallStatus !== 'completed' ? 'text-brand-red' : ''}`}
            >
              <Calendar className="w-3.5 h-3.5" />
              Last day {format(new Date(record.lastDayOfWork), 'MMM d, yyyy')}
              {record.overallStatus !== 'completed' && ` (${Math.max(0, daysLeft)}d left)`}
            </span>
            <span className="capitalize">{record.separationType}</span>
          </div>

          {/* Clearance progress bar */}
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              {/* eslint-disable-next-line react/forbid-dom-props -- dynamic width requires inline style */}
              <div
                className={`h-full rounded-full transition-all ${record.clearancePct === 100 ? 'bg-green-500' : 'bg-amber-500'}`}
                style={{ width: `${record.clearancePct}%` }}
              />
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
              {record.clearanceDone}/{record.clearanceTotal} clearances
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${payCfg.bg} ${payCfg.color}`}>
              {payCfg.label}
            </span>
            {record.exitInterviewStatus !== 'done' && record.overallStatus !== 'completed' && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-50 dark:bg-gray-800 text-gray-400 border border-gray-200 dark:border-gray-700">
                Exit interview {record.exitInterviewStatus}
              </span>
            )}
          </div>
        </div>

        <ChevronRight className="w-5 h-5 text-gray-300 dark:text-gray-600 shrink-0 mt-1" />
      </div>
    </motion.div>
  );
}

// ── Initiate Modal ────────────────────────────────────────────────────────────

const SEPARATION_TYPES = [
  { value: 'resignation',      label: 'Resignation' },
  { value: 'termination',      label: 'Termination' },
  { value: 'retirement',       label: 'Retirement' },
  { value: 'end_of_contract',  label: 'End of Contract' },
  { value: 'redundancy',       label: 'Redundancy' },
] as const;

function InitiateOffboardingModal({ onClose }: { onClose: () => void }) {
  const { data: employees = [],       isLoading: empLoading } = useEmployees();
  const { data: offboardingRecords = [] }                     = useOffboardingRecords();
  const { mutate: initiate, isPending }                       = useInitiateOffboarding();

  const [search,         setSearch]         = useState('');
  const [selected,       setSelected]       = useState<Set<string>>(new Set());
  const [separationType, setSeparationType] = useState<typeof SEPARATION_TYPES[number]['value']>('resignation');
  const [lastDay,        setLastDay]        = useState('');
  const [notes,          setNotes]          = useState('');

  const alreadyOffboarding = useMemo(
    () => new Set(offboardingRecords.filter((r) => r.overallStatus === 'in_progress').map((r) => r.employeeId)),
    [offboardingRecords],
  );

  const filtered = useMemo(() => {
    const available = employees.filter((e) => !alreadyOffboarding.has(e.id));
    const q = search.toLowerCase().trim();
    if (!q) return available;
    return available.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.position.toLowerCase().includes(q) ||
        e.department.toLowerCase().includes(q),
    );
  }, [employees, alreadyOffboarding, search]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (filtered.every((e) => selected.has(e.id))) {
      setSelected((prev) => { const next = new Set(prev); filtered.forEach((e) => next.delete(e.id)); return next; });
    } else {
      setSelected((prev) => { const next = new Set(prev); filtered.forEach((e) => next.add(e.id)); return next; });
    }
  }

  function removeSelected(id: string) {
    setSelected((prev) => { const next = new Set(prev); next.delete(id); return next; });
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (selected.size === 0 || !lastDay) return;
    initiate(
      { employeeIds: Array.from(selected), separationType, lastDayOfWork: lastDay, notes: notes || undefined },
      {
        onSuccess: () => {
          toast.success(
            selected.size === 1
              ? 'Offboarding initiated successfully'
              : `Offboarding initiated for ${selected.size} employees`,
          );
          onClose();
        },
        onError: (err) => toast.error(err.message ?? 'Failed to initiate offboarding'),
      },
    );
  }

  const selectedEmployees   = employees.filter((e) => selected.has(e.id));
  const allFilteredSelected = filtered.length > 0 && filtered.every((e) => selected.has(e.id));
  const isBatch             = selected.size > 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.18 }}
        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div>
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">Initiate Offboarding</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Select one or more departing employees
            </p>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={submit} className="flex flex-col flex-1 min-h-0">
          <div className="p-5 space-y-4 flex flex-col flex-1 min-h-0">

            {/* Separation type + last day — side by side */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Separation Type</label>
                <select
                  aria-label="Separation type"
                  value={separationType}
                  onChange={(e) => setSeparationType(e.target.value as typeof separationType)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue/40"
                >
                  {SEPARATION_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Last Day of Work
                </label>
                <DatePicker value={lastDay} onChange={setLastDay} placeholder="Select date" />
              </div>
            </div>

            {/* Batch notice */}
            {isBatch && (
              <div className="flex items-start gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-700 dark:text-amber-300">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                All {selected.size} selected employees will share the same separation type and last day.
              </div>
            )}

            {/* Selected chips */}
            {selectedEmployees.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selectedEmployees.map((emp) => (
                  <span key={emp.id} className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-brand-blue/10 text-brand-blue border border-brand-blue/20">
                    {emp.name.split(' ')[0]}
                    <button type="button" aria-label={`Remove ${emp.name}`} onClick={() => removeSelected(emp.id)} className="hover:text-brand-blue-dark transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              <input
                type="text"
                aria-label="Search employees"
                placeholder="Search by name, position, or department…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/40"
              />
            </div>

            {/* Select all row */}
            {filtered.length > 1 && (
              <div className="flex items-center justify-between px-1">
                <button type="button" onClick={toggleAll} className="text-xs text-brand-blue hover:text-brand-blue-dark font-medium transition-colors">
                  {allFilteredSelected ? 'Deselect all' : `Select all ${filtered.length}`}
                </button>
                {selected.size > 0 && (
                  <span className="text-xs text-gray-400">{selected.size} selected</span>
                )}
              </div>
            )}

            {/* Employee list */}
            <div className="flex-1 overflow-y-auto min-h-0 border border-gray-200 dark:border-gray-700 rounded-xl divide-y divide-gray-100 dark:divide-gray-800">
              {empLoading && (
                <div className="flex items-center justify-center py-8">
                  <div className="w-5 h-5 rounded-full border-2 border-brand-blue border-t-transparent animate-spin" />
                </div>
              )}
              {!empLoading && filtered.length === 0 && (
                <div className="py-8 text-center text-xs text-gray-400 px-4">
                  {search
                    ? 'No employees match your search'
                    : employees.length > 0
                      ? 'All active employees are already in offboarding'
                      : 'No employees found'}
                </div>
              )}
              {!empLoading && filtered.map((emp) => {
                const isChecked = selected.has(emp.id);
                return (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => toggle(emp.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60 ${isChecked ? 'bg-brand-blue/5 dark:bg-brand-blue/10' : ''}`}
                  >
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${isChecked ? 'bg-brand-blue border-brand-blue' : 'border-gray-300 dark:border-gray-600'}`}>
                      {isChecked && (
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 10">
                          <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <div className="w-8 h-8 rounded-full bg-gray-400 dark:bg-gray-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {getInitials(emp.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-white truncate">{emp.name}</p>
                      <p className="text-xs text-gray-400 truncate">{emp.position} · {emp.department}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Notes <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                aria-label="Notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional context…"
                rows={2}
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue/40 resize-none"
              />
            </div>

          </div>

          {/* Footer */}
          <div className="flex gap-2 px-5 pb-5 shrink-0">
            <Button type="button" variant="outline" size="sm" onClick={onClose} className="flex-1">Cancel</Button>
            <Button
              type="submit"
              size="sm"
              disabled={isPending || selected.size === 0 || !lastDay}
              className="flex-1 bg-brand-blue hover:bg-brand-blue-dark text-white flex items-center justify-center gap-1.5"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserMinus className="w-4 h-4" />}
              {selected.size > 1 ? `Start Offboarding (${selected.size})` : 'Start Offboarding'}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function OffboardingPage() {
  const [showInitiate, setShowInitiate] = useState(false);
  const { data: records = [], isLoading } = useOffboardingRecords();

  const kpis = useMemo(() => ({
    total:       records.length,
    inProgress:  records.filter((r) => r.overallStatus === 'in_progress').length,
    completed:   records.filter((r) => r.overallStatus === 'completed').length,
    exitPending: records.filter((r) => r.exitInterviewStatus !== 'done').length,
  }), [records]);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <AnimatePresence>
        {showInitiate && <InitiateOffboardingModal onClose={() => setShowInitiate(false)} />}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between mb-5 sm:mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white">Offboarding</h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Manage clearance, exit interviews and final pay
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setShowInitiate(true)}
          className="flex items-center gap-1.5 bg-brand-blue hover:bg-brand-blue-dark text-white"
        >
          <UserMinus className="w-4 h-4" />
          <span className="hidden sm:inline">Initiate Offboarding</span>
          <span className="sm:hidden">Initiate</span>
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-5 sm:mb-6">
        <KpiCard label="Total Offboarding" value={kpis.total}       icon={UserMinus}    color="bg-brand-blue/10 text-brand-blue" />
        <KpiCard label="In Progress"        value={kpis.inProgress}  icon={Clock}        color="bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400" />
        <KpiCard label="Completed"          value={kpis.completed}   icon={CheckCircle2} color="bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400" />
        <KpiCard label="Exit Interview Pending" value={kpis.exitPending} icon={AlertCircle} color="bg-red-50 dark:bg-red-950/40 text-red-500 dark:text-red-400" />
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-24">
          <div className="w-7 h-7 rounded-full border-2 border-brand-blue border-t-transparent animate-spin" />
        </div>
      )}

      {/* Cards */}
      {!isLoading && (
        <div className="flex flex-col gap-3">
          {records.map((record, i) => (
            <OffboardingCard key={record.id} record={record} index={i} />
          ))}

          {records.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-gray-200 dark:border-gray-700 rounded-2xl">
              <UserMinus className="w-10 h-10 text-gray-200 dark:text-gray-700 mb-3" />
              <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">No offboarding records</p>
              <p className="text-xs text-gray-400 mt-1">Offboarding records will appear here when initiated.</p>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
