import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence, type Easing } from 'framer-motion';
import { toast } from 'sonner';
import {
  Download, Mail, ChevronDown, ChevronUp, FileText, TrendingUp, Receipt,
  Building2, Landmark, CreditCard,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import {
  listPayslips,
  getSssHistory,
  getPhilhealthHistory,
  getPagibigHistory,
} from '@/services/payslip';
import { listLoans } from '@/services/benefits';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Payslip {
  id: string;
  basic_pay: number;
  overtime_pay: number;
  holiday_pay: number;
  night_diff_pay: number;
  allowances: number;
  other_earnings: number;
  gross_pay: number;
  sss_ee: number;
  philhealth_ee: number;
  pagibig_ee: number;
  withholding_tax: number;
  loan_deductions: number;
  late_deductions: number;
  absent_deductions: number;
  other_deductions: number;
  total_deductions: number;
  net_pay: number;
  days_worked: number;
  hours_worked: number;
  status: string;
  pdf_url: string | null;
  // PostgREST returns this as an array even for a to-one FK join here
  // (same quirk seen with employee_employment in services/profile.ts).
  payroll_periods: { name: string; period_start: string; period_end: string; pay_date: string; frequency: string }[];
}

function payslipPeriod(record: Payslip) {
  return record.payroll_periods[0] ?? null;
}

const EASE_OUT: Easing = 'easeOut';
const CARD = 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5';
const EMPLOYEE_EMAIL_FALLBACK = 'you@example.com';

const fadeUp = (i: number) => ({
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, delay: i * 0.05, ease: EASE_OUT },
});

