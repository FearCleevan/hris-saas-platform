import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Banknote, FileSpreadsheet, Receipt, BarChart2, MessageSquareWarning,
  ChevronDown, ChevronRight, Download, Send, Check, AlertTriangle, X,
  PlayCircle, CheckCircle2, Building2, Printer, BotMessageSquare,
} from 'lucide-react';
import { PayrollAnomalyReport } from './components/PayrollAnomalyReport';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useEmployees } from '@/hooks/useEmployees';
import type { EmployeeRow } from '@/services/employees';
import {
  usePayrollRuns, useAdvancePayrollRun, usePayslips, useThirteenthMonthPay,
  usePayrollDisputes, useReviewPayrollDispute, useResolvePayrollDispute, useRejectPayrollDispute,
} from '@/hooks/usePayroll';
import type {
  PayrollRunRow, PayslipRow, PayrollRunStatus, PayrollDisputeRow, DisputeStatus,
} from '@/services/payroll';

/* ─── Types ─── */
type TabId = 'runs' | 'register' | 'payslip' | 'reports' | 'disputes' | 'ai-audit';

/* ─── Constants ─── */
const TABS: { id: TabId; label: string; icon: React.ElementType; highlight?: boolean }[] = [
  { id: 'runs',     label: 'Payroll Runs', icon: Banknote },
  { id: 'register', label: 'Register',     icon: FileSpreadsheet },
  { id: 'payslip',  label: 'Payslip',      icon: Receipt },
  { id: 'reports',  label: 'Reports',      icon: BarChart2 },
  { id: 'disputes', label: 'Disputes',     icon: MessageSquareWarning },
  { id: 'ai-audit', label: 'AI Audit',     icon: BotMessageSquare, highlight: true },
];

