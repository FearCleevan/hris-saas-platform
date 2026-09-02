import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { useAuth } from '@/hooks/useAuth';
import {
  listLeaveTypes,
  getLeaveBalances,
  listLeaveRequests,
  submitLeaveRequest,
  cancelLeaveRequest,
  type LeaveRequestListItem,
} from '@/services/leaves';

// ─── Types ────────────────────────────────────────────────────────────────────

type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

interface LeaveType {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_paid: boolean;
  is_mandatory: boolean;
  requires_document: boolean;
  max_days_per_year: number | null;
  carry_over_days: number;
}

interface LeaveBalance {
  leave_type_id: string;
  year: number;
  entitled_days: number;
  used_days: number;
  pending_days: number;
  carried_over: number;
  remaining: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const EASE_OUT: Easing = 'easeOut';

const cardClass = 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5';

const fadeUp = (i: number) => ({
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, delay: i * 0.05, ease: EASE_OUT },
});

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
  pending:   { bg: 'bg-amber-100 dark:bg-amber-950', text: 'text-amber-700 dark:text-amber-300', label: 'Pending' },
  approved:  { bg: 'bg-green-100 dark:bg-green-950', text: 'text-green-700 dark:text-green-300', label: 'Approved' },
  rejected:  { bg: 'bg-red-100 dark:bg-red-950',     text: 'text-red-600 dark:text-red-400',     label: 'Rejected' },
  cancelled: { bg: 'bg-gray-100 dark:bg-gray-800',   text: 'text-gray-500 dark:text-gray-400',   label: 'Cancelled' },
};

const phLawCitations: Record<string, string> = { SIL: 'Labor Code Art. 95', ML: 'RA 11210', PL: 'RA 8187', SPL: 'RA 8972' };
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
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
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

function LeaveTypeBadge({ code }: { code: string }) {
  const c = leaveColors[code] ?? leaveColors['VL'];
  return <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${c.badge}`}>{code}</span>;
}

function StatusBadge({ status }: { status: LeaveStatus }) {
  const s = statusStyles[status] ?? statusStyles.pending;
  return <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${s.bg} ${s.text}`}>{s.label}</span>;
}

// ─── Pinned Summary Strip ─────────────────────────────────────────────────────

function SummaryStrip({
  leaveTypes,
  balances,
  onCardClick,
}: {
  leaveTypes: LeaveType[];
  balances: LeaveBalance[];
  onCardClick: (typeId: string) => void;
}) {
  const summaryTypes = leaveTypes.filter((t) => fileableTypes.includes(t.code));

  return (
    <motion.div {...fadeUp(1)} className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
      {summaryTypes.map((t) => {
        const b = balances.find((bal) => bal.leave_type_id === t.id);
        if (!b) return null;
        const c = leaveColors[t.code] ?? leaveColors.VL;
        const usedPct = t.max_days_per_year ? Math.round((b.used_days / t.max_days_per_year) * 100) : 0;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onCardClick(t.id)}
            className={`${cardClass} text-left hover:ring-2 hover:ring-offset-1 transition-all cursor-pointer group p-4`}
            aria-label={`Select ${t.name}`}
          >
            <span className={`text-xs font-bold uppercase tracking-wide ${c.text}`}>{t.code}</span>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-2 leading-tight mt-1">{t.name}</p>
            <p className={`text-3xl font-extrabold tabular-nums ${c.text}`}>{b.remaining}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{b.used_days} of {t.max_days_per_year ?? '∞'} used</p>
            <div className="mt-2 h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
              <div className={`h-full rounded-full ${c.bar} transition-all`} style={{ width: `${Math.min(usedPct, 100)}%` }} />
            </div>
          </button>
        );
      })}
    </motion.div>
  );
}

// ─── Tab 1: My Balances ───────────────────────────────────────────────────────