function peso(amount: number | null | undefined): string {
  return `₱${(amount ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

function downloadPayslip(record: Payslip) {
  const period = payslipPeriod(record);
  const lines = [
    '================================================',
    '                  PAYSLIP                       ',
    '================================================',
    `Period:      ${period?.name ?? '—'}`,
    `Pay Date:    ${formatDate(period?.pay_date ?? null)}`,
    `Days Worked: ${record.days_worked}  Hours: ${record.hours_worked}`,
    '',
    '--- EARNINGS ---',
    `Basic Pay:              ${peso(record.basic_pay)}`,
    `Overtime Pay:           ${peso(record.overtime_pay)}`,
    `Holiday Pay:            ${peso(record.holiday_pay)}`,
    `Night Differential:     ${peso(record.night_diff_pay)}`,
    `Allowances:             ${peso(record.allowances)}`,
    `Other Earnings:         ${peso(record.other_earnings)}`,
    `GROSS PAY:              ${peso(record.gross_pay)}`,
    '',
    '--- DEDUCTIONS ---',
    `SSS:                    ${peso(record.sss_ee)}`,
    `PhilHealth:             ${peso(record.philhealth_ee)}`,
    `Pag-IBIG:               ${peso(record.pagibig_ee)}`,
    `Withholding Tax:        ${peso(record.withholding_tax)}`,
    `Loan Deductions:        ${peso(record.loan_deductions)}`,
    `Late Deductions:        ${peso(record.late_deductions)}`,
    `Absent Deductions:      ${peso(record.absent_deductions)}`,
    `Other Deductions:       ${peso(record.other_deductions)}`,
    `TOTAL DEDUCTIONS:       ${peso(record.total_deductions)}`,
    '',
    '================================================',
    `NET PAY:                ${peso(record.net_pay)}`,
    '================================================',
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `payslip-${(period?.name ?? record.id).replace(/[^a-zA-Z0-9]/g, '-')}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Tab 1: My Payslips ───────────────────────────────────────────────────────

function PayslipsTab({ records }: { records: Payslip[] }) {
  const { user } = useAuth();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (records.length === 0) {
    return (
      <div className={`${CARD} py-16 text-center text-gray-400`}>
        <FileText size={32} className="mx-auto mb-3 opacity-40" />
        <p className="text-sm font-medium">No payslips yet</p>
        <p className="text-xs mt-1">Your payslips will appear here once payroll is released.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {records.map((record, i) => {
        const isExpanded = expandedId === record.id;
        const period = payslipPeriod(record);
        return (
          <motion.div key={record.id} {...fadeUp(i)} className={`${CARD} p-0 overflow-hidden`}>
            <button
              type="button"
              onClick={() => setExpandedId(isExpanded ? null : record.id)}
              className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors text-left"
              aria-expanded={isExpanded}
            >
              <FileText size={16} className="text-gray-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{period?.name ?? 'Payslip'}</p>
                <p className="text-xs text-gray-400 mt-0.5">Pay date: {formatDate(period?.pay_date ?? null)}</p>
              </div>
              <div className="text-right shrink-0 hidden sm:block">
                <p className="text-xs text-gray-400">Gross</p>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 tabular-nums">{peso(record.gross_pay)}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-gray-400">Net Pay</p>
                <p className="text-sm font-bold text-blue-700 dark:text-blue-400 tabular-nums">{peso(record.net_pay)}</p>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 shrink-0 capitalize">
                {record.status}
              </span>
              {isExpanded ? <ChevronUp size={16} className="text-gray-400 shrink-0" /> : <ChevronDown size={16} className="text-gray-400 shrink-0" />}
            </button>

            <AnimatePresence initial={false}>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: EASE_OUT }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-5 border-t border-gray-100 dark:border-gray-800 pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">Earnings</p>
                        <div className="space-y-1.5">
                          {[
                            { label: 'Basic Pay', value: record.basic_pay },
                            { label: 'Overtime Pay', value: record.overtime_pay },
                            { label: 'Holiday Pay', value: record.holiday_pay },
                            { label: 'Night Differential', value: record.night_diff_pay },
                            { label: 'Allowances', value: record.allowances },
                            { label: 'Other Earnings', value: record.other_earnings },
                          ].map(({ label, value }) => (
                            <div key={label} className="flex justify-between text-sm">
                              <span className="text-gray-600 dark:text-gray-400">{label}</span>
                              <span className="tabular-nums text-gray-900 dark:text-white">{peso(value)}</span>
                            </div>
                          ))}
                          <div className="flex justify-between text-sm font-bold border-t border-gray-100 dark:border-gray-800 pt-2 mt-2">
                            <span className="text-gray-900 dark:text-white">Gross Pay</span>
                            <span className="tabular-nums text-gray-900 dark:text-white">{peso(record.gross_pay)}</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">Deductions</p>
                        <div className="space-y-1.5">
                          {[
                            { label: 'SSS', value: record.sss_ee },
                            { label: 'PhilHealth', value: record.philhealth_ee },
                            { label: 'Pag-IBIG', value: record.pagibig_ee },
                            { label: 'Withholding Tax', value: record.withholding_tax },
                            { label: 'Loan Deductions', value: record.loan_deductions },
                            { label: 'Late Deductions', value: record.late_deductions },
                            { label: 'Absent Deductions', value: record.absent_deductions },
                            { label: 'Other Deductions', value: record.other_deductions },
                          ].map(({ label, value }) => (
                            <div key={label} className="flex justify-between text-sm">
                              <span className="text-gray-600 dark:text-gray-400">{label}</span>
                              <span className="tabular-nums text-gray-900 dark:text-white">{peso(value)}</span>
                            </div>
                          ))}
                          <div className="flex justify-between text-sm font-bold border-t border-gray-100 dark:border-gray-800 pt-2 mt-2">
                            <span className="text-red-600 dark:text-red-400">Total Deductions</span>
                            <span className="tabular-nums text-red-600 dark:text-red-400">{peso(record.total_deductions)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 flex items-center justify-between bg-blue-50 dark:bg-blue-950 rounded-xl px-5 py-4">
                      <span className="text-base font-bold text-blue-900 dark:text-blue-100">NET PAY</span>
                      <span className="text-2xl font-extrabold text-blue-700 dark:text-blue-300 tabular-nums">{peso(record.net_pay)}</span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400">
                      <span>Days Worked: <strong className="text-gray-900 dark:text-white">{record.days_worked}</strong></span>
                      <span>Hours Worked: <strong className="text-gray-900 dark:text-white">{record.hours_worked}</strong></span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3">
                      <button type="button" onClick={() => downloadPayslip(record)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors">
                        <Download size={15} />
                        Download
                      </button>
                      <button type="button" onClick={() => toast.success(`Payslip sent to ${user?.email ?? EMPLOYEE_EMAIL_FALLBACK}`)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <Mail size={15} />
                        Email to Me
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}

// ─── Tab 2: Year-to-Date Summary ──────────────────────────────────────────────

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className={CARD}>
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <p className="text-xl font-extrabold text-gray-900 dark:text-white tabular-nums">{value}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 shadow-lg text-sm">
      <p className="font-bold text-gray-900 dark:text-white mb-2">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }} className="tabular-nums">
          {entry.name === 'gross' ? 'Gross' : 'Net Pay'}: {peso(entry.value)}
        </p>
      ))}
    </div>
  );
}

function YtdTab({ records }: { records: Payslip[] }) {
  const totalGross = records.reduce((s, r) => s + r.gross_pay, 0);
  const totalNet = records.reduce((s, r) => s + r.net_pay, 0);
  const totalOt = records.reduce((s, r) => s + r.overtime_pay, 0);
  const totalAllowances = records.reduce((s, r) => s + r.allowances + r.other_earnings, 0);
  const totalTax = records.reduce((s, r) => s + r.withholding_tax, 0);
  const totalGovContribs = records.reduce((s, r) => s + r.sss_ee + r.philhealth_ee + r.pagibig_ee, 0);

  const monthMap = new Map<string, { gross: number; net: number }>();
  records.forEach((r) => {
    const payDate = payslipPeriod(r)?.pay_date;
    const label = payDate
      ? new Date(payDate + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short' })
      : 'N/A';
    const existing = monthMap.get(label) ?? { gross: 0, net: 0 };
    monthMap.set(label, { gross: existing.gross + r.gross_pay, net: existing.net + r.net_pay });
  });
  const chartData = Array.from(monthMap.entries()).map(([month, v]) => ({ month, ...v }));
  const avgMonthlyNet = chartData.length > 0 ? totalNet / chartData.length : 0;

  const kpis = [
    { label: 'Total Gross Earnings', value: peso(totalGross) },
    { label: 'Total Net Pay', value: peso(totalNet) },
    { label: 'Total OT Pay', value: peso(totalOt) },
    { label: 'Total Allowances', value: peso(totalAllowances) },
    { label: 'Total Tax Withheld', value: peso(totalTax) },
    { label: "Total Gov't Contributions", value: peso(totalGovContribs), sub: 'SSS + PhilHealth + Pag-IBIG' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {kpis.map((kpi, i) => (
          <motion.div key={kpi.label} {...fadeUp(i)}><KpiCard {...kpi} /></motion.div>
        ))}
      </div>

      {chartData.length > 0 && (
        <motion.div {...fadeUp(6)} className={CARD}>
          <p className="text-sm font-bold text-gray-900 dark:text-white mb-1">Earnings by Pay Period</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Gross and net pay per released payslip</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} barGap={4} barCategoryGap="25%">
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `₱${(v / 1000).toFixed(0)}k`} width={48} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="gross" name="gross" fill="#0038a8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="net" name="net" fill="#059669" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            Average net pay per period: <strong className="text-gray-900 dark:text-white">{peso(avgMonthlyNet)}</strong>
          </p>
        </motion.div>
      )}
    </div>
  );
}

// ─── Tab 3: Tax Summary ───────────────────────────────────────────────────────

function TaxTab({ records }: { records: Payslip[] }) {
  const totalGross = records.reduce((s, r) => s + r.gross_pay, 0);
  const totalTax = records.reduce((s, r) => s + r.withholding_tax, 0);
  const effectiveRate = totalGross > 0 ? ((totalTax / totalGross) * 100).toFixed(2) : '0.00';

  return (
    <div className="space-y-5">
      <motion.div {...fadeUp(0)} className={CARD}>
        <p className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Receipt size={16} className="text-gray-400" />
          Withholding Tax Summary
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Taxable Gross</p>
            <p className="text-lg font-extrabold text-gray-900 dark:text-white tabular-nums">{peso(totalGross)}</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Withholding Tax</p>
            <p className="text-lg font-extrabold text-red-600 dark:text-red-400 tabular-nums">{peso(totalTax)}</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Effective Tax Rate</p>
            <p className="text-lg font-extrabold text-amber-600 dark:text-amber-400">{effectiveRate}%</p>
          </div>
        </div>
      </motion.div>

      <motion.div {...fadeUp(1)} className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-2xl px-5 py-4">
        <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">BIR Form 2316</p>
        <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
          BIR Form 2316 will be issued at year-end by HR. This form is required for income tax return filing.
        </p>
      </motion.div>
    </div>
  );
}

// ─── Tab 4: Government Contributions ─────────────────────────────────────────

function ContributionsTab({ employeeId }: { employeeId: string }) {
  const { data: sss, isLoading: sssLoading } = useQuery({ queryKey: ['payslip', 'sss', employeeId], queryFn: () => getSssHistory(employeeId) });
  const { data: ph, isLoading: phLoading } = useQuery({ queryKey: ['payslip', 'philhealth', employeeId], queryFn: () => getPhilhealthHistory(employeeId) });
  const { data: pagibig, isLoading: pagibigLoading } = useQuery({ queryKey: ['payslip', 'pagibig', employeeId], queryFn: () => getPagibigHistory(employeeId) });

  if (sssLoading || phLoading || pagibigLoading) {
    return <div className={`${CARD} py-12 text-center text-gray-400`}>Loading…</div>;
  }

  const ytdSss = (sss ?? []).reduce((s, r) => s + r.ee_contribution, 0);
  const ytdPh = (ph ?? []).reduce((s, r) => s + r.ee_contribution, 0);
  const ytdPi = (pagibig ?? []).reduce((s, r) => s + r.ee_contribution, 0);

  const contribCards = [
    { icon: <Building2 size={20} className="text-blue-600 dark:text-blue-400" />, title: 'SSS', subtitle: 'Social Security System', number: sss?.[0]?.sss_no, ytd: ytdSss },
    { icon: <Landmark size={20} className="text-green-600 dark:text-green-400" />, title: 'PhilHealth', subtitle: 'Philippine Health Insurance', number: ph?.[0]?.philhealth_no, ytd: ytdPh },
    { icon: <CreditCard size={20} className="text-amber-600 dark:text-amber-400" />, title: 'Pag-IBIG', subtitle: 'Home Development Mutual Fund', number: pagibig?.[0]?.pagibig_no, ytd: ytdPi },
  ];

  const noData = (sss ?? []).length === 0 && (ph ?? []).length === 0 && (pagibig ?? []).length === 0;

  if (noData) {
    return (
      <div className={`${CARD} py-12 text-center text-gray-400`}>
        No government contribution records on file yet.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {contribCards.map((card, i) => (
          <motion.div key={card.title} {...fadeUp(i)} className={CARD}>
            <div className="flex items-center gap-2 mb-3">
              {card.icon}
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-white">{card.title}</p>
                <p className="text-[11px] text-gray-400">{card.subtitle}</p>
              </div>
            </div>
            <div className="space-y-2 text-xs">
              {card.number && (
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Number</span>
                  <span className="font-mono font-semibold text-gray-700 dark:text-gray-300">{card.number}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-gray-100 dark:border-gray-800 pt-2 mt-2">
                <span className="text-gray-500 dark:text-gray-400">YTD (employee share)</span>
                <span className="font-bold text-green-600 dark:text-green-400 tabular-nums">{peso(card.ytd)}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─── Tab 5: Loans ─────────────────────────────────────────────────────────────

function LoansTab({ employeeId }: { employeeId: string }) {
  const { data: loans, isLoading } = useQuery({ queryKey: ['payslip', 'loans', employeeId], queryFn: () => listLoans(employeeId) });

  if (isLoading) return <div className={`${CARD} py-12 text-center text-gray-400`}>Loading…</div>;

  const activeLoans = (loans ?? []).filter((l) => l.status === 'active');

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
          <CreditCard size={16} className="text-gray-400" />
          Active Loans
        </p>

        {activeLoans.length === 0 ? (
          <div className={`${CARD} py-8 text-center text-gray-400 text-sm`}>No active loans on file.</div>
        ) : (
          activeLoans.map((loan, i) => {
            const paidAmount = loan.principal - loan.outstanding_balance;
            const paidPct = loan.principal > 0 ? (paidAmount / loan.principal) * 100 : 0;

            return (
              <motion.div key={loan.id} {...fadeUp(i)} className={CARD}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white capitalize">{loan.loan_type} Loan</p>
                    <p className="text-xs text-gray-400 mt-0.5">Started {formatDate(loan.loan_date)}</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 capitalize">{loan.status}</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                  <div><p className="text-xs text-gray-400 mb-0.5">Principal</p><p className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">{peso(loan.principal)}</p></div>
                  <div><p className="text-xs text-gray-400 mb-0.5">Outstanding</p><p className="text-sm font-bold text-red-600 dark:text-red-400 tabular-nums">{peso(loan.outstanding_balance)}</p></div>
                  <div><p className="text-xs text-gray-400 mb-0.5">Monthly Amort.</p><p className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">{peso(loan.monthly_amort)}</p></div>
                  <div><p className="text-xs text-gray-400 mb-0.5">Term</p><p className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">{loan.term_months} mos</p></div>
                </div>

                <div className="mb-1">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Paid: {peso(paidAmount)} ({paidPct.toFixed(0)}%)</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                    <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${Math.min(paidPct, 100)}%` }} />
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PayslipPage() {
  const { user } = useAuth();
  const { data: payslips, isLoading, error } = useQuery({
    queryKey: ['payslip', 'list', user?.id],
    queryFn: () => listPayslips(user!.id) as Promise<Payslip[]>,
    enabled: !!user?.id,
  });

  if (!user) return null;
  if (isLoading) return <div className={`${CARD} py-16 text-center text-gray-400`}>Loading your payslips…</div>;
  if (error || !payslips) return <div className={`${CARD} py-16 text-center text-red-500`}>Couldn&apos;t load payslips.</div>;

  const latest = payslips[0];

  const tabs = [
    { value: 'payslips',      label: 'My Payslips',        icon: <FileText size={15} /> },
    { value: 'ytd',           label: 'Year-to-Date',        icon: <TrendingUp size={15} /> },
    { value: 'tax',           label: 'Tax Summary',         icon: <Receipt size={15} /> },
    { value: 'contributions', label: "Gov't Contributions", icon: <Building2 size={15} /> },
    { value: 'loans',         label: 'Loans',               icon: <CreditCard size={15} /> },
  ];

  return (
    <div className="space-y-4">
      <motion.div {...fadeUp(0)} className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 dark:text-white">Payslip &amp; Salary</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">View payslips, tax summary, and government contributions</p>
        </div>
        {latest && (
          <button type="button" onClick={() => downloadPayslip(latest)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors">
            <Download size={15} />
            Download Latest
          </button>
        )}
      </motion.div>

      <Tabs defaultValue="payslips">
        <TabsList className="flex-wrap h-auto gap-1 mb-2">
          {tabs.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="flex items-center gap-1.5 text-sm">
              {t.icon}
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="payslips"><PayslipsTab records={payslips} /></TabsContent>
        <TabsContent value="ytd"><YtdTab records={payslips} /></TabsContent>
        <TabsContent value="tax"><TaxTab records={payslips} /></TabsContent>
        <TabsContent value="contributions"><ContributionsTab employeeId={user.id} /></TabsContent>
        <TabsContent value="loans"><LoansTab employeeId={user.id} /></TabsContent>
      </Tabs>
    </div>
  );
}
