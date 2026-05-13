import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, CheckCircle2, Clock, AlertCircle,
  Calendar, FileText, DollarSign, MessageSquare, Download,
  User, Banknote, XCircle, Loader2,
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { DatePicker } from '@/components/ui/date-picker';
import {
  useOffboardingDetail,
  useUpdateClearance,
  useUpsertExitInterview,
  useUpdateFinalPay,
} from '@/hooks/useOffboarding';
import type { ClearanceItem, ExitInterview, FinalPayBreakdown } from '@/hooks/useOffboarding';

// ── Config ────────────────────────────────────────────────────────────────────

const statusConfig = {
  in_progress: { label: 'In Progress', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800' },
  completed:   { label: 'Completed',   color: 'text-green-600 dark:text-green-400',  bg: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800' },
};

const exitInterviewConfig = {
  pending:   { label: 'Not Scheduled', color: 'text-gray-500',                        bg: 'bg-gray-100 dark:bg-gray-800' },
  scheduled: { label: 'Scheduled',     color: 'text-blue-600 dark:text-blue-400',     bg: 'bg-blue-50 dark:bg-blue-950/30' },
  done:      { label: 'Completed',     color: 'text-green-600 dark:text-green-400',   bg: 'bg-green-50 dark:bg-green-950/30' },
};

const finalPaySteps: { key: 'computed' | 'approved' | 'released'; label: string }[] = [
  { key: 'computed', label: 'Mark as Computed' },
  { key: 'approved', label: 'Mark as Approved' },
  { key: 'released', label: 'Mark as Released' },
];

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 sm:p-5">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">{title}</h3>
      {children}
    </div>
  );
}

function PayRow({ label, value, deduction }: { label: string; value: number; deduction?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-800 last:border-0">
      <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
      <span className={`text-sm font-medium ${deduction ? 'text-red-500' : 'text-gray-800 dark:text-gray-200'}`}>
        {deduction ? '−' : '+'}₱{value.toLocaleString()}
      </span>
    </div>
  );
}

// ── Clearance Tab ─────────────────────────────────────────────────────────────

function ClearanceTab({
  items,
  offboardingId,
  overallStatus,
}: {
  items: ClearanceItem[];
  offboardingId: string;
  overallStatus: string;
}) {
  const { mutate: updateClearance, isPending } = useUpdateClearance();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  function toggle(item: ClearanceItem) {
    if (overallStatus === 'completed' || isPending) return;
    const next = item.status === 'cleared' ? 'pending' : 'cleared';
    setLoadingId(item.id);
    updateClearance(
      { clearanceProgressId: item.id, status: next, offboardingId },
      {
        onSuccess: () => {
          toast.success(next === 'cleared' ? `${item.department} cleared` : `${item.department} marked pending`);
          setLoadingId(null);
        },
        onError: (err) => {
          toast.error(err.message ?? 'Failed to update clearance');
          setLoadingId(null);
        },
      },
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => {
        const isLoading = loadingId === item.id;
        const cleared   = item.status === 'cleared';
        const held      = item.status === 'held';
        return (
          <div
            key={item.id}
            className={`bg-white dark:bg-gray-900 border rounded-2xl p-4 flex items-start gap-4 transition-colors ${
              cleared ? 'border-green-200 dark:border-green-800'
              : held  ? 'border-red-200 dark:border-red-800'
              :         'border-gray-200 dark:border-gray-800'
            } ${overallStatus !== 'completed' ? 'cursor-pointer hover:border-brand-blue/30' : ''}`}
            onClick={() => toggle(item)}
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
              cleared ? 'bg-green-50 dark:bg-green-950/30'
              : held  ? 'bg-red-50 dark:bg-red-950/30'
              :         'bg-gray-100 dark:bg-gray-800'
            }`}>
              {isLoading
                ? <Loader2 className="w-5 h-5 text-brand-blue animate-spin" />
                : cleared
                  ? <CheckCircle2 className="w-5 h-5 text-green-500" />
                  : held
                    ? <XCircle className="w-5 h-5 text-red-500" />
                    : <Clock className="w-5 h-5 text-gray-400" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-sm font-semibold text-gray-800 dark:text-white">{item.title}</p>
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                  cleared ? 'bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400'
                  : held  ? 'bg-red-50 dark:bg-red-950/30 text-red-500'
                  :         'bg-gray-100 dark:bg-gray-800 text-gray-500'
                }`}>
                  {cleared ? 'Cleared' : held ? 'On Hold' : 'Pending'}
                </span>
              </div>
              <p className="text-xs text-gray-400">{item.department}</p>
              {item.remarks && <p className="text-xs text-gray-400 mt-0.5">{item.remarks}</p>}
              {cleared && item.clearedAt && (
                <p className="text-[10px] text-gray-400 mt-1">
                  {item.clearedByName ? `Cleared by ${item.clearedByName} · ` : ''}
                  {format(new Date(item.clearedAt), 'MMM d, yyyy')}
                </p>
              )}
            </div>
          </div>
        );
      })}

      {items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-14 border border-dashed border-gray-200 dark:border-gray-700 rounded-2xl text-center">
          <CheckCircle2 className="w-8 h-8 text-gray-200 dark:text-gray-700 mb-2" />
          <p className="text-sm text-gray-400">No clearance items configured</p>
        </div>
      )}
    </div>
  );
}

