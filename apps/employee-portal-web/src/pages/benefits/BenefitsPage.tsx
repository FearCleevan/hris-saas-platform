import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Heart, Shield, Building2, CreditCard, CheckCircle2, Clock,
  AlertCircle, Users, Banknote, FileText, X,
} from 'lucide-react';
import { format, parseISO, differenceInMonths } from 'date-fns';

import { useAuth } from '@/hooks/useAuth';
import { getMyHmoEnrollment, getHmoDependents, listLoans, listLoanApplications, submitLoanApplication } from '@/services/benefits';
import { getSssHistory, getPhilhealthHistory, getPagibigHistory } from '@/services/payslip';

function currency(n: number | null | undefined) {
  return `₱${(n ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 ${className}`}>
      {children}
    </div>
  );
}

// ─── TAB: HMO ───────────────────────────────────────────────────────────────
// No claims/utilization/accredited-hospitals tables exist in the schema —
// that's a real, separate feature never built on the backend. Only real
// plan enrollment + dependents shown here (see BACKEND_IMPLEMENTATION.md).

function HmoTab({ employeeId }: { employeeId: string }) {
  const { data: enrollment, isLoading } = useQuery({
    queryKey: ['benefits', 'hmo', employeeId],
    queryFn: () => getMyHmoEnrollment(employeeId),
  });

  if (isLoading) return <Card className="py-12 text-center text-gray-400">Loading…</Card>;

  if (!enrollment || !enrollment.hmo_plans) {
    return (
      <Card className="py-12 text-center text-gray-400">
        <Heart className="w-10 h-10 mx-auto mb-3 opacity-30" />
        No active HMO enrollment on file. Contact HR if you believe this is an error.
      </Card>
    );
  }

  const plan = Array.isArray(enrollment.hmo_plans) ? enrollment.hmo_plans[0] : enrollment.hmo_plans;

  return (
    <div className="space-y-5">
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Heart className="w-5 h-5 text-rose-500" />
              <span className="text-xs font-medium text-rose-600 bg-rose-50 dark:bg-rose-900/30 dark:text-rose-400 px-2 py-0.5 rounded-full">
                {plan?.coverage_type ?? 'Individual'}
              </span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{plan?.plan_name}</h2>
            <p className="text-sm text-gray-500 mt-1">Provider: <span className="font-medium text-gray-700 dark:text-gray-300">{plan?.provider}</span></p>
          </div>
          <div className="text-right">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
              <CheckCircle2 className="w-3.5 h-3.5" /> Active
            </span>
            {enrollment.effective_date && (
              <p className="text-xs text-gray-400 mt-2">Enrolled since {format(parseISO(enrollment.effective_date), 'MMMM dd, yyyy')}</p>
            )}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="rounded-xl bg-gray-50 dark:bg-gray-700/50 p-3 text-center">
            <p className="text-xs text-gray-500 mb-1">Max Benefit Limit</p>
            <p className="font-bold text-gray-900 dark:text-white">{currency(plan?.mbl)}</p>
          </div>
          <div className="rounded-xl bg-gray-50 dark:bg-gray-700/50 p-3 text-center">
            <p className="text-xs text-gray-500 mb-1">Room & Board</p>
            <p className="font-bold text-gray-900 dark:text-white">{plan?.room_board ?? '—'}</p>
          </div>
          <div className="rounded-xl bg-gray-50 dark:bg-gray-700/50 p-3 text-center col-span-2 sm:col-span-1">
            <p className="text-xs text-gray-500 mb-1">Dependents Allowed</p>
            <p className="font-bold text-gray-900 dark:text-white">{plan?.dependents_allowed ?? 0}</p>
          </div>
        </div>
      </Card>

      <Card className="flex items-start gap-3 bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800">
        <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
        <div className="text-sm">
          <p className="font-medium text-blue-800 dark:text-blue-300 mb-1">Claims &amp; Hospital Network</p>
          <p className="text-blue-700 dark:text-blue-400">Claim history and accredited hospital lookup aren&apos;t available in the portal yet. Contact HR or your HMO provider directly for claims and hospital network questions.</p>
        </div>
      </Card>
    </div>
  );
}

// ─── TAB: DEPENDENTS ────────────────────────────────────────────────────────

