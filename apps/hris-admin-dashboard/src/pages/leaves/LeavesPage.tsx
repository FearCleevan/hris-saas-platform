import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Palmtree, Activity, CalendarDays, BookOpen, BarChart2,
  CheckCircle2, XCircle, AlertCircle,
  ChevronLeft, ChevronRight, ChevronDown,
  Check, X, FileText, Shield, AlertTriangle, Users, Loader2,
} from 'lucide-react';
import {
  format, parseISO, getDaysInMonth, startOfMonth, getDay,
  eachDayOfInterval, isWeekend, subDays,
} from 'date-fns';
import { toast } from 'sonner';
import {
  useLeaveRequests,
  useLeaveBalances,
  useLeaveTypes,
  useApproveLeaveRequest,
  useRejectLeaveRequest,
  type LeaveRequestRow,
  type LeaveBalanceRow,
  type LeaveTypeRow,
} from '@/hooks/useLeaves';

type TabId = 'requests' | 'balances' | 'calendar' | 'types' | 'reports';
type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

const STATUS_CFG = {
  pending:  { label: 'Pending',  color: 'text-amber-600 dark:text-amber-400',  bg: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800' },
  approved: { label: 'Approved', color: 'text-green-600 dark:text-green-400',  bg: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800' },
  rejected: { label: 'Rejected', color: 'text-red-600 dark:text-red-400',      bg: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800' },
  cancelled:{ label: 'Cancelled',color: 'text-gray-500 dark:text-gray-400',   bg: 'bg-gray-50 dark:bg-gray-800/30 border-gray-200 dark:border-gray-700' },
  withdrawn:{ label: 'Withdrawn',color: 'text-gray-500 dark:text-gray-400',   bg: 'bg-gray-50 dark:bg-gray-800/30 border-gray-200 dark:border-gray-700' },
};

const LEAVE_CODE_COLORS: Record<string, string> = {
  VL:  'bg-brand-blue/10 text-brand-blue',
  SL:  'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400',
  SIL: 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400',
  ML:  'bg-pink-50 dark:bg-pink-950/30 text-pink-700 dark:text-pink-400',
  PL:  'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400',
  SPL: 'bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400',
  BL:  'bg-slate-50 dark:bg-slate-950/30 text-slate-700 dark:text-slate-400',
  EL:  'bg-red-50 dark:bg-red-950/30 text-brand-red dark:text-red-400',
};

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'requests',  label: 'Requests',    icon: Activity },
  { id: 'balances',  label: 'Balances',    icon: Palmtree },
  { id: 'calendar',  label: 'Calendar',    icon: CalendarDays },
  { id: 'types',     label: 'Leave Types', icon: BookOpen },
  { id: 'reports',   label: 'Reports',     icon: BarChart2 },
];

type DatePreset = 'all' | 'month' | '30d' | '90d';

const DATE_PRESETS: { id: DatePreset; label: string }[] = [
  { id: 'all',   label: 'All Time' },
  { id: 'month', label: 'This Month' },
  { id: '30d',   label: 'Last 30 Days' },
  { id: '90d',   label: 'Last 90 Days' },
];

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
}