// ── Exit Interview Tab ────────────────────────────────────────────────────────

function ExitInterviewTab({
  interview,
  offboardingId,
  overallStatus,
}: {
  interview: ExitInterview;
  offboardingId: string;
  overallStatus: string;
}) {
  const { mutate: upsert, isPending } = useUpsertExitInterview();
  const [scheduledAt, setScheduledAt] = useState(interview.scheduledAt?.split('T')[0] ?? '');
  const exitCfg = exitInterviewConfig[interview.status];

  function scheduleInterview() {
    if (!scheduledAt) { toast.error('Please pick a date'); return; }
    upsert(
      { offboardingId, scheduledAt: new Date(scheduledAt).toISOString() },
      {
        onSuccess: () => toast.success('Exit interview scheduled'),
        onError:   (err) => toast.error(err.message ?? 'Failed to schedule'),
      },
    );
  }

  function markDone() {
    upsert(
      { offboardingId, conductedAt: new Date().toISOString() },
      {
        onSuccess: () => toast.success('Exit interview marked as completed'),
        onError:   (err) => toast.error(err.message ?? 'Failed to update'),
      },
    );
  }

  return (
    <SectionCard title="Exit Interview">
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <MessageSquare className="w-5 h-5 text-brand-blue shrink-0" />
        <div>
          <p className="text-sm font-medium text-gray-800 dark:text-white">Status</p>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${exitCfg.bg} ${exitCfg.color}`}>
            {exitCfg.label}
          </span>
        </div>
        {interview.scheduledAt && (
          <div className="ml-4">
            <p className="text-xs text-gray-400">Scheduled for</p>
            <p className="text-sm font-medium text-gray-800 dark:text-white">
              {format(new Date(interview.scheduledAt), 'MMMM d, yyyy')}
            </p>
          </div>
        )}
      </div>

      {interview.status === 'done' ? (
        <div className="space-y-4">
          <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-xl text-sm text-green-700 dark:text-green-300">
            Exit interview completed
            {interview.conductedAt && ` on ${format(new Date(interview.conductedAt), 'MMMM d, yyyy')}`}.
          </div>
          {interview.primaryReason && (
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Primary reason for leaving</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{interview.primaryReason}</p>
            </div>
          )}
          {interview.feedback && (
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Feedback</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{interview.feedback}</p>
            </div>
          )}
          {interview.satisfactionScore !== null && (
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Satisfaction score</p>
              <p className="text-sm font-semibold text-gray-800 dark:text-white">{interview.satisfactionScore}/10</p>
            </div>
          )}
          {interview.wouldRecommend !== null && (
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Would recommend as employer</p>
              <p className="text-sm font-semibold text-gray-800 dark:text-white">{interview.wouldRecommend ? 'Yes' : 'No'}</p>
            </div>
          )}
        </div>
      ) : overallStatus === 'completed' ? (
        <div className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-500 dark:text-gray-400">
          Offboarding completed without a recorded exit interview.
        </div>
      ) : (
        <div className="space-y-4">
          {/* Schedule */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1.5">
              {interview.status === 'scheduled' ? 'Reschedule date' : 'Schedule date'}
            </label>
            <div className="flex gap-2">
              <div className="flex-1">
                <DatePicker
                  value={scheduledAt}
                  onChange={setScheduledAt}
                  placeholder="Select interview date"
                />
              </div>
              <Button
                size="sm"
                onClick={scheduleInterview}
                disabled={isPending || !scheduledAt}
                className="bg-brand-blue hover:bg-brand-blue-dark text-white flex items-center gap-1.5"
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
                {interview.status === 'scheduled' ? 'Reschedule' : 'Schedule'}
              </Button>
            </div>
          </div>

          {/* Mark done */}
          {interview.status === 'scheduled' && (
            <Button
              size="sm"
              variant="outline"
              onClick={markDone}
              disabled={isPending}
              className="flex items-center gap-1.5 border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/30"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Mark Interview as Done
            </Button>
          )}

          {/* Placeholder form fields */}
          <div className="mt-2 border-t border-gray-100 dark:border-gray-800 pt-4 space-y-3">
            {[
              'Overall satisfaction with the company',
              'Reason for leaving',
              'Feedback on management',
              'Would you recommend us as an employer?',
              'Suggestions for improvement',
            ].map((q) => (
              <div key={q}>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{q}</p>
                <textarea
                  disabled
                  placeholder="Collected during exit interview…"
                  className="w-full h-14 px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-400 resize-none"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </SectionCard>
  );
}

// ── Final Pay Tab ─────────────────────────────────────────────────────────────

function FinalPayTab({
  offboardingId,
  finalPay,
  finalPayStatus,
  finalPayAmount,
  overallStatus,
}: {
  offboardingId: string;
  finalPay: FinalPayBreakdown | null;
  finalPayStatus: string;
  finalPayAmount: number | null;
  overallStatus: string;
}) {
  const { mutate: updateFinalPay, isPending } = useUpdateFinalPay();
  const [inputAmount, setInputAmount] = useState(
    finalPayAmount != null ? String(finalPayAmount) : '',
  );

  const nextStep = finalPaySteps.find((s) => {
    if (finalPayStatus === 'pending')   return s.key === 'computed';
    if (finalPayStatus === 'computed')  return s.key === 'approved';
    if (finalPayStatus === 'approved')  return s.key === 'released';
    return false;
  });

  function advance() {
    if (!nextStep) return;
    const amount = nextStep.key === 'computed' && inputAmount
      ? parseFloat(inputAmount)
      : undefined;
    updateFinalPay(
      { offboardingId, status: nextStep.key, amount },
      {
        onSuccess: () => toast.success(`Final pay ${nextStep!.key}`),
        onError:   (err) => toast.error(err.message ?? 'Failed to update final pay'),
      },
    );
  }

  const statusLabels: Record<string, string> = {
    pending:  'Pending',
    computed: 'Computed',
    approved: 'Approved',
    released: 'Released',
  };

  const released = finalPayStatus === 'released';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Breakdown */}
      <SectionCard title="Final Pay Breakdown">
        {finalPay ? (
          <>
            <PayRow label="Basic Pay (remaining days)"   value={finalPay.basicPayRemaining} />
            <PayRow label="Unused Leave Conversion"      value={finalPay.unusedLeaveConversion} />
            <PayRow label="13th Month Pay (pro-rated)"  value={finalPay.thirteenthMonthPro} />
            {finalPay.sssLoanDeduction > 0    && <PayRow label="SSS Loan Deduction"     value={finalPay.sssLoanDeduction}    deduction />}
            {finalPay.pagibigLoanDeduction > 0 && <PayRow label="Pag-IBIG Loan Deduction" value={finalPay.pagibigLoanDeduction} deduction />}
            {finalPay.otherDeductions > 0     && <PayRow label="Other Deductions"        value={finalPay.otherDeductions}     deduction />}
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <span className="text-sm font-bold text-gray-900 dark:text-white">Net Final Pay</span>
              <span className="text-lg font-extrabold text-brand-blue">₱{finalPay.netFinalPay.toLocaleString()}</span>
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-gray-400">Enter the computed net final pay amount below to begin processing.</p>
            <input
              type="number"
              min="0"
              value={inputAmount}
              onChange={(e) => setInputAmount(e.target.value)}
              placeholder="Net final pay amount (₱)"
              disabled={finalPayStatus !== 'pending' || overallStatus === 'completed'}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue/40 disabled:opacity-50"
            />
            {finalPayAmount != null && (
              <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
                <span className="text-sm font-bold text-gray-900 dark:text-white">Net Final Pay</span>
                <span className="text-lg font-extrabold text-brand-blue">₱{finalPayAmount.toLocaleString()}</span>
              </div>
            )}
          </div>
        )}
      </SectionCard>

      {/* Release Status */}
      <SectionCard title="Release Status">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            released ? 'bg-green-50 dark:bg-green-950/30' : 'bg-amber-50 dark:bg-amber-950/30'
          }`}>
            {released
              ? <CheckCircle2 className="w-5 h-5 text-green-500" />
              : <Clock className="w-5 h-5 text-amber-500" />
            }
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800 dark:text-white">
              Final Pay {statusLabels[finalPayStatus] ?? finalPayStatus}
            </p>
            <p className="text-xs text-gray-400">
              {released
                ? 'Transferred to registered bank account.'
                : 'Will be processed within 30 days after last day.'}
            </p>
          </div>
        </div>

        {/* Progress steps */}
        <div className="flex items-center gap-1 mb-4">
          {(['pending', 'computed', 'approved', 'released'] as const).map((step, i) => {
            const stepOrder = { pending: 0, computed: 1, approved: 2, released: 3 };
            const currentOrder = stepOrder[finalPayStatus as keyof typeof stepOrder] ?? 0;
            const thisOrder = stepOrder[step];
            const done = thisOrder <= currentOrder;
            return (
              <div key={step} className="flex items-center flex-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                  done ? 'bg-brand-blue text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                }`}>
                  {i + 1}
                </div>
                {i < 3 && (
                  <div className={`flex-1 h-0.5 mx-1 ${
                    thisOrder < currentOrder ? 'bg-brand-blue' : 'bg-gray-100 dark:bg-gray-800'
                  }`} />
                )}
              </div>
            );
          })}
        </div>
        <div className="flex justify-between text-[10px] text-gray-400 mb-4 -mt-2">
          <span>Pending</span><span>Computed</span><span>Approved</span><span>Released</span>
        </div>

        <div className="flex items-start gap-2 text-xs text-gray-400 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-xl border border-blue-100 dark:border-blue-900 mb-4">
          <Banknote className="w-4 h-4 text-brand-blue shrink-0 mt-0.5" />
          Per DOLE rules, final pay must be released within 30 days from the last day of employment.
        </div>

        {nextStep && overallStatus !== 'completed' && (
          <Button
            size="sm"
            onClick={advance}
            disabled={isPending || (nextStep.key === 'computed' && !inputAmount && !finalPay)}
            className="w-full bg-brand-blue hover:bg-brand-blue-dark text-white flex items-center justify-center gap-1.5"
          >
            {isPending
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <DollarSign className="w-4 h-4" />
            }
            {nextStep.label}
          </Button>
        )}
      </SectionCard>
    </div>
  );
}

