import { useState } from 'react';
import { motion, type Easing } from 'framer-motion';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  CalendarDays,
  FileText,
  Clock,
  BookOpen,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from 'lucide-react';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import leaveRequestsRaw from '@/data/mock/leave-requests.json';
import leaveTypesRaw from '@/data/mock/leave-types.json';
import leaveBalancesRaw from '@/data/mock/leave-balances.json';

// ─── Types ────────────────────────────────────────────────────────────────────

type LeaveStatus = 'pending' | 'approved' | 'rejected';

interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveType: string;
  leaveTypeName: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: LeaveStatus;
  approvedBy: string | null;
  submittedAt: string;
  withPay: boolean;
}

interface LeaveType {
  code: string;
  name: string;
  entitled: number;
  withPay: boolean;
  carryOver: boolean;
  maxCarryOver: number;
  minNoticeDays: number;
  description: string;
}

interface LeaveBalanceEntry {
  entitled: number;
  used: number;
  remaining: number;
  carryOver: number;
  convertible: number;
}

interface LeaveBalance {
  employeeId: string;
  year: number;
  VL: LeaveBalanceEntry;
  SL: LeaveBalanceEntry;
  SIL: LeaveBalanceEntry;
  EL: LeaveBalanceEntry;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const EASE_OUT: Easing = 'easeOut';

const leaveRequests = leaveRequestsRaw as LeaveRequest[];
const leaveTypes = leaveTypesRaw as LeaveType[];
const leaveBalances = leaveBalancesRaw as LeaveBalance[];
const balance = leaveBalances[0];

const cardClass =
  'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5';

const fadeUp = (i: number) => ({
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, delay: i * 0.05, ease: EASE_OUT },
});