function DependentsTab({ employeeId }: { employeeId: string }) {
  const { data: dependents, isLoading } = useQuery({
    queryKey: ['benefits', 'hmo-dependents', employeeId],
    queryFn: () => getHmoDependents(employeeId),
  });

  if (isLoading) return <Card className="py-12 text-center text-gray-400">Loading…</Card>;

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">HMO Dependents</h3>
          <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">{(dependents ?? []).length} enrolled</span>
        </div>
        {(dependents ?? []).length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center">No dependents enrolled.</p>
        ) : (
          <div className="space-y-3">
            {(dependents ?? []).map((dep, i) => (
              <motion.div
                key={dep.id}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 dark:border-gray-700"
              >
                <div className="w-10 h-10 rounded-full bg-brand-blue/10 dark:bg-brand-blue/20 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-brand-blue" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white">{dep.first_name} {dep.last_name}</p>
                  <p className="text-sm text-gray-500">{dep.relationship} · DOB: {format(parseISO(dep.date_of_birth), 'MMM dd, yyyy')}</p>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 shrink-0">Active</span>
              </motion.div>
            ))}
          </div>
        )}
      </Card>

      <Card className="flex items-start gap-3 bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800">
        <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
        <div className="text-sm">
          <p className="font-medium text-blue-800 dark:text-blue-300 mb-1">Adding Dependents</p>
          <p className="text-blue-700 dark:text-blue-400">To add or update your HMO dependents, submit a request through HR.</p>
        </div>
      </Card>
    </div>
  );
}

// ─── TAB: GOVERNMENT BENEFITS ────────────────────────────────────────────────