function BalancesTab({ leaveTypes, balances }: { leaveTypes: LeaveType[]; balances: LeaveBalance[] }) {
  const detailedTypes = leaveTypes.filter((t) => fileableTypes.includes(t.code));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 dark:text-gray-400">Year:</span>
        <span className="px-3 py-1 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-sm font-semibold">
          {new Date().getFullYear()}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {detailedTypes.map((t, i) => {
          const b = balances.find((bal) => bal.leave_type_id === t.id);
          if (!b) return null;
          const c = leaveColors[t.code] ?? leaveColors.VL;
          const usedPct = t.max_days_per_year ? Math.round((b.used_days / t.max_days_per_year) * 100) : 0;
          const remainingPct = 100 - usedPct;

          return (
            <motion.div key={t.id} {...fadeUp(i)} className={cardClass}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <LeaveTypeBadge code={t.code} />
                  <span className="font-semibold text-gray-900 dark:text-white text-sm">{t.name}</span>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${t.is_paid ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                  {t.is_paid ? 'With Pay' : 'Without Pay'}
                </span>
              </div>

              <p className={`text-5xl font-extrabold tabular-nums ${c.text} mb-1`}>{b.remaining}</p>
              <p className="text-xs text-gray-400 mb-3">days remaining</p>

              <div className="h-2.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden mb-3">
                <div className="flex h-full rounded-full overflow-hidden">
                  <div className={`${c.bar} transition-all`} style={{ width: `${Math.min(usedPct, 100)}%` }} />
                  <div className="bg-gray-200 dark:bg-gray-700 transition-all" style={{ width: `${remainingPct}%` }} />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 text-center mb-3">
                {[
                  { label: 'Entitled', value: t.max_days_per_year ?? '∞' },
                  { label: 'Carry Over', value: b.carried_over },
                  { label: 'Used', value: b.used_days },
                  { label: 'Pending', value: b.pending_days },
                ].map((s) => (
                  <div key={s.label}>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5 leading-tight">{s.label}</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">{s.value}</p>
                  </div>
                ))}
              </div>

              {b.carried_over > 0 && (
                <p className="text-[11px] text-blue-600 dark:text-blue-400 mb-1">
                  Includes {b.carried_over} carry-over day{b.carried_over !== 1 ? 's' : ''}
                </p>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Tab 2: File Leave ────────────────────────────────────────────────────────

const leaveSchema = z.object({
  leaveTypeId: z.string().min(1, 'Leave type is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
}).refine(
  (d) => !d.startDate || !d.endDate || new Date(d.endDate) >= new Date(d.startDate),
  { message: 'End date must be on or after start date', path: ['endDate'] }
);

type LeaveFormValues = z.infer<typeof leaveSchema>;

function FileLeaveTab({
  leaveTypes,
  balances,
  defaultLeaveTypeId,
  onSubmitSuccess,
}: {
  leaveTypes: LeaveType[];
  balances: LeaveBalance[];
  defaultLeaveTypeId: string;
  onSubmitSuccess: () => void;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileableTypeList = leaveTypes.filter((t) => !nonApplicableCodes.includes(t.code));

  const { register, handleSubmit, watch, reset, formState: { errors, isSubmitting } } = useForm<LeaveFormValues>({
    resolver: zodResolver(leaveSchema),
    defaultValues: { leaveTypeId: defaultLeaveTypeId || fileableTypeList[0]?.id },
  });

  const leaveTypeId = watch('leaveTypeId');
  const startDate = watch('startDate');
  const endDate = watch('endDate');

  const workingDays = countWorkingDays(startDate, endDate);
  const selectedType = leaveTypes.find((t) => t.id === leaveTypeId);
  const balEntry = balances.find((b) => b.leave_type_id === leaveTypeId);
  const isInsufficient = !!balEntry && workingDays > 0 && workingDays > balEntry.remaining;

  async function onSubmit(data: LeaveFormValues) {
    if (!user) return;
    try {
      await submitLeaveRequest(user.id, user.organizationId, {
        leave_type_id: data.leaveTypeId,
        start_date: data.startDate,
        end_date: data.endDate,
        total_days: workingDays,
        reason: data.reason,
      });
      toast.success('Leave request submitted for approval');
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
      reset({ leaveTypeId: fileableTypeList[0]?.id, startDate: '', endDate: '', reason: '' });
      onSubmitSuccess();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to submit leave request');
    }
  }

  const showMedCert = selectedType?.code === 'SL' && workingDays >= 3;
  const showSupportingDocs = selectedType?.code === 'EL';

  return (
    <motion.div {...fadeUp(0)} className={`${cardClass} max-w-2xl`}>
      <p className="text-sm font-bold text-gray-900 dark:text-white mb-4">File a Leave Request</p>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1" htmlFor="leave-type">Leave Type <span className="text-red-500">*</span></label>
          <select id="leave-type" {...register('leaveTypeId')} className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white">
            {fileableTypeList.map((t) => <option key={t.id} value={t.id}>{t.code} — {t.name}</option>)}
          </select>
          <p className="text-[10px] text-gray-400 mt-1">ML, PL, SPL not listed — contact HR to verify eligibility.</p>
          {errors.leaveTypeId && <p className="text-xs text-red-500 mt-1">{errors.leaveTypeId.message}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1" htmlFor="start-date">Start Date <span className="text-red-500">*</span></label>
            <input id="start-date" type="date" {...register('startDate')} className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white" />
            {errors.startDate && <p className="text-xs text-red-500 mt-1">{errors.startDate.message}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1" htmlFor="end-date">End Date <span className="text-red-500">*</span></label>
            <input id="end-date" type="date" {...register('endDate')} className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white" />
            {errors.endDate && <p className="text-xs text-red-500 mt-1">{errors.endDate.message}</p>}
          </div>
        </div>

        {startDate && endDate && workingDays > 0 && (
          <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-2.5">
            <Clock size={15} className="text-blue-600 dark:text-blue-400 shrink-0" />
            <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">{workingDays} working day{workingDays !== 1 ? 's' : ''}</span>
          </div>
        )}

        {isInsufficient && balEntry && (
          <div className="flex items-start gap-2 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
            <AlertTriangle size={15} className="text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
            <p className="text-sm text-red-600 dark:text-red-400">
              Insufficient balance. You have {balEntry.remaining} day{balEntry.remaining !== 1 ? 's' : ''} remaining for {selectedType?.name ?? 'this leave type'}.
            </p>
          </div>
        )}

        {(showMedCert || showSupportingDocs) && (
          <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3">
            <FileText size={15} className="text-amber-700 dark:text-amber-300 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-700 dark:text-amber-300">
              {showMedCert && 'Medical certificate required for 3 or more consecutive sick leave days.'}
              {showSupportingDocs && 'Supporting documents required for emergency leave.'}
            </p>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1" htmlFor="leave-reason">Reason <span className="text-red-500">*</span></label>
          <textarea id="leave-reason" rows={3} {...register('reason')} placeholder="Describe the reason for your leave (min. 10 characters)..." className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white resize-none" />
          {errors.reason && <p className="text-xs text-red-500 mt-1">{errors.reason.message}</p>}
        </div>

        <button type="submit" disabled={isSubmitting || isInsufficient} className="w-full sm:w-auto px-6 py-2.5 bg-brand-blue hover:bg-brand-blue-dark text-white rounded-xl font-semibold text-sm disabled:opacity-50 transition-colors">
          Submit Leave Request
        </button>
      </form>
    </motion.div>
  );
}

// ─── Tab 3: Leave History ─────────────────────────────────────────────────────

function LeaveHistoryTab({ requests, leaveTypes }: { requests: LeaveRequestListItem[]; leaveTypes: LeaveType[] }) {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const cancelMutation = useMutation({
    mutationFn: (id: string) => cancelLeaveRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaves', 'requests', user?.id] });
      toast.success('Leave request cancelled');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = [...requests]
    .filter((r) => statusFilter === 'all' || r.status === statusFilter)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  const statusChips = [
    { value: 'all', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
  ];

  function handleCancel(id: string, typeName: string) {
    const confirmed = window.confirm(`Cancel leave request for ${typeName}? This action cannot be undone.`);
    if (confirmed) cancelMutation.mutate(id);
  }

  return (
    <motion.div {...fadeUp(0)} className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-gray-500 dark:text-gray-400">Status:</span>
        {statusChips.map((chip) => (
          <button
            key={chip.value}
            type="button"
            onClick={() => setStatusFilter(chip.value)}
            className={[
              'px-3 py-1 rounded-full text-xs font-semibold transition-colors border',
              statusFilter === chip.value ? 'bg-brand-blue text-white border-brand-blue' : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-brand-blue',
            ].join(' ')}
          >
            {chip.label}
          </button>
        ))}
        <span className="text-xs text-gray-400 ml-2">{filtered.length} record{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {filtered.length === 0 ? (
        <div className={`${cardClass} py-16 text-center text-gray-400 dark:text-gray-500`}>
          <CalendarDays size={32} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium">No leave requests found</p>
          <p className="text-xs mt-1">Try changing the filter or filing a new leave request.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => {
            const type = leaveTypes.find((t) => t.id === r.leave_type_id);
            return (
              <div key={r.id} className={cardClass}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    {type && <LeaveTypeBadge code={type.code} />}
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{formatDateRange(r.start_date, r.end_date)}</span>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{r.reason}</p>
                <div className="flex items-center justify-between gap-3 pt-2 border-t border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span className="font-semibold text-gray-700 dark:text-gray-300 tabular-nums">{r.total_days} day{r.total_days !== 1 ? 's' : ''}</span>
                    <span>Filed {formatShortDate(r.created_at.slice(0, 10))}</span>
                  </div>
                  {r.status === 'pending' && (
                    <button
                      type="button"
                      onClick={() => handleCancel(r.id, type?.name ?? 'this leave')}
                      disabled={cancelMutation.isPending}
                      className="min-h-11 px-3 rounded-lg text-xs font-semibold border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 transition-colors disabled:opacity-60"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

// ─── Tab 4: Leave Policies ────────────────────────────────────────────────────

const faqItems = [
  { q: 'Can I file leave retroactively?', a: 'No. Leave must be filed before or on the day of absence (emergency leave excepted).' },
  { q: 'What happens to unused VL?', a: 'Up to 10 carry-over days are allowed. Unused SIL is convertible to cash.' },
  { q: 'How many days notice for VL?', a: 'At least 3 working days in advance.' },
];

function LeavePoliciesTab({ leaveTypes }: { leaveTypes: LeaveType[] }) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {leaveTypes.map((lt, i) => {
          const c = leaveColors[lt.code] ?? leaveColors.VL;
          const isNA = nonApplicableCodes.includes(lt.code);
          const citation = phLawCitations[lt.code];
          const fileableOnly = fileableTypes.includes(lt.code);

          return (
            <motion.div key={lt.id} {...fadeUp(i)} className={`${cardClass} p-0 overflow-hidden ${isNA ? 'opacity-60' : ''}`}>
              <div className={`${c.bg} px-5 py-4 border-b border-gray-200 dark:border-gray-800`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xl font-extrabold ${c.text}`}>{lt.code}</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${lt.is_paid ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                    {lt.is_paid ? 'With Pay' : 'Without Pay'}
                  </span>
                </div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">{lt.name}</p>
                {citation && <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">{citation}</p>}
              </div>

              <div className="px-5 py-4 space-y-3">
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{lt.description}</p>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg py-2">
                    <p className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">{lt.max_days_per_year ?? '∞'}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Days</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg py-2">
                    <p className={`text-sm font-bold tabular-nums ${lt.carry_over_days > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                      {lt.carry_over_days > 0 ? `+${lt.carry_over_days}` : 'No'}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Carry-Over</p>
                  </div>
                </div>

                {isNA && <p className="text-[10px] text-gray-400 italic text-center">Contact HR to verify eligibility</p>}
                {!isNA && fileableOnly && <p className={`text-[10px] font-medium ${c.text} text-center`}>Available to file</p>}
              </div>
            </motion.div>
          );
        })}
      </div>

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
                {openFaq === i ? <ChevronUp size={16} className="text-gray-400 shrink-0" /> : <ChevronDown size={16} className="text-gray-400 shrink-0" />}
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
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('balances');
  const [selectedLeaveTypeId, setSelectedLeaveTypeId] = useState('');
  const currentYear = new Date().getFullYear();

  const { data: leaveTypes, isLoading: typesLoading } = useQuery({
    queryKey: ['leaves', 'types', user?.organizationId],
    queryFn: () => listLeaveTypes(user!.organizationId) as Promise<LeaveType[]>,
    enabled: !!user?.organizationId,
  });

  const { data: balances, isLoading: balancesLoading } = useQuery({
    queryKey: ['leaves', 'balances', user?.id, currentYear],
    queryFn: () => getLeaveBalances(user!.id, currentYear) as Promise<LeaveBalance[]>,
    enabled: !!user?.id,
  });

  const { data: requests, isLoading: requestsLoading } = useQuery({
    queryKey: ['leaves', 'requests', user?.id],
    queryFn: () => listLeaveRequests(user!.id),
    enabled: !!user?.id,
  });

  function handleCardClick(typeId: string) {
    setSelectedLeaveTypeId(typeId);
    setActiveTab('file');
  }

  if (!user) return null;
  if (typesLoading || balancesLoading || requestsLoading) {
    return <div className={`${cardClass} py-16 text-center text-gray-400`}>Loading your leave info…</div>;
  }
  if (!leaveTypes || !balances || !requests) {
    return <div className={`${cardClass} py-16 text-center text-red-500`}>Couldn&apos;t load leave data.</div>;
  }

  const tabs = [
    { value: 'balances', label: 'My Balances',   icon: <CalendarDays size={15} /> },
    { value: 'file',     label: 'File Leave',     icon: <FileText size={15} /> },
    { value: 'history',  label: 'Leave History',  icon: <Clock size={15} /> },
    { value: 'policies', label: 'Leave Policies', icon: <BookOpen size={15} /> },
  ];

  return (
    <div className="space-y-4">
      <motion.div {...fadeUp(0)} className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 dark:text-white">My Leaves</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage your leave requests and balances</p>
        </div>
        <button
          type="button"
          onClick={() => setActiveTab('file')}
          className="px-5 py-2.5 bg-brand-blue hover:bg-brand-blue-dark text-white rounded-xl font-semibold text-sm flex items-center gap-2 transition-colors"
        >
          <FileText size={15} />
          File Leave
        </button>
      </motion.div>

      <SummaryStrip leaveTypes={leaveTypes} balances={balances} onCardClick={handleCardClick} />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1 mb-2">
          {tabs.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="flex items-center gap-1.5 text-sm">
              {t.icon}
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="balances"><BalancesTab leaveTypes={leaveTypes} balances={balances} /></TabsContent>
        <TabsContent value="file">
          <FileLeaveTab
            leaveTypes={leaveTypes}
            balances={balances}
            defaultLeaveTypeId={selectedLeaveTypeId}
            onSubmitSuccess={() => setActiveTab('history')}
          />
        </TabsContent>
        <TabsContent value="history"><LeaveHistoryTab requests={requests} leaveTypes={leaveTypes} /></TabsContent>
        <TabsContent value="policies"><LeavePoliciesTab leaveTypes={leaveTypes} /></TabsContent>
      </Tabs>
    </div>
  );
}