function LeaveCodeBadge({ code }: { code: string }) {
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${LEAVE_CODE_COLORS[code] ?? 'bg-gray-100 text-gray-500'}`}>
      {code}
    </span>
  );
}

// ── Requests Tab ──────────────────────────────────────────────────────────────

function RequestsTab() {
  const { data: requests = [], isLoading } = useLeaveRequests();
  const approve = useApproveLeaveRequest();
  const reject  = useRejectLeaveRequest();

  const [filter,     setFilter]     = useState<StatusFilter>('all');
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [selected,   setSelected]   = useState<Set<string>>(new Set());
  const [docModal,   setDocModal]   = useState<string | null>(null);
  const [isBulk,     setIsBulk]     = useState(false);

  const now = useMemo(() => new Date(), []);

  const filtered = useMemo(() => {
    const cutoff =
      datePreset === 'month' ? startOfMonth(now) :
      datePreset === '30d'   ? subDays(now, 30) :
      datePreset === '90d'   ? subDays(now, 90) :
      null;

    return requests
      .filter((r) => filter === 'all' || r.status === filter)
      .filter((r) => !cutoff || new Date(r.submittedAt) >= cutoff)
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  }, [requests, filter, datePreset, now]);

  const pendingCount = useMemo(
    () => requests.filter((r) => r.status === 'pending').length,
    [requests],
  );

  const visiblePendingIds = useMemo(
    () => filtered.filter((r) => r.status === 'pending').map((r) => r.id),
    [filtered],
  );

  const allPendingSelected =
    visiblePendingIds.length > 0 && visiblePendingIds.every((id) => selected.has(id));

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAllPending = () => {
    if (allPendingSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        visiblePendingIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        visiblePendingIds.forEach((id) => next.add(id));
        return next;
      });
    }
  };

  const handleApprove = async (id: string) => {
    await approve.mutateAsync({ id });
    setSelected((prev) => { const n = new Set(prev); n.delete(id); return n; });
    toast.success('Leave request approved');
  };

  const handleReject = async (id: string) => {
    await reject.mutateAsync({ id });
    setSelected((prev) => { const n = new Set(prev); n.delete(id); return n; });
    toast.error('Leave request rejected');
  };

  const bulkApprove = async () => {
    const pending = [...selected].filter((id) =>
      requests.find((r) => r.id === id)?.status === 'pending',
    );
    setIsBulk(true);
    try {
      await Promise.all(pending.map((id) => approve.mutateAsync({ id })));
      toast.success(`${pending.length} request(s) approved`);
      setSelected(new Set());
    } finally {
      setIsBulk(false);
    }
  };

  const bulkReject = async () => {
    const pending = [...selected].filter((id) =>
      requests.find((r) => r.id === id)?.status === 'pending',
    );
    setIsBulk(true);
    try {
      await Promise.all(pending.map((id) => reject.mutateAsync({ id })));
      toast.error(`${pending.length} request(s) rejected`);
      setSelected(new Set());
    } finally {
      setIsBulk(false);
    }
  };

  const docReq = docModal ? requests.find((r) => r.id === docModal) : null;
  const isMutating = approve.isPending || reject.isPending || isBulk;

  return (
    <div className="relative pb-20">
      {/* Date Range Shortcuts */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className="text-xs font-semibold text-gray-400">Period:</span>
        {DATE_PRESETS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setDatePreset(id)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors ${
              datePreset === id
                ? 'bg-brand-blue text-white shadow-sm'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
        {datePreset !== 'all' && (
          <span className="text-xs text-gray-400 ml-auto">
            {filtered.length} result{filtered.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Filters + Select All */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
              filter === f
                ? 'bg-brand-blue text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {f}
            {f === 'pending' && pendingCount > 0 && (
              <span className="ml-1.5 bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
        {visiblePendingIds.length > 0 && (
          <button
            type="button"
            onClick={toggleSelectAllPending}
            className="ml-1 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-colors ${
              allPendingSelected ? 'bg-brand-blue border-brand-blue' : 'border-gray-300 dark:border-gray-600'
            }`}>
              {allPendingSelected && <Check className="w-2.5 h-2.5 text-white" />}
            </span>
            Select All Pending
          </button>
        )}
        {isLoading && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
        <span className="ml-auto text-xs text-gray-400">{filtered.length} records</span>
      </div>

      {/* Request cards */}
      <div className="flex flex-col gap-3">
        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-16 text-sm text-gray-400">No requests found</div>
        )}
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        )}
        {filtered.map((req, i) => {
          const stCfg = STATUS_CFG[req.status as keyof typeof STATUS_CFG] ?? STATUS_CFG.pending;
          const isPending  = req.status === 'pending';
          const isSelected = selected.has(req.id);

          return (
            <motion.div
              key={req.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className={`bg-white dark:bg-gray-900 border rounded-2xl p-4 transition-colors ${
                isSelected
                  ? 'border-brand-blue ring-1 ring-brand-blue/30'
                  : 'border-gray-200 dark:border-gray-800'
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Checkbox for pending */}
                {isPending && (
                  <button
                    type="button"
                    onClick={() => toggleSelect(req.id)}
                    className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                      isSelected ? 'bg-brand-blue border-brand-blue' : 'border-gray-300 dark:border-gray-600 hover:border-brand-blue'
                    }`}
                  >
                    {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                  </button>
                )}

                <div className="w-9 h-9 rounded-full bg-brand-blue flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {getInitials(req.employeeName)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-0.5">
                    <p className="text-sm font-semibold text-gray-800 dark:text-white">{req.employeeName}</p>
                    <LeaveCodeBadge code={req.leaveTypeCode} />
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${stCfg.bg} ${stCfg.color}`}>
                      {stCfg.label}
                    </span>
                    {req.isHalfDay && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400">
                        Half Day
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mb-2">{req.position} · {req.department}</p>

                  <div className="flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400 mb-2">
                    <span className="font-medium text-gray-700 dark:text-gray-300">{req.leaveTypeName}</span>
                    <span>
                      {format(parseISO(req.startDate), 'MMM d')}
                      {req.startDate !== req.endDate && ` – ${format(parseISO(req.endDate), 'MMM d, yyyy')}`}
                      {req.startDate === req.endDate && `, ${format(parseISO(req.startDate), 'yyyy')}`}
                    </span>
                    <span className="font-semibold text-gray-700 dark:text-gray-300">
                      {req.days} day{req.days !== 1 ? 's' : ''}
                    </span>
                  </div>

                  <p className="text-xs text-gray-500 dark:text-gray-400 italic mb-2">"{req.reason}"</p>

                  {/* Document preview button */}
                  {req.documents.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setDocModal(req.id)}
                      className="flex items-center gap-1 text-[10px] text-brand-blue hover:underline mb-1.5"
                    >
                      <FileText className="w-3 h-3" />
                      {req.documents.length} document{req.documents.length !== 1 ? 's' : ''} attached — view
                    </button>
                  )}

                  {req.approvedByName && req.approvedAt && (
                    <p className="text-[10px] text-gray-400">
                      {req.status === 'approved' ? 'Approved' : 'Rejected'} by {req.approvedByName}
                      {` · ${format(new Date(req.approvedAt), 'MMM d, yyyy h:mm a')}`}
                      {req.notes ? ` — "${req.notes}"` : ''}
                    </p>
                  )}
                  {!req.approvedByName && req.approvedAt && (
                    <p className="text-[10px] text-gray-400">
                      {req.status === 'approved' ? 'Approved' : 'Reviewed'}
                      {` · ${format(new Date(req.approvedAt), 'MMM d, yyyy h:mm a')}`}
                    </p>
                  )}
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    Submitted {format(new Date(req.submittedAt), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>

                {isPending && (
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleApprove(req.id)}
                      disabled={isMutating}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-500 hover:bg-green-600 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                    >
                      {approve.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReject(req.id)}
                      disabled={isMutating}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-950/30 text-gray-500 hover:text-brand-red border border-gray-200 dark:border-gray-700 text-xs font-semibold transition-colors disabled:opacity-50"
                    >
                      {reject.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Floating bulk action bar */}
      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.18 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 bg-gray-900 dark:bg-white rounded-2xl shadow-2xl max-w-[calc(100vw-2rem)] overflow-x-auto"
          >
            <span className="text-sm font-semibold text-white dark:text-gray-900">
              {selected.size} selected
            </span>
            {isBulk && <Loader2 className="w-4 h-4 animate-spin text-gray-400 dark:text-gray-500" />}
            <div className="w-px h-4 bg-gray-700 dark:bg-gray-300" />
            <button
              type="button"
              onClick={bulkApprove}
              disabled={isBulk}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-500 hover:bg-green-400 text-white text-xs font-bold transition-colors disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Approve All
            </button>
            <button
              type="button"
              onClick={bulkReject}
              disabled={isBulk}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500 hover:bg-red-400 text-white text-xs font-bold transition-colors disabled:opacity-50"
            >
              <XCircle className="w-3.5 h-3.5" />
              Reject All
            </button>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              disabled={isBulk}
              className="text-xs text-gray-400 dark:text-gray-500 hover:text-white dark:hover:text-gray-800 transition-colors disabled:opacity-50"
            >
              Clear
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Document preview modal */}
      <AnimatePresence>
        {docReq && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            onClick={() => setDocModal(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl border border-gray-200 dark:border-gray-700"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-gray-800 dark:text-white">Attached Documents</h3>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {docReq.employeeName} · {docReq.leaveTypeName}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={() => setDocModal(null)}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
              <div className="flex flex-col gap-2">
                {docReq.documents.map((doc) => {
                  const filename = doc.split('/').pop() ?? doc;
                  const ext = filename.split('.').pop()?.toUpperCase() ?? 'FILE';
                  return (
                    <a
                      key={doc}
                      href={doc}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-brand-blue/10 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-brand-blue" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{filename}</p>
                        <p className="text-[10px] text-gray-400">{ext} document</p>
                      </div>
                    </a>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Balances Tab ──────────────────────────────────────────────────────────────

function BalancesTab() {
  const { data: balances = [], isLoading } = useLeaveBalances();
  const [deptFilter, setDeptFilter] = useState('all');

  const departments = useMemo(
    () => ['all', ...new Set(balances.map((b) => b.department))].sort(),
    [balances],
  );

  const rows = useMemo(
    () => balances.filter((b) => deptFilter === 'all' || b.department === deptFilter),
    [balances, deptFilter],
  );

  const expiringDays  = rows.reduce((sum, r) => sum + r.sil.remaining, 0);
  const expiringCount = rows.filter((r) => r.sil.remaining > 0).length;

  function Bar({ used, remaining, pending, color }: { used: number; remaining: number; pending: number; color: string }) {
    const total = used + remaining + pending;
    if (total === 0) return <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full" />;
    return (
      <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden flex">
        <div className="h-full rounded-l-full" style={{ width: `${(used / total) * 100}%`, backgroundColor: color, opacity: 0.9 }} />
        {pending > 0 && (
          <div className="h-full bg-amber-300" style={{ width: `${(pending / total) * 100}%` }} />
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Expiry alert banner */}
      {expiringDays > 0 && (
        <div className="flex items-start gap-3 mb-4 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
              {expiringDays} SIL day{expiringDays !== 1 ? 's' : ''} expiring Dec 31 — {expiringCount} employee{expiringCount !== 1 ? 's' : ''} affected
            </p>
            <p className="text-[10px] text-amber-600 dark:text-amber-500 mt-0.5">
              Service Incentive Leave has no carry-over. Unused days must be monetized or are forfeited at year-end.
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 mb-5">
        <div className="relative">
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            title="Filter by department"
            className="h-9 appearance-none pl-3 pr-8 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-blue/40 transition-colors"
          >
            {departments.map((d) => (
              <option key={d} value={d}>{d === 'all' ? 'All Departments' : d}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        </div>
        {isLoading
          ? <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
          : <span className="text-xs text-gray-400">{rows.length} employees</span>
        }

        {/* Legend */}
        <div className="ml-auto flex items-center gap-3 text-[10px] text-gray-400">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-brand-blue inline-block" />Used</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-300 inline-block" />Pending</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-gray-200 dark:bg-gray-700 inline-block" />Remaining</span>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Employee</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 hidden sm:table-cell">Dept</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 w-40">VL</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 w-40 hidden md:table-cell">SL</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 w-40 hidden lg:table-cell">
                  <span className="flex items-center gap-1">
                    SIL
                    <span title="No carry-over — expires Dec 31">
                      <AlertCircle className="w-3 h-3 text-amber-500" />
                    </span>
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
                  </td>
                </tr>
              )}
              {!isLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-sm text-gray-400">
                    No balance data available
                  </td>
                </tr>
              )}
              {rows.map((row, i) => (
                <tr
                  key={row.employeeId}
                  className={`${i < rows.length - 1 ? 'border-b border-gray-50 dark:border-gray-800/80' : ''} hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors`}
                >
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-brand-blue flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                        {getInitials(row.employeeName)}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 leading-tight">{row.employeeName}</p>
                        <p className="text-[10px] text-gray-400">{row.position}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 hidden sm:table-cell">
                    <span className="text-xs text-gray-500 dark:text-gray-400">{row.department}</span>
                  </td>
                  <td className="px-4 py-2.5 w-40">
                    <div className="mb-0.5">
                      <Bar used={row.vl.used} remaining={row.vl.remaining} pending={row.vl.pending} color="#0038a8" />
                    </div>
                    <p className="text-[10px] text-gray-500">
                      <span className="font-semibold text-gray-700 dark:text-gray-300">{row.vl.remaining}</span> left · {row.vl.used} used
                      {row.vl.pending > 0 && <span className="text-amber-600"> · {row.vl.pending} pending</span>}
                    </p>
                  </td>
                  <td className="px-4 py-2.5 w-40 hidden md:table-cell">
                    <div className="mb-0.5">
                      <Bar used={row.sl.used} remaining={row.sl.remaining} pending={row.sl.pending} color="#f59e0b" />
                    </div>
                    <p className="text-[10px] text-gray-500">
                      <span className="font-semibold text-gray-700 dark:text-gray-300">{row.sl.remaining}</span> left · {row.sl.used} used
                      {row.sl.pending > 0 && <span className="text-amber-600"> · {row.sl.pending} pending</span>}
                    </p>
                  </td>
                  <td className="px-4 py-2.5 w-40 hidden lg:table-cell">
                    <div className="mb-0.5">
                      <Bar used={row.sil.used} remaining={row.sil.remaining} pending={0} color="#10b981" />
                    </div>
                    <p className="text-[10px] text-gray-500 flex items-center gap-1">
                      <span className="font-semibold text-gray-700 dark:text-gray-300">{row.sil.remaining}</span> left · {row.sil.used} used
                      {row.sil.remaining > 0 && (
                        <span title="Expires Dec 31 — no carry-over">
                          <AlertCircle className="w-3 h-3 text-amber-500 inline" />
                        </span>
                      )}
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Calendar Tab ──────────────────────────────────────────────────────────────

function CalendarTab() {
  const { data: requests = [], isLoading } = useLeaveRequests();

  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [deptFilter, setDeptFilter] = useState('all');

  const departments = useMemo(
    () => ['all', ...new Set(requests.map((r) => r.department))].sort(),
    [requests],
  );

  const approvedLeaves = useMemo(
    () =>
      requests
        .filter((r) => r.status === 'approved')
        .filter((r) => deptFilter === 'all' || r.department === deptFilter),
    [requests, deptFilter],
  );

  const leaveMap = useMemo(() => {
    const map: Record<string, { empId: string; empName: string; code: string }[]> = {};
    for (const req of approvedLeaves) {
      try {
        const days = eachDayOfInterval({ start: parseISO(req.startDate), end: parseISO(req.endDate) });
        for (const day of days) {
          if (!isWeekend(day)) {
            const key = format(day, 'yyyy-MM-dd');
            if (!map[key]) map[key] = [];
            map[key].push({ empId: req.employeeId, empName: req.employeeName, code: req.leaveTypeCode });
          }
        }
      } catch {
        /* skip invalid intervals */
      }
    }
    return map;
  }, [approvedLeaves]);

  const year  = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const daysInMonth    = getDaysInMonth(viewMonth);
  const firstDayOfWeek = getDay(viewMonth);

  const cells: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div>
      {/* Controls */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <button
          type="button"
          title="Previous month"
          aria-label="Previous month"
          onClick={() => setViewMonth(new Date(year, month - 1, 1))}
          className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <ChevronLeft className="w-4 h-4 text-gray-500" />
        </button>
        <div className="flex items-center gap-3">
          <h2 className="text-base font-bold text-gray-800 dark:text-white">
            {format(viewMonth, 'MMMM yyyy')}
          </h2>
          {isLoading && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
          {/* Department filter */}
          <div className="relative">
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              title="Filter by department"
              className="h-8 appearance-none pl-3 pr-7 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-medium text-gray-700 dark:text-gray-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-blue/40 transition-colors"
            >
              {departments.map((d) => (
                <option key={d} value={d}>{d === 'all' ? 'All Departments' : d}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          </div>
        </div>
        <button
          type="button"
          title="Next month"
          aria-label="Next month"
          onClick={() => setViewMonth(new Date(year, month + 1, 1))}
          className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <ChevronRight className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="text-center text-xs font-semibold text-gray-400 dark:text-gray-500 py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, idx) => {
          if (!day) return <div key={`e-${idx}`} />;
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const isWeekendDay = idx % 7 === 0 || idx % 7 === 6;
          const leaves = leaveMap[dateStr] ?? [];

          return (
            <div
              key={dateStr}
              className={`rounded-lg p-1.5 min-h-18 border transition-colors ${
                isWeekendDay
                  ? 'bg-gray-50 dark:bg-gray-800/20 border-transparent'
                  : leaves.length > 0
                  ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/30'
                  : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-medium ${isWeekendDay ? 'text-gray-300 dark:text-gray-600' : 'text-gray-600 dark:text-gray-400'}`}>
                  {day}
                </span>
                {leaves.length > 0 && (
                  <span className="flex items-center gap-0.5 text-[8px] font-bold text-brand-blue bg-brand-blue/10 px-1 py-0.5 rounded-full">
                    <Users className="w-2 h-2" />{leaves.length}
                  </span>
                )}
              </div>
              {leaves.slice(0, 2).map((l, li) => (
                <div key={`${l.empId}-${li}`} className="flex items-center gap-1 mb-0.5">
                  <span className={`text-[8px] font-bold px-1 py-0.5 rounded ${LEAVE_CODE_COLORS[l.code] ?? 'bg-gray-100 text-gray-500'}`}>
                    {l.code}
                  </span>
                  <span className="text-[9px] text-gray-500 dark:text-gray-400 truncate">
                    {l.empName.split(' ')[0]}
                  </span>
                </div>
              ))}
              {leaves.length > 2 && (
                <span className="text-[9px] text-gray-400">+{leaves.length - 2} more</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Leave Types Tab ───────────────────────────────────────────────────────────

function LeaveTypesTab() {
  const { data: types = [], isLoading } = useLeaveTypes();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {types.map((lt, i) => (
        <motion.div
          key={lt.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 sm:p-5"
        >
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0"
              style={{ backgroundColor: lt.color }}
            >
              {lt.code}
            </div>
            <div>
              <p className="text-sm font-bold text-gray-800 dark:text-white leading-tight">{lt.name}</p>
              <p className="text-xs text-gray-400">{lt.daysPerYear} days/year</p>
            </div>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 leading-relaxed">{lt.description}</p>

          <div className="flex flex-wrap gap-1.5 mb-3">
            {lt.isPaid && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400">
                Paid
              </span>
            )}
            {lt.isMonetizable && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-brand-blue/10 text-brand-blue">
                Monetizable
              </span>
            )}
            {lt.maxCarryOver > 0 ? (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400">
                Carry over: {lt.maxCarryOver}d
              </span>
            ) : (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <AlertCircle className="w-2.5 h-2.5" />No carry-over
              </span>
            )}
          </div>

          {lt.requiresDocuments && (
            <div className="flex items-start gap-1.5 bg-amber-50 dark:bg-amber-950/20 rounded-lg px-3 py-2">
              <FileText className="w-3 h-3 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[10px] text-amber-700 dark:text-amber-400 leading-relaxed">{lt.documentNote}</p>
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}

// ── Reports Tab ───────────────────────────────────────────────────────────────

function ReportsTab() {
  const { data: requests = [], isLoading: loadingReqs } = useLeaveRequests();
  const { data: types = [],    isLoading: loadingTypes } = useLeaveTypes();
  const { data: balances = [], isLoading: loadingBals }  = useLeaveBalances();

  const currentYear = new Date().getFullYear();
  const isLoading   = loadingReqs || loadingTypes || loadingBals;

  const { byType, byDept, totalLeavedays } = useMemo(() => {
    const typeMap: Record<string, number> = {};
    const deptMap: Record<string, number> = {};
    let total = 0;

    for (const req of requests.filter((r) => r.status === 'approved')) {
      typeMap[req.leaveTypeCode] = (typeMap[req.leaveTypeCode] ?? 0) + req.days;
      if (req.department) deptMap[req.department] = (deptMap[req.department] ?? 0) + req.days;
      total += req.days;
    }

    return {
      byType: Object.entries(typeMap).sort((a, b) => b[1] - a[1]),
      byDept: Object.entries(deptMap).sort((a, b) => b[1] - a[1]),
      totalLeavedays: total,
    };
  }, [requests]);

  const maxType = byType[0]?.[1] ?? 1;
  const maxDept = byDept[0]?.[1] ?? 1;

  const totalByStatus = useMemo(() => ({
    approved: requests.filter((r) => r.status === 'approved').length,
    pending:  requests.filter((r) => r.status === 'pending').length,
    rejected: requests.filter((r) => r.status === 'rejected').length,
  }), [requests]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Leave Days Taken</p>
          <p className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white">{totalLeavedays}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Approved requests only</p>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
          <p className="text-xs text-gray-400 mb-1">Approved</p>
          <p className="text-xl sm:text-2xl font-extrabold text-green-600 dark:text-green-400">{totalByStatus.approved}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
          <p className="text-xs text-gray-400 mb-1">Pending</p>
          <p className="text-xl sm:text-2xl font-extrabold text-amber-600 dark:text-amber-400">{totalByStatus.pending}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
          <p className="text-xs text-gray-400 mb-1">Rejected</p>
          <p className="text-xl sm:text-2xl font-extrabold text-brand-red">{totalByStatus.rejected}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* By Leave Type */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 sm:p-5">
          <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-4">Days Taken by Leave Type</h3>
          {byType.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">No approved leave data</p>
          ) : (
            <div className="flex flex-col gap-3">
              {byType.map(([code, days]) => {
                const lt = types.find((t) => t.code === code);
                return (
                  <div key={code} className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                      style={{ backgroundColor: lt?.color ?? '#9ca3af' }}
                    >
                      {code}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{lt?.name ?? code}</span>
                        <span className="text-xs font-bold text-gray-800 dark:text-white ml-2 shrink-0">{days}d</span>
                      </div>
                      <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${(days / maxType) * 100}%`, backgroundColor: lt?.color ?? '#9ca3af' }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* By Department */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 sm:p-5">
          <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-4">Days Taken by Department</h3>
          {byDept.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">No approved leave data</p>
          ) : (
            <div className="flex flex-col gap-3">
              {byDept.map(([dept, days]) => (
                <div key={dept} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 dark:text-gray-400 w-24 shrink-0 truncate">{dept}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-brand-blue"
                          style={{ width: `${(days / maxDept) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-gray-700 dark:text-gray-300 w-8 text-right shrink-0">{days}d</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Company-wide balance summary */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 sm:p-5">
        <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-4">
          Company-Wide Balance Summary ({currentYear})
        </h3>
        {balances.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-8">No balance data for {currentYear}</p>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {(['vl', 'sl', 'sil'] as const).map((type) => {
              const totals = balances.reduce(
                (acc, b) => ({
                  entitled:  acc.entitled + b[type].entitled + b[type].carryOver,
                  used:      acc.used + b[type].used,
                  remaining: acc.remaining + b[type].remaining,
                }),
                { entitled: 0, used: 0, remaining: 0 },
              );
              const pct = totals.entitled > 0 ? Math.round((totals.used / totals.entitled) * 100) : 0;
              const lt  = types.find((t) => t.code === type.toUpperCase());
              return (
                <div key={type} className="text-center">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold mx-auto mb-2"
                    style={{ backgroundColor: lt?.color ?? '#9ca3af' }}
                  >
                    {type.toUpperCase()}
                  </div>
                  <p className="text-xs font-semibold text-gray-500 mb-1">{lt?.name ?? type.toUpperCase()}</p>
                  <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mb-1">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: lt?.color ?? '#9ca3af' }} />
                  </div>
                  <p className="text-[10px] text-gray-400">
                    {totals.used} used / {totals.entitled} entitled · {pct}% utilization
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function LeavesPage() {
  const [activeTab, setActiveTab] = useState<TabId>('requests');
  const { data: requests = [] }   = useLeaveRequests();

  const pendingCount = useMemo(
    () => requests.filter((r) => r.status === 'pending').length,
    [requests],
  );

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5 sm:mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white">Leave Management</h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            VL · SL · SIL · ML · PL · SPL · BL · EL — Philippine Labor Code compliant
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-gray-400" />
          <span className="text-xs text-gray-400">RA 11199 · RA 11210 · RA 8187</span>
          {pendingCount > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab('requests')}
              className="ml-2 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 font-semibold text-xs border border-amber-200 dark:border-amber-800 hover:bg-amber-100 transition-colors"
            >
              {pendingCount} pending
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1 scrollbar-none">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-brand-blue text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.id === 'requests' && pendingCount > 0 && activeTab !== 'requests' && (
                <span className="bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                  {pendingCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18 }}
        >
          {activeTab === 'requests' && <RequestsTab />}
          {activeTab === 'balances' && <BalancesTab />}
          {activeTab === 'calendar' && <CalendarTab />}
          {activeTab === 'types'    && <LeaveTypesTab />}
          {activeTab === 'reports'  && <ReportsTab />}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}