// Leave type color map
const leaveColors: Record<string, { badge: string; bar: string; text: string; bg: string }> = {
  VL:  { badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',  bar: 'bg-blue-500',  text: 'text-blue-600 dark:text-blue-400',  bg: 'bg-blue-50 dark:bg-blue-950' },
  SL:  { badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300', bar: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950' },
  SIL: { badge: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300', bar: 'bg-green-500', text: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-950' },
  EL:  { badge: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',   bar: 'bg-red-500',   text: 'text-red-600 dark:text-red-400',   bg: 'bg-red-50 dark:bg-red-950' },
  ML:  { badge: 'bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300',  bar: 'bg-pink-500',  text: 'text-pink-600 dark:text-pink-400',  bg: 'bg-pink-50 dark:bg-pink-950' },
  PL:  { badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300', bar: 'bg-indigo-500', text: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-950' },
  SPL: { badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300', bar: 'bg-purple-500', text: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-950' },
};

const statusStyles: Record<LeaveStatus, { bg: string; text: string; label: string }> = {
  pending:  { bg: 'bg-amber-100 dark:bg-amber-950', text: 'text-amber-700 dark:text-amber-300', label: 'Pending' },
  approved: { bg: 'bg-green-100 dark:bg-green-950', text: 'text-green-700 dark:text-green-300', label: 'Approved' },
  rejected: { bg: 'bg-red-100 dark:bg-red-950',     text: 'text-red-600 dark:text-red-400',     label: 'Rejected' },
};

const phLawCitations: Record<string, string> = {
  SIL: 'Labor Code Art. 95',
  ML:  'RA 11210',
  PL:  'RA 8187',
  SPL: 'RA 8972',
};

const nonApplicableCodes = ['ML', 'PL', 'SPL'];
const fileableTypes = ['VL', 'SL', 'SIL', 'EL'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateRange(start: string, end: string): string {
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
  if (start === end) return s.toLocaleDateString('en-PH', opts);
  return `${s.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })} – ${e.toLocaleDateString('en-PH', opts)}`;
}

function formatShortDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-PH', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function countWorkingDays(start: string, end: string): number {
  if (!start || !end) return 0;
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  if (e < s) return 0;
  let count = 0;
  const cur = new Date(s);
  while (cur <= e) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

function getBalanceForType(code: string): LeaveBalanceEntry | null {
  if (code === 'VL')  return balance.VL;
  if (code === 'SL')  return balance.SL;
  if (code === 'SIL') return balance.SIL;
  if (code === 'EL')  return balance.EL;
  return null;
}

// ─── Leave Type Badge ─────────────────────────────────────────────────────────

function LeaveTypeBadge({ code }: { code: string }) {
  const c = leaveColors[code] ?? leaveColors['VL'];
  return (
    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${c.badge}`}>
      {code}
    </span>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: LeaveStatus }) {
  const s = statusStyles[status];
  return (
    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  );
}

// ─── Pinned Summary Strip ─────────────────────────────────────────────────────

const summaryTypes: Array<{ code: keyof typeof leaveColors; name: string }> = [
  { code: 'VL',  name: 'Vacation Leave' },
  { code: 'SL',  name: 'Sick Leave' },
  { code: 'SIL', name: 'Service Incentive' },
  { code: 'EL',  name: 'Emergency Leave' },
];

function SummaryStrip({
  onCardClick,
}: {
  onCardClick: (code: string) => void;
}) {
  return (
    <motion.div {...fadeUp(1)} className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
      {summaryTypes.map(({ code, name }) => {
        const b = getBalanceForType(code);
        if (!b) return null;
        const c = leaveColors[code];
        const usedPct = Math.round((b.used / b.entitled) * 100);
        return (
          <button
            key={code}
            type="button"
            onClick={() => onCardClick(code)}
            className={`${cardClass} text-left hover:ring-2 hover:ring-offset-1 transition-all cursor-pointer group p-4`}
            aria-label={`Select ${name}`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className={`text-xs font-bold uppercase tracking-wide ${c.text}`}>{code}</span>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-2 leading-tight">{name}</p>
            <p className={`text-3xl font-extrabold tabular-nums ${c.text}`}>{b.remaining}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{b.used} of {b.entitled} used</p>
            <div className="mt-2 h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
              <div
                className={`h-full rounded-full ${c.bar} transition-all`}
                style={{ width: `${Math.min(usedPct, 100)}%` }}
              />
            </div>
          </button>
        );
      })}
    </motion.div>
  );
}

// ─── Tab 1: My Balances ───────────────────────────────────────────────────────

const detailedTypes: Array<{ code: string; name: string }> = [
  { code: 'VL',  name: 'Vacation Leave' },
  { code: 'SL',  name: 'Sick Leave' },
  { code: 'SIL', name: 'Service Incentive Leave' },
  { code: 'EL',  name: 'Emergency Leave' },
];

function BalancesTab() {
  return (
    <div className="space-y-4">
      {/* Year selector (static) */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 dark:text-gray-400">Year:</span>
        <span className="px-3 py-1 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-sm font-semibold">
          2023
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {detailedTypes.map((t, i) => {
          const b = getBalanceForType(t.code);
          if (!b) return null;
          const c = leaveColors[t.code];
          const type = leaveTypes.find((lt) => lt.code === t.code);
          const usedPct = Math.round((b.used / b.entitled) * 100);
          const remainingPct = 100 - usedPct;
          // Projected: if we're in month 11 (Nov = index 10), ~2 months remain
          const monthsRemaining = 2;
          const monthlyUsage = b.used / 10;
          const projected = Math.max(0, Math.round(b.remaining - monthlyUsage * monthsRemaining));

          return (
            <motion.div key={t.code} {...fadeUp(i)} className={cardClass}>
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <LeaveTypeBadge code={t.code} />
                  <span className="font-semibold text-gray-900 dark:text-white text-sm">{t.name}</span>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${type?.withPay ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                  {type?.withPay ? 'With Pay' : 'Without Pay'}
                </span>
              </div>

              {/* Large number */}
              <p className={`text-5xl font-extrabold tabular-nums ${c.text} mb-1`}>{b.remaining}</p>
              <p className="text-xs text-gray-400 mb-3">days remaining</p>

              {/* Progress bar */}
              <div className="h-2.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden mb-3">
                <div className="flex h-full rounded-full overflow-hidden">
                  <div className={`${c.bar} transition-all`} style={{ width: `${Math.min(usedPct, 100)}%` }} />
                  <div className="bg-gray-200 dark:bg-gray-700 transition-all" style={{ width: `${remainingPct}%` }} />
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-5 gap-2 text-center mb-3">
                {[
                  { label: 'Entitled', value: b.entitled },
                  { label: 'Carry Over', value: b.carryOver },
                  { label: 'Used', value: b.used },
                  { label: 'Remaining', value: b.remaining },
                  { label: 'Convertible', value: b.convertible },
                ].map((s) => (
                  <div key={s.label}>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5 leading-tight">{s.label}</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Notes */}
              {b.carryOver > 0 && (
                <p className="text-[11px] text-blue-600 dark:text-blue-400 mb-1">
                  Includes {b.carryOver} carry-over day{b.carryOver !== 1 ? 's' : ''}
                </p>
              )}
              {b.convertible > 0 && (
                <p className="text-[11px] text-green-600 dark:text-green-400 mb-1">
                  {b.convertible} day{b.convertible !== 1 ? 's' : ''} convertible to cash at year-end
                </p>
              )}
              <p className="text-[10px] text-gray-400 mt-2">
                At current usage rate, you have ~{projected} day{projected !== 1 ? 's' : ''} projected until year-end
              </p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Tab 2: File Leave ────────────────────────────────────────────────────────

const leaveSchema = z.object({
  leaveType: z.string().min(1, 'Leave type is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
}).refine(
  (d) => {
    if (!d.startDate || !d.endDate) return true;
    return new Date(d.endDate) >= new Date(d.startDate);
  },
  { message: 'End date must be on or after start date', path: ['endDate'] }
);

type LeaveFormValues = z.infer<typeof leaveSchema>;

function FileLeaveTab({
  defaultLeaveType,
  onSubmitSuccess,
  onLeaveListUpdate,
}: {
  defaultLeaveType: string;
  onSubmitSuccess: () => void;
  onLeaveListUpdate: (req: LeaveRequest) => void;
}) {
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LeaveFormValues>({
    resolver: zodResolver(leaveSchema),
    defaultValues: { leaveType: defaultLeaveType || 'VL' },
  });

  const leaveType = watch('leaveType');
  const startDate = watch('startDate');
  const endDate = watch('endDate');

  const workingDays = countWorkingDays(startDate, endDate);
  const balEntry = getBalanceForType(leaveType);
  const isInsufficient = balEntry !== null && workingDays > 0 && workingDays > balEntry.remaining;
  const selectedTypeInfo = leaveTypes.find((lt) => lt.code === leaveType);

  function onSubmit(data: LeaveFormValues) {
    const typeInfo = leaveTypes.find((lt) => lt.code === data.leaveType);
    const newReq: LeaveRequest = {
      id: `lr${Date.now()}`,
      employeeId: 'emp001',
      leaveType: data.leaveType,
      leaveTypeName: typeInfo?.name ?? data.leaveType,
      startDate: data.startDate,
      endDate: data.endDate,
      days: workingDays,
      reason: data.reason,
      status: 'pending',
      approvedBy: null,
      submittedAt: new Date().toISOString(),
      withPay: typeInfo?.withPay ?? true,
    };
    onLeaveListUpdate(newReq);
    toast.success('Leave request submitted for approval');
    reset({ leaveType: 'VL', startDate: '', endDate: '', reason: '' });
    onSubmitSuccess();
  }

  const showMedCert = leaveType === 'SL' && workingDays >= 3;
  const showSupportingDocs = leaveType === 'EL';

  return (
    <motion.div {...fadeUp(0)} className={`${cardClass} max-w-2xl`}>
      <p className="text-sm font-bold text-gray-900 dark:text-white mb-4">File a Leave Request</p>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Leave Type */}
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1" htmlFor="leave-type">
            Leave Type <span className="text-red-500">*</span>
          </label>
          <select
            id="leave-type"
            {...register('leaveType')}
            className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white"
          >
            {leaveTypes.map((lt) => {
              const isNA = nonApplicableCodes.includes(lt.code);
              if (isNA) return null;
              return (
                <option key={lt.code} value={lt.code}>
                  {lt.code} — {lt.name}
                </option>
              );
            })}
          </select>
          <p className="text-[10px] text-gray-400 mt-1">
            ML, PL, SPL not listed — contact HR to verify eligibility.
          </p>
          {errors.leaveType && <p className="text-xs text-red-500 mt-1">{errors.leaveType.message}</p>}
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1" htmlFor="start-date">
              Start Date <span className="text-red-500">*</span>
            </label>
            <input
              id="start-date"
              type="date"
              {...register('startDate')}
              className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white"
            />
            {errors.startDate && <p className="text-xs text-red-500 mt-1">{errors.startDate.message}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1" htmlFor="end-date">
              End Date <span className="text-red-500">*</span>
            </label>
            <input
              id="end-date"
              type="date"
              {...register('endDate')}
              className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white"
            />
            {errors.endDate && <p className="text-xs text-red-500 mt-1">{errors.endDate.message}</p>}
          </div>
        </div>

        {/* Working days computed */}
        {startDate && endDate && workingDays > 0 && (
          <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-2.5">
            <Clock size={15} className="text-blue-600 dark:text-blue-400 shrink-0" />
            <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
              {workingDays} working day{workingDays !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Insufficient balance warning */}
        {isInsufficient && balEntry && (
          <div className="flex items-start gap-2 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
            <AlertTriangle size={15} className="text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
            <p className="text-sm text-red-600 dark:text-red-400">
              Insufficient balance. You have {balEntry.remaining} day{balEntry.remaining !== 1 ? 's' : ''} remaining for {selectedTypeInfo?.name ?? leaveType}.
            </p>
          </div>
        )}

        {/* Supporting doc notes */}
        {(showMedCert || showSupportingDocs) && (
          <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3">
            <FileText size={15} className="text-amber-700 dark:text-amber-300 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-700 dark:text-amber-300">
              {showMedCert && 'Medical certificate required for 3 or more consecutive sick leave days.'}
              {showSupportingDocs && 'Supporting documents required for emergency leave.'}
            </p>
          </div>
        )}

        {/* Reason */}
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1" htmlFor="leave-reason">
            Reason <span className="text-red-500">*</span>
          </label>
          <textarea
            id="leave-reason"
            rows={3}
            {...register('reason')}
            placeholder="Describe the reason for your leave (min. 10 characters)..."
            className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white resize-none"
          />
          {errors.reason && <p className="text-xs text-red-500 mt-1">{errors.reason.message}</p>}
        </div>

        <button
          type="submit"
          disabled={isSubmitting || isInsufficient}
          className="w-full sm:w-auto px-6 py-2.5 bg-[#0038a8] hover:bg-[#002d8a] text-white rounded-xl font-semibold text-sm disabled:opacity-50 transition-colors"
        >
          Submit Leave Request
        </button>
      </form>
    </motion.div>
  );
}

// ─── Tab 3: Leave History ─────────────────────────────────────────────────────

function LeaveHistoryTab({
  requests,
  onCancel,
}: {
  requests: LeaveRequest[];
  onCancel: (id: string) => void;
}) {
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filtered = [...requests]
    .filter((r) => statusFilter === 'all' || r.status === statusFilter)
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));

  const statusChips: Array<{ value: string; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
  ];

  function handleCancel(id: string, typeName: string) {
    const confirmed = window.confirm(`Cancel leave request for ${typeName}? This action cannot be undone.`);
    if (confirmed) {
      onCancel(id);
      toast.success('Leave request cancelled');
    }
  }

  return (
    <motion.div {...fadeUp(0)} className="space-y-4">
      {/* Filter chips */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-gray-500 dark:text-gray-400">Status:</span>
        {statusChips.map((chip) => (
          <button
            key={chip.value}
            type="button"
            onClick={() => setStatusFilter(chip.value)}
            className={[
              'px-3 py-1 rounded-full text-xs font-semibold transition-colors border',
              statusFilter === chip.value
                ? 'bg-[#0038a8] text-white border-[#0038a8]'
                : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-[#0038a8]',
            ].join(' ')}
          >
            {chip.label}
          </button>
        ))}
        <span className="text-xs text-gray-400 ml-2">{filtered.length} record{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <div className={`${cardClass} p-0 overflow-hidden`}>
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-400 dark:text-gray-500">
            <CalendarDays size={32} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm font-medium">No leave requests found</p>
            <p className="text-xs mt-1">Try changing the filter or filing a new leave request.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                  {['Type', 'Period', 'Days', 'Reason', 'Filed On', 'Status', ''].map((h, i) => (
                    <th
                      key={`${h}-${i}`}
                      className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                    <td className="px-4 py-3">
                      <LeaveTypeBadge code={r.leaveType} />
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap text-xs">
                      {formatDateRange(r.startDate, r.endDate)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white tabular-nums">
                      {r.days}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 max-w-[180px] truncate text-xs">
                      {r.reason}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                      {formatShortDate(r.submittedAt.slice(0, 10))}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-3">
                      {r.status === 'pending' && (
                        <button
                          type="button"
                          onClick={() => handleCancel(r.id, r.leaveTypeName)}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 transition-colors whitespace-nowrap"
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Tab 4: Leave Policies ────────────────────────────────────────────────────

const faqItems = [
  {
    q: 'Can I file leave retroactively?',
    a: 'No. Leave must be filed before or on the day of absence (emergency leave excepted).',
  },
  {
    q: 'What happens to unused VL?',
    a: 'Up to 10 carry-over days are allowed. Unused SIL is convertible to cash.',
  },
  {
    q: 'How many days notice for VL?',
    a: 'At least 3 working days in advance.',
  },
];

function LeavePoliciesTab() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="space-y-6">
      {/* Policy cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {leaveTypes.map((lt, i) => {
          const c = leaveColors[lt.code] ?? leaveColors['VL'];
          const isNA = nonApplicableCodes.includes(lt.code);
          const citation = phLawCitations[lt.code];
          const fileableOnly = fileableTypes.includes(lt.code);

          return (
            <motion.div
              key={lt.code}
              {...fadeUp(i)}
              className={`${cardClass} p-0 overflow-hidden ${isNA ? 'opacity-60' : ''}`}
            >
              {/* Card header */}
              <div className={`${c.bg} px-5 py-4 border-b border-gray-200 dark:border-gray-800`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xl font-extrabold ${c.text}`}>{lt.code}</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${lt.withPay ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                    {lt.withPay ? 'With Pay' : 'Without Pay'}
                  </span>
                </div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">{lt.name}</p>
                {citation && (
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">{citation}</p>
                )}
              </div>

              {/* Card body */}
              <div className="px-5 py-4 space-y-3">
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{lt.description}</p>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg py-2">
                    <p className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">{lt.entitled}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Days</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg py-2">
                    <p className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">{lt.minNoticeDays}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Notice Days</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg py-2">
                    <p className={`text-sm font-bold tabular-nums ${lt.carryOver ? 'text-green-600' : 'text-gray-400'}`}>
                      {lt.carryOver ? `+${lt.maxCarryOver}` : 'No'}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Carry-Over</p>
                  </div>
                </div>

                {isNA && (
                  <p className="text-[10px] text-gray-400 italic text-center">
                    Contact HR to verify eligibility
                  </p>
                )}
                {!isNA && fileableOnly && (
                  <p className={`text-[10px] font-medium ${c.text} text-center`}>
                    Available to file
                  </p>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* FAQ Accordion */}
      <motion.div {...fadeUp(leaveTypes.length)} className={cardClass}>
        <p className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <BookOpen size={16} className="text-gray-500" />
          Frequently Asked Questions
        </p>
        <div className="space-y-2">
          {faqItems.map((item, i) => (
            <div key={i} className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
              <button
                title="Toggle answer"
                type="button"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                aria-expanded={openFaq === i}
              >
                <span className="text-sm font-medium text-gray-900 dark:text-white">{item.q}</span>
                {openFaq === i
                  ? <ChevronUp size={16} className="text-gray-400 shrink-0" />
                  : <ChevronDown size={16} className="text-gray-400 shrink-0" />
                }
              </button>
              {openFaq === i && (
                <div className="px-4 pb-3">
                  <p className="text-sm text-gray-600 dark:text-gray-400">{item.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LeavePage() {
  const [activeTab, setActiveTab] = useState('balances');
  const [selectedLeaveType, setSelectedLeaveType] = useState('VL');
  const [requests, setRequests] = useState<LeaveRequest[]>(leaveRequests);

  function handleCardClick(code: string) {
    setSelectedLeaveType(code);
    setActiveTab('file');
  }

  function handleLeaveListUpdate(req: LeaveRequest) {
    setRequests((prev) => [req, ...prev]);
  }

  function handleCancel(id: string) {
    setRequests((prev) => prev.filter((r) => r.id !== id));
  }

  const tabs = [
    { value: 'balances', label: 'My Balances',    icon: <CalendarDays size={15} /> },
    { value: 'file',     label: 'File Leave',      icon: <FileText size={15} /> },
    { value: 'history',  label: 'Leave History',   icon: <Clock size={15} /> },
    { value: 'policies', label: 'Leave Policies',  icon: <BookOpen size={15} /> },
  ];

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <motion.div {...fadeUp(0)} className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 dark:text-white">My Leaves</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Manage your leave requests and balances
          </p>
        </div>
        <button
          type="button"
          onClick={() => setActiveTab('file')}
          className="px-5 py-2.5 bg-[#0038a8] hover:bg-[#002d8a] text-white rounded-xl font-semibold text-sm flex items-center gap-2 transition-colors"
        >
          <FileText size={15} />
          File Leave
        </button>
      </motion.div>

      {/* Pinned Summary Strip */}
      <SummaryStrip onCardClick={handleCardClick} />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1 mb-2">
          {tabs.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="flex items-center gap-1.5 text-sm">
              {t.icon}
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="balances">
          <BalancesTab />
        </TabsContent>

        <TabsContent value="file">
          <FileLeaveTab
            defaultLeaveType={selectedLeaveType}
            onSubmitSuccess={() => setActiveTab('history')}
            onLeaveListUpdate={handleLeaveListUpdate}
          />
        </TabsContent>

        <TabsContent value="history">
          <LeaveHistoryTab requests={requests} onCancel={handleCancel} />
        </TabsContent>

        <TabsContent value="policies">
          <LeavePoliciesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