function GovBenefitsTab({ employeeId }: { employeeId: string }) {
  const { data: sss, isLoading: sssLoading } = useQuery({ queryKey: ['benefits', 'sss', employeeId], queryFn: () => getSssHistory(employeeId) });
  const { data: ph, isLoading: phLoading } = useQuery({ queryKey: ['benefits', 'philhealth', employeeId], queryFn: () => getPhilhealthHistory(employeeId) });
  const { data: pagibig, isLoading: pagibigLoading } = useQuery({ queryKey: ['benefits', 'pagibig', employeeId], queryFn: () => getPagibigHistory(employeeId) });

  if (sssLoading || phLoading || pagibigLoading) return <Card className="py-12 text-center text-gray-400">Loading…</Card>;

  const sections = [
    { icon: <Shield className="w-5 h-5 text-blue-600" />, color: 'bg-blue-100 dark:bg-blue-900/30', title: 'SSS', number: sss?.[0]?.sss_no, rows: sss ?? [] },
    { icon: <Heart className="w-5 h-5 text-green-600" />, color: 'bg-green-100 dark:bg-green-900/30', title: 'PhilHealth', number: ph?.[0]?.philhealth_no, rows: ph ?? [] },
    { icon: <Building2 className="w-5 h-5 text-amber-600" />, color: 'bg-amber-100 dark:bg-amber-900/30', title: 'Pag-IBIG', number: pagibig?.[0]?.pagibig_no, rows: pagibig ?? [] },
  ];

  if (sections.every((s) => s.rows.length === 0)) {
    return <Card className="py-12 text-center text-gray-400">No government contribution records on file yet.</Card>;
  }

  return (
    <div className="space-y-5">
      {sections.map((s) => {
        const ytd = s.rows.reduce((sum, r) => sum + r.ee_contribution, 0);
        return (
          <Card key={s.title}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.color}`}>{s.icon}</div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{s.title}</h3>
                  {s.number && <p className="text-xs font-mono text-gray-400">{s.number}</p>}
                </div>
              </div>
              <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">YTD: {currency(ytd)}</span>
            </div>
            {s.rows.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No records yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-400 border-b border-gray-100 dark:border-gray-700">
                      <th className="text-left py-2">Period</th>
                      <th className="text-right py-2">Employee</th>
                      <th className="text-right py-2">Employer</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.rows.map((r, i) => (
                      <tr key={i} className="border-b border-gray-50 dark:border-gray-700/50">
                        <td className="py-2 text-gray-700 dark:text-gray-300">
                          {new Date(r.period_year, r.period_month - 1, 1).toLocaleDateString('en-PH', { month: 'short', year: 'numeric' })}
                        </td>
                        <td className="py-2 text-right">{currency(r.ee_contribution)}</td>
                        <td className="py-2 text-right">{currency(r.er_contribution)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

// ─── TAB: LOANS ──────────────────────────────────────────────────────────────

const LOAN_TYPE_CONFIG: Record<string, { color: string; bg: string }> = {
  pagibig: { color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  sss:     { color: 'text-blue-600',  bg: 'bg-blue-100 dark:bg-blue-900/30' },
  company: { color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30' },
};

const loanApplicationSchema = z.object({
  loanType: z.enum(['sss', 'pagibig', 'company']),
  amountRequested: z.number().min(1000, 'Minimum ₱1,000'),
  termMonths: z.number().int().min(1).max(60),
  purpose: z.string().min(10, 'Purpose must be at least 10 characters'),
});
type LoanApplicationForm = z.infer<typeof loanApplicationSchema>;

function LoanApplyForm({ employeeId, onClose }: { employeeId: string; onClose: () => void }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoanApplicationForm>({
    resolver: zodResolver(loanApplicationSchema),
    defaultValues: { loanType: 'company', termMonths: 12 },
  });

  async function onSubmit(data: LoanApplicationForm) {
    if (!user) return;
    try {
      await submitLoanApplication(employeeId, user.organizationId, {
        loan_type: data.loanType,
        amount_requested: data.amountRequested,
        term_months: data.termMonths,
        purpose: data.purpose,
      });
      queryClient.invalidateQueries({ queryKey: ['benefits', 'loan-applications', employeeId] });
      toast.success('Loan application submitted for review');
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to submit application');
    }
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 dark:text-white">New Loan Application</h3>
        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Loan Type</label>
          <select {...register('loanType')} className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white">
            <option value="company">Company Loan</option>
            <option value="sss">SSS Loan</option>
            <option value="pagibig">Pag-IBIG Loan</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Amount</label>
            <input type="number" {...register('amountRequested', { valueAsNumber: true })} className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white" />
            {errors.amountRequested && <p className="text-xs text-red-500 mt-1">{errors.amountRequested.message}</p>}
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Term (months)</label>
            <input type="number" {...register('termMonths', { valueAsNumber: true })} className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white" />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Purpose</label>
          <textarea rows={3} {...register('purpose')} className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white resize-none" />
          {errors.purpose && <p className="text-xs text-red-500 mt-1">{errors.purpose.message}</p>}
        </div>
        <button type="submit" disabled={isSubmitting} className="w-full py-2.5 bg-brand-blue text-white rounded-xl font-semibold text-sm disabled:opacity-50">
          Submit Application
        </button>
      </form>
    </Card>
  );
}

function LoansTab({ employeeId }: { employeeId: string }) {
  const [applying, setApplying] = useState(false);
  const { data: loans, isLoading } = useQuery({ queryKey: ['benefits', 'loans', employeeId], queryFn: () => listLoans(employeeId) });
  const { data: applications } = useQuery({ queryKey: ['benefits', 'loan-applications', employeeId], queryFn: () => listLoanApplications(employeeId) });

  if (isLoading) return <Card className="py-12 text-center text-gray-400">Loading…</Card>;

  const activeLoans = (loans ?? []).filter((l) => l.status === 'active');
  const totalOutstanding = activeLoans.reduce((s, l) => s + l.outstanding_balance, 0);
  const totalMonthlyDeductions = activeLoans.reduce((s, l) => s + l.monthly_amort, 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="text-center"><p className="text-xs text-gray-500 mb-1">Active Loans</p><p className="text-3xl font-bold text-gray-900 dark:text-white">{activeLoans.length}</p></Card>
        <Card className="text-center"><p className="text-xs text-gray-500 mb-1">Total Outstanding</p><p className="text-2xl font-bold text-rose-600 dark:text-rose-400">{currency(totalOutstanding)}</p></Card>
        <Card className="text-center"><p className="text-xs text-gray-500 mb-1">Monthly Deductions</p><p className="text-2xl font-bold text-gray-900 dark:text-white">{currency(totalMonthlyDeductions)}</p></Card>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900 dark:text-white">Active Loans</h3>
          {!applying && (
            <button onClick={() => setApplying(true)} className="flex items-center gap-2 px-4 py-2 bg-brand-blue text-white text-sm font-medium rounded-xl hover:bg-brand-blue/90 transition-colors">
              <Banknote className="w-4 h-4" /> Apply for a Loan
            </button>
          )}
        </div>

        <AnimatePresence>
          {applying && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-4">
              <LoanApplyForm employeeId={employeeId} onClose={() => setApplying(false)} />
            </motion.div>
          )}
        </AnimatePresence>

        {activeLoans.length === 0 ? (
          <Card className="py-8 text-center text-gray-400 text-sm">No active loans.</Card>
        ) : (
          <div className="space-y-4">
            {activeLoans.map((loan, i) => {
              const cfg = LOAN_TYPE_CONFIG[loan.loan_type] ?? { color: 'text-gray-600', bg: 'bg-gray-100' };
              const paid = loan.principal - loan.outstanding_balance;
              const paidPct = loan.principal > 0 ? Math.round((paid / loan.principal) * 100) : 0;
              const monthsLeft = loan.first_deduction_date
                ? Math.max(0, loan.term_months - differenceInMonths(new Date(), parseISO(loan.first_deduction_date)))
                : loan.term_months;

              return (
                <motion.div key={loan.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                  <Card>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-lg ${cfg.bg} flex items-center justify-center`}><CreditCard className={`w-4 h-4 ${cfg.color}`} /></div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white capitalize">{loan.loan_type} Loan</p>
                          <p className="text-xs text-gray-400">{loan.interest_rate}% p.a.</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Balance</p>
                        <p className="font-bold text-gray-900 dark:text-white">{currency(loan.outstanding_balance)}</p>
                      </div>
                    </div>
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                        <span>Paid: {currency(paid)}</span>
                        <span>Principal: {currency(loan.principal)}</span>
                      </div>
                      <div className="h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <motion.div className="h-full bg-brand-blue rounded-full" initial={{ width: 0 }} animate={{ width: `${paidPct}%` }} transition={{ duration: 0.8, delay: i * 0.1 }} />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{paidPct}% paid off</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50"><p className="text-gray-400">Monthly</p><p className="font-semibold text-gray-800 dark:text-gray-200">{currency(loan.monthly_amort)}</p></div>
                      <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50"><p className="text-gray-400">Term</p><p className="font-semibold text-gray-800 dark:text-gray-200">{loan.term_months} mos</p></div>
                      <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50"><p className="text-gray-400">Months Left</p><p className="font-semibold text-gray-800 dark:text-gray-200">{monthsLeft}</p></div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {(applications ?? []).length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Application History</h3>
          <div className="space-y-3">
            {(applications ?? []).map((app) => (
              <Card key={app.id} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-700 dark:text-gray-300 capitalize">{app.loan_type} · {currency(app.amount_requested)}</p>
                  <p className="text-xs text-gray-400">{app.purpose}</p>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 capitalize">{app.status}</span>
              </Card>
            ))}
          </div>
        </div>
      )}

      <Card className="flex items-start gap-3 bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800">
        <FileText className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
        <p className="text-sm text-blue-700 dark:text-blue-400">Loan approval typically takes 3–5 business days. Monthly deductions will reflect in your payslip once approved.</p>
      </Card>
    </div>
  );
}