// ── Documents Tab ─────────────────────────────────────────────────────────────

function DocumentsTab({
  employeeName,
  resignationLetterUploaded,
  clearanceDone,
  clearanceTotal,
  exitInterviewStatus,
  overallStatus,
}: {
  employeeName: string;
  resignationLetterUploaded: boolean;
  clearanceDone: number;
  clearanceTotal: number;
  exitInterviewStatus: string;
  overallStatus: string;
}) {
  const docs = [
    { label: 'Resignation Letter',           uploaded: resignationLetterUploaded },
    { label: 'Clearance Form (signed)',       uploaded: clearanceDone === clearanceTotal && clearanceTotal > 0 },
    { label: 'Return of Company Property Form', uploaded: false },
    { label: 'Exit Interview Form',           uploaded: exitInterviewStatus === 'done' },
    { label: 'Certificate of Employment (COE)', uploaded: overallStatus === 'completed' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <SectionCard title="Required Documents">
        {docs.map((doc) => (
          <div key={doc.label} className="flex items-center gap-3 py-2.5 border-b border-gray-50 dark:border-gray-800 last:border-0">
            {doc.uploaded
              ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
              : <Clock className="w-4 h-4 text-gray-300 dark:text-gray-600 shrink-0" />}
            <span className={`text-sm flex-1 ${doc.uploaded ? 'text-gray-800 dark:text-gray-200' : 'text-gray-400'}`}>
              {doc.label}
            </span>
            {doc.uploaded
              ? <span className="text-[10px] text-green-600 dark:text-green-400 font-medium">Ready</span>
              : <span className="text-[10px] text-gray-400">Pending</span>}
          </div>
        ))}
      </SectionCard>

      <SectionCard title="Certificate of Employment">
        <p className="text-xs text-gray-400 mb-4">
          Auto-generated COE based on employee records. Available once all clearances are complete.
        </p>
        <div className="p-4 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-center">
          <FileText className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Certificate of Employment</p>
          <p className="text-xs text-gray-400 mt-0.5">{employeeName}</p>
          <Button
            size="sm"
            disabled={overallStatus !== 'completed'}
            className="mt-3 flex items-center gap-1.5 mx-auto bg-brand-blue hover:bg-brand-blue-dark text-white disabled:opacity-40"
          >
            <Download className="w-4 h-4" />
            Download COE
          </Button>
        </div>
      </SectionCard>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function OffboardingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: detail, isLoading, isError } = useOffboardingDetail(id);

  // Loading
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-7 h-7 rounded-full border-2 border-brand-blue border-t-transparent animate-spin" />
      </div>
    );
  }

  // Error / not found
  if (isError || !detail) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <AlertCircle className="w-10 h-10 text-gray-300 mb-4" />
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Record not found</p>
        <Button variant="outline" size="sm" onClick={() => navigate('/offboarding')} className="mt-4">
          Back to Offboarding
        </Button>
      </div>
    );
  }

  const cfg      = statusConfig[detail.overallStatus] ?? statusConfig.in_progress;
  const daysLeft = differenceInDays(new Date(detail.lastDayOfWork), new Date());

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Link
        to="/offboarding"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors mb-5"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Offboarding
      </Link>

      {/* Header card */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 sm:p-6 mb-4 sm:mb-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5">
          <div className="w-16 h-16 rounded-2xl bg-gray-400 dark:bg-gray-600 flex items-center justify-center text-white text-xl font-bold shrink-0">
            {getInitials(detail.employeeName)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-lg sm:text-xl font-extrabold text-gray-900 dark:text-white">{detail.employeeName}</h1>
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>
                {cfg.label}
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{detail.position} · {detail.department}</p>
            <div className="flex flex-wrap gap-4 text-xs text-gray-400">
              {detail.resignationDate && (
                <span className="flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" />
                  Resigned {format(new Date(detail.resignationDate), 'MMM d, yyyy')}
                </span>
              )}
              <span
                className={`flex items-center gap-1 font-medium ${daysLeft <= 3 && detail.overallStatus !== 'completed' ? 'text-brand-red' : ''}`}
              >
                <Calendar className="w-3.5 h-3.5" />
                Last day {format(new Date(detail.lastDayOfWork), 'MMM d, yyyy')}
                {detail.overallStatus !== 'completed' && ` · ${Math.max(0, daysLeft)} day${Math.abs(daysLeft) !== 1 ? 's' : ''} left`}
              </span>
              <span className="capitalize">{detail.separationType}</span>
              {detail.assignedHRId && (
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5" />HR assigned
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm" className="flex items-center gap-1.5">
              <Download className="w-4 h-4" />
              COE
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate(`/employees/${detail.employeeId}`)}>
              Profile
            </Button>
          </div>
        </div>

        {/* Clearance summary bar */}
        <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Clearance Progress</p>
            <p className="text-sm font-bold text-gray-800 dark:text-white">
              {detail.clearanceDone}/{detail.clearanceTotal} departments · {detail.clearancePct}%
            </p>
          </div>
          <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${detail.clearancePct}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className={`h-full rounded-full ${detail.clearancePct === 100 ? 'bg-green-500' : 'bg-amber-500'}`}
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="clearance">
        <div className="overflow-x-auto pb-1">
          <TabsList className="w-max">
            <TabsTrigger value="clearance">
              <span className="hidden sm:inline">Clearance</span>
              <span className="sm:hidden">Clear.</span>
            </TabsTrigger>
            <TabsTrigger value="exit-interview">
              <span className="hidden sm:inline">Exit Interview</span>
              <span className="sm:hidden">Exit</span>
            </TabsTrigger>
            <TabsTrigger value="final-pay">
              <span className="hidden sm:inline">Final Pay</span>
              <span className="sm:hidden">Pay</span>
            </TabsTrigger>
            <TabsTrigger value="documents">
              <span className="hidden sm:inline">Documents</span>
              <span className="sm:hidden">Docs</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="clearance">
          <ClearanceTab
            items={detail.clearanceItems}
            offboardingId={detail.id}
            overallStatus={detail.overallStatus}
          />
        </TabsContent>

        <TabsContent value="exit-interview">
          <ExitInterviewTab
            interview={detail.exitInterview}
            offboardingId={detail.id}
            overallStatus={detail.overallStatus}
          />
        </TabsContent>

        <TabsContent value="final-pay">
          <FinalPayTab
            offboardingId={detail.id}
            finalPay={detail.finalPay}
            finalPayStatus={detail.finalPayStatus}
            finalPayAmount={detail.finalPayAmount}
            overallStatus={detail.overallStatus}
          />
        </TabsContent>

        <TabsContent value="documents">
          <DocumentsTab
            employeeName={detail.employeeName}
            resignationLetterUploaded={detail.resignationLetterUploaded}
            clearanceDone={detail.clearanceDone}
            clearanceTotal={detail.clearanceTotal}
            exitInterviewStatus={detail.exitInterviewStatus}
            overallStatus={detail.overallStatus}
          />
        </TabsContent>
      </Tabs>

      {detail.notes && (
        <div className="mt-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 sm:p-5">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Notes</p>
          <p className="text-sm text-gray-700 dark:text-gray-300">{detail.notes}</p>
        </div>
      )}
    </motion.div>
  );
}