const RUN_STATUS_CFG: Record<PayrollRunStatus, { label: string; color: string; bg: string }> = {
  draft:    { label: 'Draft',    color: 'text-gray-600 dark:text-gray-400',   bg: 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700' },
  review:   { label: 'For Review', color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800' },
  approved: { label: 'Approved', color: 'text-blue-700 dark:text-blue-400',   bg: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800' },
  released: { label: 'Released', color: 'text-green-700 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800' },
};

const DISPUTE_STATUS_CFG: Record<DisputeStatus, { label: string; color: string; bg: string }> = {
  open:          { label: 'Open',         color: 'text-red-600 dark:text-red-400',     bg: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800' },
  under_review:  { label: 'Under Review', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800' },
  resolved:      { label: 'Resolved',     color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800' },
  rejected:      { label: 'Rejected',     color: 'text-gray-500 dark:text-gray-400',   bg: 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700' },
};

const WORKFLOW: PayrollRunStatus[] = ['draft', 'review', 'approved', 'released'];

// 'computed' isn't its own workflow stage (it maps to 'draft' for the
// stepper/advance logic), but it should still say "Computed" rather than
// be mislabeled "Draft" — see services/payroll.ts's isComputed flag.
const COMPUTED_STATUS_CFG = {
  label: 'Computed',
  color: 'text-purple-700 dark:text-purple-400',
  bg: 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800',
};
function runStatusCfg(run: PayrollRunRow) {
  return run.isComputed ? COMPUTED_STATUS_CFG : RUN_STATUS_CFG[run.status];
}

/* ─── Helpers ─── */
function peso(n: number) {
  return `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
}

function empName(employees: EmployeeRow[], id: string) {
  return employees.find((e) => e.id === id)?.name ?? id;
}

function exportRegisterCSV(records: (PayslipRow & { emp: EmployeeRow })[]) {
  const headers = ['Employee', 'Department', 'Days', 'Basic Pay', 'OT Pay', 'Allowances', 'Gross Pay', 'SSS', 'PhilHealth', 'Pag-IBIG', 'Tax', 'Loans', 'Late/Absent', 'Total Deductions', 'Net Pay'];
  const rows = records.map((r) => [
    `"${r.emp.name}"`, r.emp.department,
    r.daysWorked, r.basicPay, r.overtimePay, r.allowances,
    r.grossPay, r.sssEe, r.philhealthEe, r.pagibigEe, r.withholdingTax,
    r.loanDeductions, r.lateDeductions + r.absentDeductions, r.totalDeductions, r.netPay,
  ].join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'payroll-register.csv'; a.click();
  URL.revokeObjectURL(url);
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="text-center py-16 text-sm text-gray-400">{children}</div>;
}

function Loading() {
  return (
    <div className="flex items-center justify-center py-16">
      <LoadingSpinner />
    </div>
  );
}

/* ─── Payroll Runs Tab ─── */
function RunsTab({
  runs, onAdvance, isAdvancing,
}: {
  runs: PayrollRunRow[];
  onAdvance: (id: string, next: Exclude<PayrollRunStatus, 'draft'>) => void;
  isAdvancing: boolean;
}) {
  if (runs.length === 0) return <Empty>No payroll runs yet.</Empty>;
  const latestRun = runs[runs.length - 1]!;

  return (
    <div>
      {/* Workflow legend */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
        {WORKFLOW.map((step, i) => {
          const cfg = RUN_STATUS_CFG[step];
          return (
            <div key={step} className="flex items-center gap-2 shrink-0">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.bg} ${cfg.color}`}>
                {cfg.label}
              </span>
              {i < WORKFLOW.length - 1 && <ChevronRight className="w-3 h-3 text-gray-300 dark:text-gray-600" />}
            </div>
          );
        })}
        <span className="ml-auto text-[10px] text-gray-400 shrink-0">Semi-monthly payroll · 15–30 cutoff</span>
      </div>

      <div className="flex flex-col gap-3">
        {[...runs].reverse().map((run, i) => {
          const cfg = runStatusCfg(run);
          const statusIdx = WORKFLOW.indexOf(run.status);
          const nextStatus = statusIdx < WORKFLOW.length - 1
            ? (WORKFLOW[statusIdx + 1] as Exclude<PayrollRunStatus, 'draft'>)
            : null;
          const isLatest = run.id === latestRun.id;

          return (
            <motion.div
              key={run.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className={`bg-white dark:bg-gray-900 border rounded-2xl p-4 sm:p-5 ${
                isLatest ? 'border-brand-blue/30 shadow-sm' : 'border-gray-200 dark:border-gray-800'
              }`}
            >
              <div className="flex items-start gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="text-sm font-bold text-gray-800 dark:text-white">{run.period}</p>
                    {isLatest && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-brand-blue text-white">CURRENT</span>
                    )}
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>
                      {cfg.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">
                    Pay date: {format(parseISO(run.payDate), 'MMMM d, yyyy')} · {run.totalEmployees} employees · {run.frequency}
                  </p>
                </div>

                <div className="flex items-center gap-6 shrink-0 flex-wrap">
                  <div className="text-right">
                    <p className="text-[10px] text-gray-400">Gross</p>
                    <p className="text-sm font-bold text-gray-800 dark:text-white">{peso(run.totalGross)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-gray-400">Deductions</p>
                    <p className="text-sm font-semibold text-red-600 dark:text-red-400">−{peso(run.totalDeductions)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-gray-400">Net Pay</p>
                    <p className="text-base font-extrabold text-brand-blue dark:text-blue-400">{peso(run.totalNetPay)}</p>
                  </div>

                  {nextStatus && (
                    <button
                      type="button"
                      disabled={isAdvancing}
                      onClick={() => onAdvance(run.id, nextStatus)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors shrink-0 disabled:opacity-60 ${
                        nextStatus === 'review'
                          ? 'bg-amber-500 hover:bg-amber-600 text-white'
                          : nextStatus === 'approved'
                          ? 'bg-brand-blue hover:bg-brand-blue-dark text-white'
                          : 'bg-green-500 hover:bg-green-600 text-white'
                      }`}
                    >
                      {nextStatus === 'review'   && <><PlayCircle className="w-3.5 h-3.5" />Submit for Review</>}
                      {nextStatus === 'approved' && <><CheckCircle2 className="w-3.5 h-3.5" />Approve</>}
                      {nextStatus === 'released' && <><Building2 className="w-3.5 h-3.5" />Release to Bank</>}
                    </button>
                  )}
                  {run.status === 'released' && (
                    <button
                      type="button"
                      onClick={() => toast.info('Bank file export initiated')}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" />Bank File
                    </button>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-4 flex gap-1">
                {WORKFLOW.map((step) => {
                  const done = WORKFLOW.indexOf(run.status) >= WORKFLOW.indexOf(step);
                  return (
                    <div
                      key={step}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        done ? 'bg-brand-blue' : 'bg-gray-100 dark:bg-gray-800'
                      }`}
                    />
                  );
                })}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Register Tab ─── */
function RegisterTab({ runs, employees }: { runs: PayrollRunRow[]; employees: EmployeeRow[] }) {
  const [selectedRunId, setSelectedRunId] = useState(runs[runs.length - 1]?.id ?? '');
  const [deptFilter, setDeptFilter] = useState('all');
  const [search, setSearch] = useState('');
  const { data: payslips = [], isLoading } = usePayslips(selectedRunId || null);

  const departments = useMemo(
    () => ['all', ...new Set(employees.map((e) => e.department))].sort(),
    [employees],
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return payslips
      .map((r) => {
        const emp = employees.find((e) => e.id === r.employeeId);
        return emp ? { ...r, emp } : null;
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .filter((r) => deptFilter === 'all' || r.emp.department === deptFilter)
      .filter((r) => !q || r.emp.name.toLowerCase().includes(q))
      .sort((a, b) => a.emp.department.localeCompare(b.emp.department) || a.emp.name.localeCompare(b.emp.name));
  }, [payslips, employees, deptFilter, search]);

  const totals = useMemo(
    () => filtered.reduce(
      (acc, r) => ({
        gross: acc.gross + r.grossPay,
        deductions: acc.deductions + r.totalDeductions,
        net: acc.net + r.netPay,
        sss: acc.sss + r.sssEe,
        ph: acc.ph + r.philhealthEe,
        pi: acc.pi + r.pagibigEe,
        tax: acc.tax + r.withholdingTax,
      }),
      { gross: 0, deductions: 0, net: 0, sss: 0, ph: 0, pi: 0, tax: 0 },
    ),
    [filtered],
  );

  if (runs.length === 0) return <Empty>No payroll runs yet.</Empty>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative">
          <select
            value={selectedRunId}
            onChange={(e) => setSelectedRunId(e.target.value)}
            title="Select payroll run"
            className="h-9 appearance-none pl-3 pr-8 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-medium text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-blue/40 transition-colors"
          >
            {runs.map((r) => (
              <option key={r.id} value={r.id}>{r.period}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        </div>

        <div className="relative">
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            title="Filter by department"
            className="h-9 appearance-none pl-3 pr-8 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-medium text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-blue/40 transition-colors"
          >
            {departments.map((d) => (
              <option key={d} value={d}>{d === 'all' ? 'All Departments' : d}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        </div>

        <input
          type="text"
          placeholder="Search employee…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 px-3 w-44 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-300 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/40 transition-colors"
        />

        <span className="text-xs text-gray-400">{filtered.length} employees</span>

        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={() => toast.info('Bank file export initiated')}
            className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <Building2 className="w-3.5 h-3.5" />Bank File
          </button>
          <button
            type="button"
            onClick={() => exportRegisterCSV(filtered)}
            className="flex items-center gap-1.5 h-9 px-3 rounded-lg bg-brand-blue text-white text-xs font-semibold hover:bg-brand-blue-dark transition-colors"
          >
            <Download className="w-3.5 h-3.5" />Export CSV
          </button>
        </div>
      </div>

      {isLoading ? <Loading /> : filtered.length === 0 ? <Empty>No payslips for this run yet.</Empty> : (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 sticky left-0 bg-gray-50/80 dark:bg-gray-800/60 min-w-[180px]">Employee</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 min-w-[70px]">Days</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 min-w-27.5">Basic Pay</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 min-w-[90px]">OT Pay</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 min-w-[100px]">Allowances</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 min-w-27.5">Gross Pay</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 min-w-[80px]">SSS</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 min-w-[90px]">PhilHealth</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 min-w-[80px]">Pag-IBIG</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 min-w-[90px]">Tax</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 min-w-[90px]">Loans</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-brand-blue dark:text-blue-400 min-w-27.5">Net Pay</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr
                    key={r.id}
                    className={`${i < filtered.length - 1 ? 'border-b border-gray-50 dark:border-gray-800/60' : ''} hover:bg-gray-50 dark:hover:bg-gray-800/20 transition-colors`}
                  >
                    <td className="px-4 py-2.5 sticky left-0 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/20">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-brand-blue flex items-center justify-center text-white text-[9px] font-bold shrink-0">
                          {getInitials(r.emp.name)}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 whitespace-nowrap">{r.emp.name}</p>
                          <p className="text-[9px] text-gray-400">{r.emp.department}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right text-xs text-gray-600 dark:text-gray-400">{r.daysWorked}</td>
                    <td className="px-3 py-2.5 text-right text-xs font-mono text-gray-700 dark:text-gray-300">{peso(r.basicPay)}</td>
                    <td className="px-3 py-2.5 text-right text-xs font-mono text-green-600 dark:text-green-400">
                      {r.overtimePay > 0 ? `+${peso(r.overtimePay)}` : <span className="text-gray-300 dark:text-gray-700">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right text-xs font-mono text-gray-600 dark:text-gray-400">{peso(r.allowances)}</td>
                    <td className="px-3 py-2.5 text-right text-xs font-mono font-semibold text-gray-800 dark:text-gray-200">{peso(r.grossPay)}</td>
                    <td className="px-3 py-2.5 text-right text-xs font-mono text-red-500 dark:text-red-400">{peso(r.sssEe)}</td>
                    <td className="px-3 py-2.5 text-right text-xs font-mono text-red-500 dark:text-red-400">{peso(r.philhealthEe)}</td>
                    <td className="px-3 py-2.5 text-right text-xs font-mono text-red-500 dark:text-red-400">{peso(r.pagibigEe)}</td>
                    <td className="px-3 py-2.5 text-right text-xs font-mono text-red-500 dark:text-red-400">{peso(r.withholdingTax)}</td>
                    <td className="px-3 py-2.5 text-right text-xs font-mono text-amber-600 dark:text-amber-400">
                      {r.loanDeductions > 0 ? peso(r.loanDeductions) : <span className="text-gray-300 dark:text-gray-700">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right text-sm font-bold text-brand-blue dark:text-blue-400">{peso(r.netPay)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40">
                  <td className="px-4 py-3 text-xs font-bold text-gray-600 dark:text-gray-400 sticky left-0 bg-gray-50 dark:bg-gray-800/60">
                    TOTALS ({filtered.length})
                  </td>
                  <td colSpan={5} className="px-3 py-3 text-right text-xs font-bold text-gray-800 dark:text-white">{peso(totals.gross)}</td>
                  <td className="px-3 py-3 text-right text-xs font-bold text-red-500">{peso(totals.sss)}</td>
                  <td className="px-3 py-3 text-right text-xs font-bold text-red-500">{peso(totals.ph)}</td>
                  <td className="px-3 py-3 text-right text-xs font-bold text-red-500">{peso(totals.pi)}</td>
                  <td className="px-3 py-3 text-right text-xs font-bold text-red-500">{peso(totals.tax)}</td>
                  <td className="px-3 py-3 text-right text-xs font-bold text-red-500">—</td>
                  <td className="px-3 py-3 text-right text-sm font-extrabold text-brand-blue dark:text-blue-400">{peso(totals.net)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Payslip Tab ─── */
function PayslipTab({ runs, employees }: { runs: PayrollRunRow[]; employees: EmployeeRow[] }) {
  const [selectedEmpId, setSelectedEmpId] = useState(employees[0]?.id ?? '');
  const [selectedRunId, setSelectedRunId] = useState(runs[runs.length - 1]?.id ?? '');
  const { data: payslips = [], isLoading } = usePayslips(selectedRunId || null);

  const rec = payslips.find((r) => r.employeeId === selectedEmpId);
  const emp = employees.find((e) => e.id === selectedEmpId);
  const run = runs.find((r) => r.id === selectedRunId);
  const sortedEmps = [...employees].sort((a, b) => a.name.localeCompare(b.name));

  if (runs.length === 0) return <Empty>No payroll runs yet.</Empty>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="relative">
          <select
            value={selectedEmpId}
            onChange={(e) => setSelectedEmpId(e.target.value)}
            title="Select employee"
            className="h-9 appearance-none pl-3 pr-8 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-medium text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-blue/40 transition-colors"
          >
            {sortedEmps.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        </div>

        <div className="relative">
          <select
            value={selectedRunId}
            onChange={(e) => setSelectedRunId(e.target.value)}
            title="Select pay period"
            className="h-9 appearance-none pl-3 pr-8 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-medium text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-blue/40 transition-colors"
          >
            {runs.map((r) => (
              <option key={r.id} value={r.id}>{r.period}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        </div>

        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={() => toast.info('Payslip email sent to employee')}
            className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <Send className="w-3.5 h-3.5" />Email
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 h-9 px-3 rounded-lg bg-brand-blue text-white text-xs font-semibold hover:bg-brand-blue-dark transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />Print / PDF
          </button>
        </div>
      </div>

      {isLoading ? <Loading /> : !rec || !emp || !run ? (
        <Empty>No payslip data for selected employee/period</Empty>
      ) : (
        <motion.div
          key={`${selectedEmpId}-${selectedRunId}`}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm"
        >
          {/* Payslip header */}
          <div className="bg-brand-blue px-8 py-6 text-white">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold opacity-70 uppercase tracking-widest">HRIS Solutions Inc.</p>
                <h2 className="text-xl font-extrabold mt-0.5">Payslip</h2>
                <p className="text-sm opacity-80 mt-1">{run.period}</p>
                <p className="text-xs opacity-60 mt-0.5">Pay date: {format(parseISO(run.payDate), 'MMMM d, yyyy')}</p>
              </div>
              <div className="text-right">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm">
                  {getInitials(emp.name)}
                </div>
              </div>
            </div>
          </div>

          {/* Employee info */}
          <div className="grid grid-cols-2 gap-4 px-8 py-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20">
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Employee</p>
              <p className="text-sm font-bold text-gray-800 dark:text-white mt-0.5">{emp.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{emp.position}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Department</p>
              <p className="text-sm font-semibold text-gray-800 dark:text-white mt-0.5">{emp.department}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{emp.type.charAt(0).toUpperCase() + emp.type.slice(1)} · {rec.daysWorked} days worked</p>
            </div>
          </div>

          <div className="px-8 py-6 grid grid-cols-2 gap-6">
            {/* Earnings */}
            <div>
              <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3">Earnings</p>
              <div className="flex flex-col gap-2">
                {[
                  { label: 'Basic Pay', value: rec.basicPay },
                  ...(rec.overtimePay > 0 ? [{ label: 'Overtime Pay', value: rec.overtimePay }] : []),
                  ...(rec.holidayPay > 0 ? [{ label: 'Holiday Pay', value: rec.holidayPay }] : []),
                  ...(rec.nightDiffPay > 0 ? [{ label: 'Night Differential', value: rec.nightDiffPay }] : []),
                  ...(rec.allowances > 0 ? [{ label: 'Allowances', value: rec.allowances }] : []),
                  ...(rec.otherEarnings > 0 ? [{ label: 'Other Earnings', value: rec.otherEarnings }] : []),
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between gap-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
                    <span className="text-xs font-semibold font-mono text-gray-700 dark:text-gray-300 tabular-nums">{peso(value)}</span>
                  </div>
                ))}
                <div className="border-t border-gray-100 dark:border-gray-800 pt-2 mt-1 flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Gross Pay</span>
                  <span className="text-sm font-extrabold font-mono text-gray-800 dark:text-white tabular-nums">{peso(rec.grossPay)}</span>
                </div>
              </div>
            </div>

            {/* Deductions */}
            <div>
              <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3">Deductions</p>
              <div className="flex flex-col gap-2">
                {[
                  { label: 'SSS Contribution', value: rec.sssEe },
                  { label: 'PhilHealth', value: rec.philhealthEe },
                  { label: 'Pag-IBIG (HDMF)', value: rec.pagibigEe },
                  { label: 'Withholding Tax', value: rec.withholdingTax },
                  ...(rec.loanDeductions > 0 ? [{ label: 'Loan Deductions', value: rec.loanDeductions }] : []),
                  ...(rec.lateDeductions > 0  ? [{ label: 'Late/Tardiness', value: rec.lateDeductions }]  : []),
                  ...(rec.absentDeductions > 0 ? [{ label: 'Absences', value: rec.absentDeductions }] : []),
                  ...(rec.otherDeductions > 0 ? [{ label: 'Other Deductions', value: rec.otherDeductions }] : []),
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between gap-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
                    <span className="text-xs font-semibold font-mono text-red-500 dark:text-red-400 tabular-nums">−{peso(value)}</span>
                  </div>
                ))}
                <div className="border-t border-gray-100 dark:border-gray-800 pt-2 mt-1 flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Total Deductions</span>
                  <span className="text-sm font-extrabold font-mono text-red-500 tabular-nums">−{peso(rec.totalDeductions)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Net pay */}
          <div className="mx-8 mb-6 bg-brand-blue/5 dark:bg-brand-blue/10 border border-brand-blue/20 rounded-xl px-6 py-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">NET PAY</p>
              <p className="text-[10px] text-gray-400">After all deductions · {run.frequency}</p>
            </div>
            <p className="text-3xl font-extrabold text-brand-blue dark:text-blue-400 tabular-nums">{peso(rec.netPay)}</p>
          </div>

          <div className="px-8 pb-6 text-center text-[10px] text-gray-400">
            This payslip is system-generated and does not require a signature. · {format(new Date(), 'MMMM d, yyyy')}
          </div>
        </motion.div>
      )}
    </div>
  );
}

/* ─── Reports Tab ─── */
function ReportsTab({ runs, employees }: { runs: PayrollRunRow[]; employees: EmployeeRow[] }) {
  const latestRun = runs[runs.length - 1] ?? null;
  const { data: payslips = [], isLoading: payslipsLoading } = usePayslips(latestRun?.id ?? null);
  const thisYear = new Date().getFullYear();
  const { data: thirteenth = [], isLoading: thirteenthLoading } = useThirteenthMonthPay(thisYear);

  const maxGross = Math.max(1, ...runs.map((r) => r.totalGross));

  const totalThirteenth = useMemo(() => thirteenth.reduce((s, t) => s + t.amount, 0), [thirteenth]);

  const deptTotals = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of payslips) {
      const emp = employees.find((e) => e.id === r.employeeId);
      if (emp) map[emp.department] = (map[emp.department] ?? 0) + r.netPay;
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [payslips, employees]);

  const maxDept = deptTotals[0]?.[1] ?? 1;

  const deductionTotals = useMemo(() => ({
    sss:        payslips.reduce((s, r) => s + r.sssEe, 0),
    philhealth: payslips.reduce((s, r) => s + r.philhealthEe, 0),
    pagibig:    payslips.reduce((s, r) => s + r.pagibigEe, 0),
    tax:        payslips.reduce((s, r) => s + r.withholdingTax, 0),
  }), [payslips]);

  const totalDed = Math.max(1, Object.values(deductionTotals).reduce((s, v) => s + v, 0));

  const topEarners = useMemo(
    () =>
      payslips
        .map((r) => ({ ...r, emp: employees.find((e) => e.id === r.employeeId) }))
        .filter((r): r is PayslipRow & { emp: EmployeeRow } => !!r.emp)
        .sort((a, b) => b.netPay - a.netPay)
        .slice(0, 10),
    [payslips, employees],
  );

  if (runs.length === 0 || !latestRun) return <Empty>No payroll runs yet.</Empty>;

  return (
    <div className="flex flex-col gap-4">
      {/* Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Latest Gross Payroll', value: peso(latestRun.totalGross), sub: latestRun.period },
          { label: 'Total Deductions',     value: peso(latestRun.totalDeductions), sub: 'Statutory + loans' },
          { label: 'Net Payroll Out',      value: peso(latestRun.totalNetPay), sub: 'To employees' },
          {
            label: '13th Month (YTD)',
            value: thirteenthLoading ? '…' : thirteenth.length > 0 ? peso(totalThirteenth) : 'Not yet computed',
            sub: thirteenth.length > 0 ? `${thirteenth.length} employee(s)` : 'No 13th-month runs generated yet',
          },
        ].map(({ label, value, sub }) => (
          <div key={label} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
            <p className="text-xl font-extrabold text-gray-900 dark:text-white">{value}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Run trend */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 sm:p-5">
          <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-4">Gross Payroll Trend</h3>
          <div className="flex flex-col gap-2.5">
            {runs.map((run) => (
              <div key={run.id} className="flex items-center gap-3">
                <span className="text-[10px] text-gray-400 w-24 shrink-0 truncate">{run.period.split(',')[0]}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-5 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                      <div
                        className="h-full rounded-lg flex items-center justify-end pr-2 transition-all"
                        style={{ width: `${(run.totalGross / maxGross) * 100}%`, backgroundColor: run.status === 'draft' ? '#93c5fd' : '#0038a8' }}
                      >
                        <span className="text-[9px] font-bold text-white whitespace-nowrap">{peso(run.totalGross)}</span>
                      </div>
                    </div>
                    <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border shrink-0 ${runStatusCfg(run).bg} ${runStatusCfg(run).color}`}>
                      {runStatusCfg(run).label}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Deduction breakdown */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 sm:p-5">
          <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-4">Deduction Breakdown — {latestRun.period}</h3>
          {payslipsLoading ? <Loading /> : payslips.length === 0 ? <Empty>No payslips for this run yet.</Empty> : (
            <div className="flex flex-col gap-3">
              {[
                { label: 'SSS Contributions',   value: deductionTotals.sss,        color: '#0038a8', note: 'Employee share, 2024 bracket table' },
                { label: 'PhilHealth Premiums', value: deductionTotals.philhealth, color: '#10b981', note: '5% of basic salary, split 50/50' },
                { label: 'Pag-IBIG (HDMF)',     value: deductionTotals.pagibig,    color: '#f59e0b', note: 'Max ₱100/employee' },
                { label: 'BIR Withholding Tax', value: deductionTotals.tax,        color: '#ce1126', note: 'TRAIN Law rates' },
              ].map(({ label, value, color, note }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{label}</span>
                      <span className="text-xs font-bold font-mono ml-2 shrink-0" style={{ color }}>{peso(value)}</span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${(value / totalDed) * 100}%`, backgroundColor: color }} />
                    </div>
                    <p className="text-[9px] text-gray-400 mt-0.5">{note} · {((value / totalDed) * 100).toFixed(1)}% of total</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Department payroll */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 sm:p-5">
          <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-4">Net Pay by Department — {latestRun.period}</h3>
          {payslipsLoading ? <Loading /> : deptTotals.length === 0 ? <Empty>No payslips for this run yet.</Empty> : (
            <div className="flex flex-col gap-2.5">
              {deptTotals.map(([dept, total]) => (
                <div key={dept} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 dark:text-gray-400 w-24 shrink-0 truncate">{dept}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-brand-blue" style={{ width: `${(total / maxDept) * 100}%` }} />
                      </div>
                      <span className="text-xs font-bold font-mono text-gray-700 dark:text-gray-300 shrink-0 w-24 text-right tabular-nums">{peso(total)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top earners */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 sm:p-5">
          <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-4">Top 10 Earners — Net Pay</h3>
          {payslipsLoading ? <Loading /> : topEarners.length === 0 ? <Empty>No payslips for this run yet.</Empty> : (
            <div className="flex flex-col gap-2">
              {topEarners.map(({ emp, netPay }, i) => (
                <div key={emp.id} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-300 dark:text-gray-600 w-4 shrink-0">{i + 1}</span>
                  <div className="w-6 h-6 rounded-full bg-brand-blue flex items-center justify-center text-white text-[9px] font-bold shrink-0">
                    {getInitials(emp.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">{emp.name}</p>
                    <p className="text-[9px] text-gray-400">{emp.position}</p>
                  </div>
                  <span className="text-xs font-bold font-mono text-brand-blue dark:text-blue-400 shrink-0 tabular-nums">{peso(netPay)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── 13th Month Pay ── */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-gray-800 flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-bold text-gray-800 dark:text-white">13th Month Pay — {thisYear}</h3>
            <p className="text-[10px] text-gray-400">
              {thirteenth.length > 0 ? `Total payout: ${peso(totalThirteenth)} · ${thirteenth.length} employee(s)` : 'No 13th-month pay records yet for this year'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => toast.info('13th month pay generation is not built yet — see FRONTEND_IMPLEMENTATION.md')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs font-semibold cursor-not-allowed"
          >
            Generate Run
          </button>
        </div>
        {thirteenthLoading ? <Loading /> : thirteenth.length === 0 ? (
          <Empty>13th-month pay will appear here once a compute run generates it.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Employee</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Total Basic Pay (YTD)</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">Months Worked</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-brand-blue dark:text-blue-400">13th Month Pay</th>
                </tr>
              </thead>
              <tbody>
                {thirteenth.map((t, i) => (
                  <tr key={t.id} className={i < thirteenth.length - 1 ? 'border-b border-gray-50 dark:border-gray-800/60' : ''}>
                    <td className="px-4 py-2.5 text-xs font-semibold text-gray-800 dark:text-gray-200">{empName(employees, t.employeeId)}</td>
                    <td className="px-4 py-2.5 text-right text-xs font-mono text-gray-600 dark:text-gray-400 tabular-nums">{peso(t.totalBasicPay)}</td>
                    <td className="px-4 py-2.5 text-center text-xs text-gray-500">{t.monthsWorked}</td>
                    <td className="px-4 py-2.5 text-right text-sm font-bold text-brand-blue dark:text-blue-400 tabular-nums">{peso(t.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Disputes Tab ─── */
function DisputesTab({ employees, runs }: { employees: EmployeeRow[]; runs: PayrollRunRow[] }) {
  const [filter, setFilter] = useState<DisputeStatus | 'all'>('all');
  const { data: disputes = [], isLoading } = usePayrollDisputes();
  const review = useReviewPayrollDispute();
  const resolve = useResolvePayrollDispute();
  const reject = useRejectPayrollDispute();
  const [resolvingId, setResolvingId] = useState<{ id: string; action: 'resolve' | 'reject' } | null>(null);
  const [resolutionText, setResolutionText] = useState('');

  const filtered = useMemo(
    () => disputes.filter((d) => filter === 'all' || d.status === filter),
    [disputes, filter],
  );

  const openCount = disputes.filter((d) => d.status === 'open').length;

  const handleReview = async (id: string) => {
    try {
      await review.mutateAsync({ id });
      toast.info('Dispute marked as Under Review');
    } catch (err) {
      toast.error((err as Error).message || 'Could not update this dispute');
    }
  };

  const submitResolution = async () => {
    if (!resolvingId || !resolutionText.trim()) return;
    try {
      if (resolvingId.action === 'resolve') {
        await resolve.mutateAsync({ id: resolvingId.id, resolution: resolutionText.trim() });
        toast.success('Dispute resolved');
      } else {
        await reject.mutateAsync({ id: resolvingId.id, resolution: resolutionText.trim() });
        toast.info('Dispute rejected');
      }
      setResolvingId(null);
      setResolutionText('');
    } catch (err) {
      toast.error((err as Error).message || 'Could not update this dispute');
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {(['all', 'open', 'under_review', 'resolved', 'rejected'] as const).map((f) => (
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
            {f === 'all' ? 'All' : DISPUTE_STATUS_CFG[f as DisputeStatus].label}
            {f === 'open' && openCount > 0 && (
              <span className="ml-1.5 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">{openCount}</span>
            )}
          </button>
        ))}
        <span className="ml-auto text-xs text-gray-400">{filtered.length} disputes</span>
      </div>

      {isLoading ? <Loading /> : (
        <div className="flex flex-col gap-3">
          {filtered.length === 0 && <Empty>No disputes found</Empty>}
          {filtered.map((d: PayrollDisputeRow, i) => {
            const emp = employees.find((e) => e.id === d.employeeId);
            const run = runs.find((r) => r.id === d.runId);
            const cfg = DISPUTE_STATUS_CFG[d.status];

            return (
              <motion.div
                key={d.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-brand-blue flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {emp ? getInitials(emp.name) : '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <p className="text-sm font-semibold text-gray-800 dark:text-white">{emp?.name ?? d.employeeId}</p>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400 mb-2">
                      {emp?.position} · {run?.period ?? 'Unknown period'} · Filed {format(parseISO(d.createdAt), 'MMM d, yyyy')}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">"{d.reason}"</p>
                    {d.resolution && (
                      <div className="mt-2 flex items-start gap-1.5 bg-green-50 dark:bg-green-950/20 rounded-lg px-3 py-2">
                        <Check className="w-3 h-3 text-green-600 shrink-0 mt-0.5" />
                        <p className="text-[10px] text-green-700 dark:text-green-400">{d.resolution}</p>
                      </div>
                    )}

                    {resolvingId?.id === d.id && (
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          type="text"
                          autoFocus
                          value={resolutionText}
                          onChange={(e) => setResolutionText(e.target.value)}
                          placeholder={resolvingId.action === 'resolve' ? 'Resolution notes…' : 'Rejection reason…'}
                          className="flex-1 h-8 px-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-blue/40"
                        />
                        <button
                          type="button"
                          disabled={!resolutionText.trim() || resolve.isPending || reject.isPending}
                          onClick={submitResolution}
                          className="px-2.5 py-1.5 rounded-lg bg-brand-blue text-white text-[10px] font-bold disabled:opacity-50"
                        >
                          Submit
                        </button>
                        <button
                          type="button"
                          onClick={() => { setResolvingId(null); setResolutionText(''); }}
                          className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                  {resolvingId?.id !== d.id && (
                    <div className="flex flex-col gap-1.5 shrink-0">
                      {d.status === 'open' && (
                        <button
                          type="button"
                          disabled={review.isPending}
                          onClick={() => handleReview(d.id)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold transition-colors disabled:opacity-50"
                        >
                          <AlertTriangle className="w-3 h-3" />Review
                        </button>
                      )}
                      {d.status === 'under_review' && (
                        <>
                          <button
                            type="button"
                            onClick={() => { setResolvingId({ id: d.id, action: 'resolve' }); setResolutionText(''); }}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-green-500 hover:bg-green-600 text-white text-[10px] font-bold transition-colors"
                          >
                            <Check className="w-3 h-3" />Resolve
                          </button>
                          <button
                            type="button"
                            onClick={() => { setResolvingId({ id: d.id, action: 'reject' }); setResolutionText(''); }}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-[10px] font-bold transition-colors"
                          >
                            <X className="w-3 h-3" />Reject
                          </button>
                        </>
                      )}
                      {(d.status === 'resolved' || d.status === 'rejected') && (
                        <span className={`flex items-center gap-1 text-[10px] font-semibold ${d.status === 'resolved' ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
                          <CheckCircle2 className="w-3 h-3" />{cfg.label}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Main Page ─── */
export default function PayrollPage() {
  const [activeTab, setActiveTab] = useState<TabId>('runs');
  const { data: runs = [], isLoading: runsLoading } = usePayrollRuns();
  const { data: employeesData = [] } = useEmployees();
  const advance = useAdvancePayrollRun();
  const { data: disputes = [] } = usePayrollDisputes();

  const handleAdvance = async (id: string, next: Exclude<PayrollRunStatus, 'draft'>) => {
    try {
      await advance.mutateAsync({ id, next });
      const labels: Record<PayrollRunStatus, string> = {
        draft: 'reset to Draft', review: 'submitted for review', approved: 'approved', released: 'released to bank',
      };
      toast.success(`Payroll run ${labels[next]}`);
    } catch (err) {
      toast.error((err as Error).message || 'Could not update this payroll run');
    }
  };

  const latestRun = runs[runs.length - 1] ?? null;
  const openDisputes = disputes.filter((d) => d.status === 'open').length;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5 sm:mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white">Payroll Management</h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Semi-monthly · SSS · PhilHealth · Pag-IBIG · BIR TRAIN Law{latestRun ? ` · ${latestRun.period}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {latestRun && (
            <>
              <div className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${runStatusCfg(latestRun).bg} ${runStatusCfg(latestRun).color}`}>
                {runStatusCfg(latestRun).label}
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-400">
                {peso(latestRun.totalNetPay)} net
              </div>
            </>
          )}
          {openDisputes > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab('disputes')}
              className="px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-100 transition-colors"
            >
              {openDisputes} open dispute{openDisputes !== 1 ? 's' : ''}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-5 sm:mb-6 overflow-x-auto pb-1 scrollbar-none">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${
                isActive
                  ? tab.highlight
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-brand-blue text-white shadow-sm'
                  : tab.highlight
                    ? 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.highlight && !isActive && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                  AI
                </span>
              )}
              {tab.id === 'disputes' && openDisputes > 0 && !isActive && (
                <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                  {openDisputes}
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
          {runsLoading ? <Loading /> : (
            <>
              {activeTab === 'runs'     && <RunsTab runs={runs} onAdvance={handleAdvance} isAdvancing={advance.isPending} />}
              {activeTab === 'register' && <RegisterTab runs={runs} employees={employeesData} />}
              {activeTab === 'payslip'  && <PayslipTab runs={runs} employees={employeesData} />}
              {activeTab === 'reports'  && <ReportsTab runs={runs} employees={employeesData} />}
              {activeTab === 'disputes' && <DisputesTab employees={employeesData} runs={runs} />}
            </>
          )}
          {activeTab === 'ai-audit' && (
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-3 p-4 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800 rounded-2xl">
                <BotMessageSquare className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-indigo-700 dark:text-indigo-300">AI Payroll Audit</p>
                  <p className="text-xs text-indigo-600/70 dark:text-indigo-400/70">
                    Powered by Gemini · Detects gross pay mismatches, missing statutory contributions, TRAIN Law violations, and 7 other anomaly types.
                  </p>
                </div>
              </div>
              <PayrollAnomalyReport />
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