// ─── ROOT PAGE ───────────────────────────────────────────────────────────────

const TABS = [
  { id: 'hmo',        label: 'HMO',           icon: Heart },
  { id: 'dependents', label: 'Dependents',    icon: Users },
  { id: 'government', label: "Gov't Benefits", icon: Shield },
  { id: 'loans',      label: 'Loans',          icon: CreditCard },
] as const;

type TabId = typeof TABS[number]['id'];

export default function BenefitsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('hmo');

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Benefits &amp; Loans</h1>
        <p className="text-sm text-gray-500 mt-1">Your HMO coverage, government contributions, and active loans</p>
      </div>

      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all flex-1 justify-center ${
                active ? 'bg-white dark:bg-gray-700 text-brand-blue shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
          {activeTab === 'hmo'        && <HmoTab employeeId={user.id} />}
          {activeTab === 'dependents' && <DependentsTab employeeId={user.id} />}
          {activeTab === 'government' && <GovBenefitsTab employeeId={user.id} />}
          {activeTab === 'loans'      && <LoansTab employeeId={user.id} />}
        </motion.div>
      </AnimatePresence>

      <Card className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2 text-sm">
          <Clock className="w-4 h-4 text-gray-400" />
          <span className="text-gray-500">Live data from your HRISPH account</span>
        </div>
        <div className="flex items-center gap-2 text-sm ml-auto">
          <AlertCircle className="w-4 h-4 text-amber-500" />
          <span className="text-gray-500">Questions? Contact</span>
          <span className="font-medium text-brand-blue">hr@hris-demo.ph</span>
        </div>
      </Card>
    </div>
  );
}
