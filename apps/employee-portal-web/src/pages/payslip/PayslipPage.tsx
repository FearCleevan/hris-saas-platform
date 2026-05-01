import { useState } from 'react';
import { motion, AnimatePresence, type Easing } from 'framer-motion';
import { toast } from 'sonner';
import {
  Download,
  Mail,
  ChevronDown,
  ChevronUp,
  FileText,
  TrendingUp,
  Receipt,
  Building2,
  Landmark,
  CreditCard,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import payrollRecordsRaw from '@/data/mock/payroll-records.json';
import loansRaw from '@/data/mock/loans.json';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PayrollRecord {
  id: string;
  employeeId: string;
  runId: string;
  period: string;
  payDate: string;
  basicPay: number;
  overtimePay: number;
  nightDifferential: number;
  transportationAllowance: number;
  mealAllowance: number;
  grossPay: number;
  sss: number;
  philhealth: number;
  pagibig: number;
  withholdingTax: number;
  sssLoan: number;
  pagibigLoan: number;
  companyLoan: number;
  tardiness: number;
  totalDeductions: number;
  netPay: number;
  daysWorked: number;
  hoursWorked: number;
  overtimeHours: number;
}

interface Loan {
  id: string;
  employeeId: string;
  type: string;
  typeName: string;
  principalAmount: number;
  outstandingBalance: number;
  monthlyPayment: number;
  startDate: string;
  endDate: string;
  status: string;
  totalPayments: number;
  remainingPayments: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const EASE_OUT: Easing = 'easeOut';

const payrollRecords = (payrollRecordsRaw as PayrollRecord[]).sort(
  (a, b) => new Date(b.payDate).getTime() - new Date(a.payDate).getTime()
);
const loans = loansRaw as Loan[];

const CARD = 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5';
const EMPLOYEE_EMAIL = 'juan.delacruz@gmail.com';

const fadeUp = (i: number) => ({
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, delay: i * 0.05, ease: EASE_OUT },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function peso(amount: number): string {
  return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-PH', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function getMonthLabel(payDate: string): string {
  return new Date(payDate + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short' });
}

// Aggregate by calendar month for chart (gross + net per month)
function buildMonthlyChartData(records: PayrollRecord[]) {
  const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const map = new Map<string, { gross: number; net: number }>();
  records.forEach((r) => {
    const label = getMonthLabel(r.payDate);
    const existing = map.get(label) ?? { gross: 0, net: 0 };
    map.set(label, {
      gross: existing.gross + r.grossPay,
      net: existing.net + r.netPay,
    });
  });
  return monthOrder
    .filter((m) => map.has(m))
    .map((m) => ({ month: m, gross: map.get(m)!.gross, net: map.get(m)!.net }));
}

function downloadPayslip(record: PayrollRecord) {
  const lines = [
    '================================================',
    '              PAYSLIP - 2023                    ',
    '================================================',
    `Employee:    Juan Dela Cruz (emp001)`,
    `Period:      ${record.period}`,
    `Pay Date:    ${formatDate(record.payDate)}`,
    `Days Worked: ${record.daysWorked}  Hours: ${record.hoursWorked}  OT Hours: ${record.overtimeHours}`,
    '',
    '--- EARNINGS ---',
    `Basic Pay:              ${peso(record.basicPay)}`,
    `Overtime Pay:           ${peso(record.overtimePay)}`,
    `Night Differential:     ${peso(record.nightDifferential)}`,
    `Transportation Allow.:  ${peso(record.transportationAllowance)}`,
    `Meal Allowance:         ${peso(record.mealAllowance)}`,
    `                        ───────────────`,
    `GROSS PAY:              ${peso(record.grossPay)}`,
    '',
    '--- DEDUCTIONS ---',
    `SSS:                    ${peso(record.sss)}`,
    `PhilHealth:             ${peso(record.philhealth)}`,
    `Pag-IBIG:               ${peso(record.pagibig)}`,
    `Withholding Tax:        ${peso(record.withholdingTax)}`,
    `SSS Loan:               ${peso(record.sssLoan)}`,
    `Pag-IBIG Loan:          ${peso(record.pagibigLoan)}`,
    `Company Loan:           ${peso(record.companyLoan)}`,
    `Tardiness:              ${peso(record.tardiness)}`,
    `                        ───────────────`,
    `TOTAL DEDUCTIONS:       ${peso(record.totalDeductions)}`,
    '',
    '================================================',
    `NET PAY:                ${peso(record.netPay)}`,
    '================================================',
    '',
    'This is a system-generated payslip.',
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `payslip-${record.period.replace(/[^a-zA-Z0-9]/g, '-')}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Recharts Custom Tooltip ──────────────────────────────────────────────────

interface ChartPayloadEntry {
  name: string;
  value: number;
  color: string;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: ChartPayloadEntry[];
  label?: string;
}

function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
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

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className={CARD}>
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <p className="text-xl font-extrabold text-gray-900 dark:text-white tabular-nums">{value}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Tab 1: My Payslips ───────────────────────────────────────────────────────

function PayslipsTab({ records }: { records: PayrollRecord[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function toggle(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  return (
    <div className="space-y-4">
      {/* Year filter strip */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 dark:text-gray-400">Year:</span>
        <span className="px-3 py-1 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-sm font-semibold">
          2023
        </span>
        <span className="text-xs text-gray-400 ml-2">{records.length} payslips</span>
      </div>

      {/* Payslip rows */}
      <div className="space-y-2">
        {records.map((record, i) => {
          const isExpanded = expandedId === record.id;
          return (
            <motion.div key={record.id} {...fadeUp(i)} className={`${CARD} p-0 overflow-hidden`}>
              {/* Row header — click to expand */}
              <button
                type="button"
                onClick={() => toggle(record.id)}
                className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors text-left"
                aria-expanded={isExpanded}
              >
                <FileText size={16} className="text-gray-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {record.period}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">Pay date: {formatDate(record.payDate)}</p>
                </div>
                <div className="text-right shrink-0 hidden sm:block">
                  <p className="text-xs text-gray-400">Gross</p>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 tabular-nums">
                    {peso(record.grossPay)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-gray-400">Net Pay</p>
                  <p className="text-sm font-bold text-blue-700 dark:text-blue-400 tabular-nums">
                    {peso(record.netPay)}
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 shrink-0">
                  Released
                </span>
                {isExpanded
                  ? <ChevronUp size={16} className="text-gray-400 shrink-0" />
                  : <ChevronDown size={16} className="text-gray-400 shrink-0" />}
              </button>

              {/* Expanded detail */}
              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    key="detail"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: EASE_OUT }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-5 border-t border-gray-100 dark:border-gray-800 pt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Earnings */}
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
                            Earnings
                          </p>
                          <div className="space-y-1.5">
                            {[
                              { label: 'Basic Pay', value: record.basicPay },
                              { label: 'Overtime Pay', value: record.overtimePay },
                              { label: 'Night Differential', value: record.nightDifferential },
                              { label: 'Transportation Allowance', value: record.transportationAllowance },
                              { label: 'Meal Allowance', value: record.mealAllowance },
                            ].map(({ label, value }) => (
                              <div key={label} className="flex justify-between text-sm">
                                <span className="text-gray-600 dark:text-gray-400">{label}</span>
                                <span className="tabular-nums text-gray-900 dark:text-white">{peso(value)}</span>
                              </div>
                            ))}
                            <div className="flex justify-between text-sm font-bold border-t border-gray-100 dark:border-gray-800 pt-2 mt-2">
                              <span className="text-gray-900 dark:text-white">Gross Pay</span>
                              <span className="tabular-nums text-gray-900 dark:text-white">{peso(record.grossPay)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Deductions */}
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
                            Deductions
                          </p>
                          <div className="space-y-1.5">
                            {[
                              { label: 'SSS', value: record.sss },
                              { label: 'PhilHealth', value: record.philhealth },
                              { label: 'Pag-IBIG', value: record.pagibig },
                              { label: 'Withholding Tax', value: record.withholdingTax },
                              { label: 'SSS Loan', value: record.sssLoan },
                              { label: 'Pag-IBIG Loan', value: record.pagibigLoan },
                              { label: 'Company Loan', value: record.companyLoan },
                              { label: 'Tardiness', value: record.tardiness },
                            ].map(({ label, value }) => (
                              <div key={label} className="flex justify-between text-sm">
                                <span className="text-gray-600 dark:text-gray-400">{label}</span>
                                <span className="tabular-nums text-gray-900 dark:text-white">{peso(value)}</span>
                              </div>
                            ))}
                            <div className="flex justify-between text-sm font-bold border-t border-gray-100 dark:border-gray-800 pt-2 mt-2">
                              <span className="text-red-600 dark:text-red-400">Total Deductions</span>
                              <span className="tabular-nums text-red-600 dark:text-red-400">{peso(record.totalDeductions)}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Net Pay */}
                      <div className="mt-5 flex items-center justify-between bg-blue-50 dark:bg-blue-950 rounded-xl px-5 py-4">
                        <span className="text-base font-bold text-blue-900 dark:text-blue-100">NET PAY</span>
                        <span className="text-2xl font-extrabold text-blue-700 dark:text-blue-300 tabular-nums">
                          {peso(record.netPay)}
                        </span>
                      </div>

                      {/* Work summary */}
                      <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400">
                        <span>Days Worked: <strong className="text-gray-900 dark:text-white">{record.daysWorked}</strong></span>
                        <span>Hours Worked: <strong className="text-gray-900 dark:text-white">{record.hoursWorked}</strong></span>
                        <span>OT Hours: <strong className="text-gray-900 dark:text-white">{record.overtimeHours}</strong></span>
                      </div>

                      {/* Action buttons */}
                      <div className="mt-4 flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => downloadPayslip(record)}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors"
                        >
                          <Download size={15} />
                          Download PDF
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            toast.success(`Payslip sent to ${EMPLOYEE_EMAIL}`)
                          }
                          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
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
    </div>
  );
}

// ─── Tab 2: Year-to-Date Summary ──────────────────────────────────────────────

function YtdTab({ records }: { records: PayrollRecord[] }) {
  const totalGross = records.reduce((s, r) => s + r.grossPay, 0);
  const totalNet = records.reduce((s, r) => s + r.netPay, 0);
  const totalOt = records.reduce((s, r) => s + r.overtimePay, 0);
  const totalAllowances = records.reduce((s, r) => s + r.transportationAllowance + r.mealAllowance, 0);
  const totalTax = records.reduce((s, r) => s + r.withholdingTax, 0);
  const totalGovContribs = records.reduce((s, r) => s + r.sss + r.philhealth + r.pagibig, 0);

  const chartData = buildMonthlyChartData(records);
  const monthCount = chartData.length;
  const avgMonthlyNet = monthCount > 0 ? totalNet / monthCount : 0;

  const kpis = [
    { label: 'Total Gross Earnings', value: peso(totalGross) },
    { label: 'Total Net Pay', value: peso(totalNet) },
    { label: 'Total OT Pay', value: peso(totalOt) },
    { label: 'Total Allowances', value: peso(totalAllowances), sub: 'Transportation + Meal' },
    { label: 'Total Tax Withheld', value: peso(totalTax) },
    { label: 'Total Gov\'t Contributions', value: peso(totalGovContribs), sub: 'SSS + PhilHealth + Pag-IBIG' },
  ];

  return (
    <div className="space-y-6">
      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {kpis.map((kpi, i) => (
          <motion.div key={kpi.label} {...fadeUp(i)}>
            <KpiCard label={kpi.label} value={kpi.value} sub={kpi.sub} />
          </motion.div>
        ))}
      </div>

      {/* Monthly chart */}
      <motion.div {...fadeUp(6)} className={CARD}>
        <p className="text-sm font-bold text-gray-900 dark:text-white mb-1">
          Monthly Earnings — 2023
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Combined gross and net pay per calendar month
        </p>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData} barGap={4} barCategoryGap="25%">
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => `₱${(v / 1000).toFixed(0)}k`}
              width={48}
            />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="gross" name="gross" fill="#0038a8" radius={[4, 4, 0, 0]} />
            <Bar dataKey="net" name="net" fill="#059669" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-6 mt-3 text-xs text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ background: '#0038a8' }} />
            Gross Pay
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ background: '#059669' }} />
            Net Pay
          </span>
        </div>
        <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          Average monthly net pay:{' '}
          <strong className="text-gray-900 dark:text-white">{peso(avgMonthlyNet)}</strong>
        </p>
      </motion.div>
    </div>
  );
}

// ─── Tab 3: Tax Summary ───────────────────────────────────────────────────────

const TRAIN_BRACKETS = [
  { range: '₱0 – ₱20,833/mo', rate: '0%', note: '' },
  { range: '₱20,834 – ₱33,332/mo', rate: '20%', note: 'of excess over ₱20,833' },
  { range: '₱33,333 – ₱66,666/mo', rate: '25%', note: '₱2,500 + 25% of excess over ₱33,333' },
  { range: '₱66,667 – ₱166,666/mo', rate: '30%', note: '₱10,833 + 30% of excess over ₱66,667' },
  { range: '₱166,667 – ₱666,666/mo', rate: '32%', note: '₱40,833 + 32% of excess over ₱166,667' },
  { range: 'Over ₱666,667/mo', rate: '35%', note: '₱200,833 + 35% of excess over ₱666,667' },
];

function TaxTab({ records }: { records: PayrollRecord[] }) {
  const totalGross = records.reduce((s, r) => s + r.grossPay, 0);
  const totalTax = records.reduce((s, r) => s + r.withholdingTax, 0);
  const effectiveRate = totalGross > 0 ? ((totalTax / totalGross) * 100).toFixed(2) : '0.00';

  // Build monthly tax table (aggregate by month)
  const monthMap = new Map<string, { month: string; gross: number; tax: number }>();
  records.forEach((r) => {
    const label = new Date(r.payDate + 'T00:00:00').toLocaleDateString('en-PH', {
      month: 'long', year: 'numeric',
    });
    const key = r.payDate.slice(0, 7);
    const existing = monthMap.get(key) ?? { month: label, gross: 0, tax: 0 };
    monthMap.set(key, {
      month: label,
      gross: existing.gross + r.grossPay,
      tax: existing.tax + r.withholdingTax,
    });
  });
  const monthRows = [...monthMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, v]) => v);

  return (
    <div className="space-y-5">
      {/* Summary card */}
      <motion.div {...fadeUp(0)} className={CARD}>
        <p className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Receipt size={16} className="text-gray-400" />
          2023 BIR Withholding Tax Summary
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
        <p className="text-xs text-gray-400 mt-3">
          Based on TRAIN Law 2023 (RA 10963). Your current bracket: <strong className="text-gray-700 dark:text-gray-300">25% marginal rate</strong>
        </p>
      </motion.div>

      {/* Monthly tax table */}
      <motion.div {...fadeUp(1)} className={`${CARD} p-0 overflow-hidden`}>
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <p className="text-sm font-bold text-gray-900 dark:text-white">Monthly Tax Breakdown</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800">
                {['Month', 'Gross Pay', 'Withholding Tax', 'Rate %'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {monthRows.map((row) => {
                const rate = row.gross > 0 ? ((row.tax / row.gross) * 100).toFixed(1) : '0.0';
                return (
                  <tr key={row.month} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium">{row.month}</td>
                    <td className="px-4 py-3 tabular-nums text-gray-700 dark:text-gray-300">{peso(row.gross)}</td>
                    <td className="px-4 py-3 tabular-nums text-red-600 dark:text-red-400 font-medium">{peso(row.tax)}</td>
                    <td className="px-4 py-3 tabular-nums text-gray-600 dark:text-gray-400">{rate}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* TRAIN law brackets */}
      <motion.div {...fadeUp(2)} className={CARD}>
        <p className="text-sm font-bold text-gray-900 dark:text-white mb-3">
          TRAIN Law 2023 Tax Brackets (RA 10963)
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                {['Monthly Income', 'Tax Rate', 'Computation'].map((h) => (
                  <th key={h} className="pb-2 text-left font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide pr-4">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {TRAIN_BRACKETS.map((b, i) => (
                <tr
                  key={b.range}
                  className={`${i === 2 ? 'bg-blue-50 dark:bg-blue-950' : ''} hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors`}
                >
                  <td className="py-2.5 pr-4 text-gray-700 dark:text-gray-300 font-medium whitespace-nowrap">{b.range}</td>
                  <td className="py-2.5 pr-4 font-bold text-amber-600 dark:text-amber-400">{b.rate}</td>
                  <td className="py-2.5 text-gray-500 dark:text-gray-400">{b.note || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-blue-600 dark:text-blue-400 mt-3 font-medium">
          ↑ Highlighted row is your current bracket (₱33,333 – ₱66,666/mo)
        </p>
      </motion.div>

      {/* Alpha list note */}
      <motion.div {...fadeUp(3)} className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-2xl px-5 py-4">
        <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">BIR Form 2316</p>
        <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
          BIR Form 2316 (Certificate of Compensation Payment/Tax Withheld) will be issued at year-end by HR.
          This form is required for income tax return filing.
        </p>
      </motion.div>
    </div>
  );
}

// ─── Tab 4: Government Contributions ─────────────────────────────────────────

function ContributionsTab({ records }: { records: PayrollRecord[] }) {
  const ytdSss = records.reduce((s, r) => s + r.sss, 0);
  const ytdPh = records.reduce((s, r) => s + r.philhealth, 0);
  const ytdPi = records.reduce((s, r) => s + r.pagibig, 0);

  // Monthly contribution rows
  const monthMap = new Map<string, { key: string; month: string; sss: number; ph: number; pi: number }>();
  records.forEach((r) => {
    const key = r.payDate.slice(0, 7);
    const label = new Date(r.payDate + 'T00:00:00').toLocaleDateString('en-PH', {
      month: 'short', year: 'numeric',
    });
    const ex = monthMap.get(key) ?? { key, month: label, sss: 0, ph: 0, pi: 0 };
    monthMap.set(key, { key, month: label, sss: ex.sss + r.sss, ph: ex.ph + r.philhealth, pi: ex.pi + r.pagibig });
  });
  const monthRows = [...monthMap.values()].sort((a, b) => a.key.localeCompare(b.key));

  const contribCards = [
    {
      icon: <Building2 size={20} className="text-blue-600 dark:text-blue-400" />,
      title: 'SSS',
      subtitle: 'Social Security System',
      monthly: 1162.60,
      empShare: 581.30,
      erShare: 581.30,
      ytd: ytdSss,
      note: 'Based on 2023 SSS contribution table',
      extra: 'EC (Employee Compensation) contribution of ₱10 included in employer share.',
    },
    {
      icon: <Landmark size={20} className="text-green-600 dark:text-green-400" />,
      title: 'PhilHealth',
      subtitle: 'Philippine Health Insurance',
      monthly: 750,
      empShare: 375,
      erShare: 375,
      ytd: ytdPh,
      note: 'Per PhilHealth Circular 2022-0005',
      extra: '3% of basic salary (₱25,000/semi-monthly). Total ₱50,000/month × 3% ÷ 2 = ₱750.',
    },
    {
      icon: <CreditCard size={20} className="text-amber-600 dark:text-amber-400" />,
      title: 'Pag-IBIG',
      subtitle: 'Home Development Mutual Fund',
      monthly: 200,
      empShare: 100,
      erShare: 100,
      ytd: ytdPi,
      note: 'Maximum voluntary contribution allowed',
      extra: 'Employee: ₱100/month. Employer: ₱100/month. Total: ₱200/month.',
    },
  ];

  return (
    <div className="space-y-5">
      {/* Three contribution cards */}
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
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Monthly (total)</span>
                <span className="font-bold text-gray-900 dark:text-white tabular-nums">{peso(card.monthly)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Employee share</span>
                <span className="font-semibold text-blue-700 dark:text-blue-300 tabular-nums">{peso(card.empShare)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Employer share</span>
                <span className="font-semibold text-gray-700 dark:text-gray-300 tabular-nums">{peso(card.erShare)}</span>
              </div>
              <div className="flex justify-between border-t border-gray-100 dark:border-gray-800 pt-2 mt-2">
                <span className="text-gray-500 dark:text-gray-400">YTD (employee)</span>
                <span className="font-bold text-green-600 dark:text-green-400 tabular-nums">{peso(card.ytd)}</span>
              </div>
            </div>
            <p className="text-[10px] text-gray-400 mt-3 leading-relaxed">{card.extra}</p>
            <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-1">{card.note}</p>
          </motion.div>
        ))}
      </div>

      {/* Consolidated monthly table */}
      <motion.div {...fadeUp(3)} className={`${CARD} p-0 overflow-hidden`}>
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <p className="text-sm font-bold text-gray-900 dark:text-white">YTD Contributions by Month</p>
          <p className="text-xs text-gray-400 mt-0.5">Employee share only</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800">
                {['Month', 'SSS', 'PhilHealth', 'Pag-IBIG', 'Total'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {monthRows.map((row) => (
                <tr key={row.key} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium">{row.month}</td>
                  <td className="px-4 py-3 tabular-nums text-gray-700 dark:text-gray-300">{peso(row.sss)}</td>
                  <td className="px-4 py-3 tabular-nums text-gray-700 dark:text-gray-300">{peso(row.ph)}</td>
                  <td className="px-4 py-3 tabular-nums text-gray-700 dark:text-gray-300">{peso(row.pi)}</td>
                  <td className="px-4 py-3 tabular-nums font-semibold text-gray-900 dark:text-white">
                    {peso(row.sss + row.ph + row.pi)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 dark:bg-gray-900/50 border-t-2 border-gray-200 dark:border-gray-700">
                <td className="px-4 py-3 font-bold text-gray-900 dark:text-white text-sm">Total</td>
                <td className="px-4 py-3 tabular-nums font-bold text-gray-900 dark:text-white">{peso(ytdSss)}</td>
                <td className="px-4 py-3 tabular-nums font-bold text-gray-900 dark:text-white">{peso(ytdPh)}</td>
                <td className="px-4 py-3 tabular-nums font-bold text-gray-900 dark:text-white">{peso(ytdPi)}</td>
                <td className="px-4 py-3 tabular-nums font-bold text-blue-700 dark:text-blue-300">
                  {peso(ytdSss + ytdPh + ytdPi)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Tab 5: Loans & 13th Month ────────────────────────────────────────────────

function LoansTab() {
  const BASIC_MONTHLY = 50000;
  const MONTHS_WORKED = 11;
  const projected13th = (BASIC_MONTHLY * MONTHS_WORKED) / 12;
  const progressPct = (MONTHS_WORKED / 12) * 100;

  return (
    <div className="space-y-6">
      {/* Active Loans */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <CreditCard size={16} className="text-gray-400" />
            Active Loans
          </p>
          <button
            type="button"
            onClick={() => toast.info('Loan application form will be available soon. Please contact HR.')}
            className="px-4 py-2 text-xs font-semibold rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Request New Loan
          </button>
        </div>

        {loans.map((loan, i) => {
          const paidAmount = loan.principalAmount - loan.outstandingBalance;
          const paidPct = (paidAmount / loan.principalAmount) * 100;
          const totalPayments = loan.totalPayments + loan.remainingPayments;

          return (
            <motion.div key={loan.id} {...fadeUp(i)} className={CARD}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{loan.typeName}</p>
                  <p className="text-xs text-gray-400 mt-0.5 capitalize">{loan.type} loan</p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300">
                  {loan.status.charAt(0).toUpperCase() + loan.status.slice(1)}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Principal</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">{peso(loan.principalAmount)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Outstanding</p>
                  <p className="text-sm font-bold text-red-600 dark:text-red-400 tabular-nums">{peso(loan.outstandingBalance)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Monthly Payment</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">{peso(loan.monthlyPayment)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Remaining Payments</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">{loan.remainingPayments}</p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mb-3">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Paid: {peso(paidAmount)} ({paidPct.toFixed(0)}%)</span>
                  <span>{loan.totalPayments} of {totalPayments} payments</span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-blue-500 transition-all"
                    style={{ width: `${Math.min(paidPct, 100)}%` }}
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-4 text-xs text-gray-400">
                <span>Start: <strong className="text-gray-700 dark:text-gray-300">{loan.startDate}</strong></span>
                <span>Est. End: <strong className="text-gray-700 dark:text-gray-300">{loan.endDate}</strong></span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* 13th Month Pay Projection */}
      <motion.div {...fadeUp(loans.length)} className={CARD}>
        <div className="flex items-start gap-3 mb-4">
          <TrendingUp size={20} className="text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-gray-900 dark:text-white">13th Month Pay Projection</p>
            <p className="text-xs text-gray-400 mt-0.5">Per PD 851 (13th Month Pay Law)</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-1">Basic Salary / Month</p>
            <p className="text-lg font-extrabold text-gray-900 dark:text-white tabular-nums">{peso(BASIC_MONTHLY)}</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-1">Months Worked (Jan – Nov)</p>
            <p className="text-lg font-extrabold text-gray-900 dark:text-white tabular-nums">{MONTHS_WORKED} of 12</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-1">Formula</p>
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Total Basic Pay ÷ 12</p>
            <p className="text-xs text-gray-400 mt-0.5">₱{(BASIC_MONTHLY * MONTHS_WORKED).toLocaleString('en-PH')} ÷ 12</p>
          </div>
          <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
            <p className="text-xs text-amber-600 dark:text-amber-400 mb-1 font-medium">Projected 13th Month Pay</p>
            <p className="text-xl font-extrabold text-amber-700 dark:text-amber-300 tabular-nums">{peso(projected13th)}</p>
          </div>
        </div>

        {/* Progress indicator */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Progress: {MONTHS_WORKED} of 12 months completed</span>
            <span>{progressPct.toFixed(1)}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-amber-500 transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        <div className="space-y-1.5 text-xs text-gray-500 dark:text-gray-400">
          <p>
            Expected release:{' '}
            <strong className="text-gray-700 dark:text-gray-300">On or before December 24, 2023</strong>
          </p>
          <p className="text-green-600 dark:text-green-400 font-medium">
            13th month pay up to ₱90,000 is tax-exempt per TRAIN Law
          </p>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PayslipPage() {
  const latest = payrollRecords[0];

  const tabs = [
    { value: 'payslips',      label: 'My Payslips',        icon: <FileText size={15} /> },
    { value: 'ytd',           label: 'Year-to-Date',        icon: <TrendingUp size={15} /> },
    { value: 'tax',           label: 'Tax Summary',         icon: <Receipt size={15} /> },
    { value: 'contributions', label: "Gov't Contributions", icon: <Building2 size={15} /> },
    { value: 'loans',         label: 'Loans & 13th Month',  icon: <CreditCard size={15} /> },
  ];

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <motion.div {...fadeUp(0)} className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 dark:text-white">Payslip &amp; Salary</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            View payslips, tax summary, and government contributions
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="px-3 py-1.5 rounded-full text-sm font-semibold bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            Current Basic: ₱50,000/month
          </span>
          {latest && (
            <button
              type="button"
              onClick={() => downloadPayslip(latest)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors"
            >
              <Download size={15} />
              Download Latest
            </button>
          )}
        </div>
      </motion.div>

      {/* Tabs */}
      <Tabs defaultValue="payslips">
        <TabsList className="flex-wrap h-auto gap-1 mb-2">
          {tabs.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="flex items-center gap-1.5 text-sm">
              {t.icon}
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="payslips">
          <PayslipsTab records={payrollRecords} />
        </TabsContent>

        <TabsContent value="ytd">
          <YtdTab records={payrollRecords} />
        </TabsContent>

        <TabsContent value="tax">
          <TaxTab records={payrollRecords} />
        </TabsContent>

        <TabsContent value="contributions">
          <ContributionsTab records={payrollRecords} />
        </TabsContent>

        <TabsContent value="loans">
          <LoansTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
