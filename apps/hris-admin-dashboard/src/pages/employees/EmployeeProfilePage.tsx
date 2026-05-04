import { useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Mail, Phone, MapPin, Calendar, Building2,
  CreditCard, Shield, Banknote, Edit, AlertCircle,
  PhoneCall, User, BadgeCheck, FileText, Star, TrendingUp,
  Clock, CheckCircle, XCircle, AlertTriangle, Download,
} from 'lucide-react';
import { format, differenceInYears } from 'date-fns';
import { Chip } from '@mui/material';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useEmployee } from '@/hooks/useEmployees';
import payrollRecordsData from '@/data/mock/payroll-records.json';
import payrollRunsData from '@/data/mock/payroll-runs.json';
import attendanceLogsData from '@/data/mock/attendance-logs.json';
import leaveRequestsData from '@/data/mock/leave-requests.json';
import leaveBalancesData from '@/data/mock/leave-balances.json';
import documentsLibraryData from '@/data/mock/documents-library.json';
import performanceReviewsData from '@/data/mock/performance-reviews.json';
import overtimeRequestsData from '@/data/mock/overtime-requests.json';

import mockEmployeesData from '@/data/mock/employees.json';
import mockEmployeeDetailsData from '@/data/mock/employee-details.json';

type MockEmployee = typeof mockEmployeesData[number];
type MockDetail   = typeof mockEmployeeDetailsData[number];

const statusConfig = {
  active:     { label: 'Active',     color: 'success' as const },
  on_leave:   { label: 'On Leave',   color: 'warning' as const },
  terminated: { label: 'Terminated', color: 'error' as const },
};

const attStatusConfig: Record<string, { label: string; icon: React.ElementType; cls: string }> = {
  present:  { label: 'Present',  icon: CheckCircle,    cls: 'text-green-600 dark:text-green-400' },
  absent:   { label: 'Absent',   icon: XCircle,        cls: 'text-red-500 dark:text-red-400' },
  late:     { label: 'Late',     icon: AlertTriangle,  cls: 'text-amber-500 dark:text-amber-400' },
  half_day: { label: 'Half Day', icon: Clock,          cls: 'text-blue-500 dark:text-blue-400' },
  on_leave: { label: 'On Leave', icon: Calendar,       cls: 'text-purple-500 dark:text-purple-400' },
  holiday:  { label: 'Holiday',  icon: Star,           cls: 'text-indigo-500 dark:text-indigo-400' },
};

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
}

function InfoRow({ label, value, icon: Icon }: { label: string; value?: string | null; icon?: React.ElementType }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
      {Icon && <Icon className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 mb-0.5">{label}</p>
        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 break-words">
          {value || <span className="text-gray-300 dark:text-gray-600 font-normal">—</span>}
        </p>
      </div>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{title}</h3>
      {children}
    </div>
  );
}

function RatingBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-500 w-36 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
        <div
          className="h-full rounded-full bg-[#0038a8]"
          style={{ width: `${(value / 5) * 100}%` }}
        />
      </div>
      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 w-6 text-right">{value || '—'}</span>
    </div>
  );
}

// ─── TAB: PAYROLL ──────────────────────────────────────────────────────────────
function PayrollTab({ employeeId }: { employeeId: string }) {
  const records = useMemo(
    () => payrollRecordsData.filter((r) => r.employeeId === employeeId),
    [employeeId]
  );

  const runsMap = useMemo(() => {
    const m: Record<string, typeof payrollRunsData[number]> = {};
    payrollRunsData.forEach((r) => { m[r.id] = r; });
    return m;
  }, []);

  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Banknote className="w-10 h-10 text-gray-200 dark:text-gray-700 mb-3" />
        <p className="text-sm text-gray-400">No payroll records found.</p>
      </div>
    );
  }

  const latest = records[0];
  const run = runsMap[latest.runId];

  return (
    <div className="flex flex-col gap-5">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Gross Pay',        value: `₱${latest.grossPay.toLocaleString()}` },
          { label: 'Total Deductions', value: `₱${latest.totalDeductions.toLocaleString()}` },
          { label: 'Net Pay',          value: `₱${latest.netPay.toLocaleString()}` },
          { label: 'Days Worked',      value: `${latest.daysWorked} days` },
        ].map((c) => (
          <div key={c.label} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
            <p className="text-xs text-gray-400 mb-1">{c.label}</p>
            <p className="text-base font-bold text-gray-900 dark:text-white">{c.value}</p>
            {c.label === 'Net Pay' && run && (
              <p className="text-[10px] text-gray-400 mt-0.5">{run.period}</p>
            )}
          </div>
        ))}
      </div>

      {/* Payslip breakdown */}
      <SectionCard title="Latest Payslip Breakdown">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Earnings</p>
            <InfoRow label="Basic Pay"              value={`₱${latest.basicPay.toLocaleString()}`} />
            <InfoRow label="Overtime Pay"           value={`₱${latest.overtimePay.toLocaleString()}`} />
            <InfoRow label="Transportation Allow."  value={`₱${latest.transportationAllowance.toLocaleString()}`} />
            <InfoRow label="Meal Allowance"         value={`₱${latest.mealAllowance.toLocaleString()}`} />
            <div className="flex items-center justify-between py-2 border-t border-gray-200 dark:border-gray-700 mt-1">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Gross Pay</span>
              <span className="text-sm font-bold text-gray-900 dark:text-white">₱{latest.grossPay.toLocaleString()}</span>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Deductions</p>
            <InfoRow label="SSS"                    value={`₱${latest.sss.toLocaleString()}`} />
            <InfoRow label="PhilHealth"             value={`₱${latest.philhealth.toLocaleString()}`} />
            <InfoRow label="Pag-IBIG"               value={`₱${latest.pagibig.toLocaleString()}`} />
            <InfoRow label="Withholding Tax"        value={`₱${latest.withholdingTax.toLocaleString()}`} />
            {latest.sssLoan > 0   && <InfoRow label="SSS Loan"    value={`₱${latest.sssLoan.toLocaleString()}`} />}
            {latest.pagibigLoan > 0 && <InfoRow label="Pag-IBIG Loan" value={`₱${latest.pagibigLoan.toLocaleString()}`} />}
            {latest.companyLoan > 0 && <InfoRow label="Company Loan" value={`₱${latest.companyLoan.toLocaleString()}`} />}
            {latest.tardiness > 0  && <InfoRow label="Tardiness"  value={`₱${latest.tardiness.toLocaleString()}`} />}
            <div className="flex items-center justify-between py-2 border-t border-gray-200 dark:border-gray-700 mt-1">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Total Deductions</span>
              <span className="text-sm font-bold text-red-600 dark:text-red-400">₱{latest.totalDeductions.toLocaleString()}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between mt-3 pt-3 border-t-2 border-[#0038a8]/20">
          <span className="text-base font-bold text-gray-900 dark:text-white">Net Pay</span>
          <span className="text-base font-bold text-[#0038a8]">₱{latest.netPay.toLocaleString()}</span>
        </div>
      </SectionCard>

      {/* Payroll history table */}
      <SectionCard title={`Payroll History (${records.length} payslips)`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                {['Period', 'Gross Pay', 'Deductions', 'Net Pay', 'Days'].map((h) => (
                  <th key={h} className="text-left py-2 pr-4 text-xs font-semibold text-gray-400 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map((r) => {
                const runInfo = runsMap[r.runId];
                return (
                  <tr key={r.id} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="py-2.5 pr-4 text-xs text-gray-500 whitespace-nowrap">{runInfo?.period ?? r.runId}</td>
                    <td className="py-2.5 pr-4 text-sm font-medium text-gray-800 dark:text-gray-200">₱{r.grossPay.toLocaleString()}</td>
                    <td className="py-2.5 pr-4 text-sm text-red-600 dark:text-red-400">₱{r.totalDeductions.toLocaleString()}</td>
                    <td className="py-2.5 pr-4 text-sm font-semibold text-[#0038a8]">₱{r.netPay.toLocaleString()}</td>
                    <td className="py-2.5 text-sm text-gray-500">{r.daysWorked}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}

// ─── TAB: ATTENDANCE ───────────────────────────────────────────────────────────
function AttendanceTab({ employeeId }: { employeeId: string }) {
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 15;

  const logs = useMemo(
    () => attendanceLogsData
      .filter((l) => l.employeeId === employeeId)
      .sort((a, b) => b.date.localeCompare(a.date)),
    [employeeId]
  );

  const totalPages = Math.ceil(logs.length / PAGE_SIZE);
  const pageLogs = logs.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const stats = useMemo(() => ({
    present:  logs.filter((l) => l.status === 'present').length,
    absent:   logs.filter((l) => l.status === 'absent').length,
    late:     logs.filter((l) => l.status === 'late' || l.lateMinutes > 0).length,
    totalHours: logs.reduce((s, l) => s + (l.workHours ?? 0), 0),
  }), [logs]);

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Clock className="w-10 h-10 text-gray-200 dark:text-gray-700 mb-3" />
        <p className="text-sm text-gray-400">No attendance records found.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Days Present', value: stats.present, cls: 'text-green-600 dark:text-green-400' },
          { label: 'Days Absent',  value: stats.absent,  cls: 'text-red-500 dark:text-red-400' },
          { label: 'Late Arrivals',value: stats.late,    cls: 'text-amber-500 dark:text-amber-400' },
          { label: 'Total Hours',  value: `${stats.totalHours}h`, cls: 'text-[#0038a8]' },
        ].map((c) => (
          <div key={c.label} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
            <p className="text-xs text-gray-400 mb-1">{c.label}</p>
            <p className={`text-xl font-bold ${c.cls}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Logs table */}
      <SectionCard title={`Attendance Logs (${logs.length} records)`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                {['Date', 'Time In', 'Time Out', 'Hours', 'Late (min)', 'Status', 'Source'].map((h) => (
                  <th key={h} className="text-left py-2 pr-4 text-xs font-semibold text-gray-400 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageLogs.map((log) => {
                const cfg = attStatusConfig[log.status] ?? attStatusConfig['present'];
                const StatusIcon = cfg.icon;
                return (
                  <tr key={log.id} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="py-2.5 pr-4 text-xs font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      {format(new Date(log.date), 'MMM d, yyyy')}
                    </td>
                    <td className="py-2.5 pr-4 text-xs text-gray-500">{log.timeIn || '—'}</td>
                    <td className="py-2.5 pr-4 text-xs text-gray-500">{log.timeOut || '—'}</td>
                    <td className="py-2.5 pr-4 text-xs text-gray-500">{log.workHours ?? '—'}h</td>
                    <td className="py-2.5 pr-4 text-xs text-gray-500">{log.lateMinutes > 0 ? log.lateMinutes : '—'}</td>
                    <td className="py-2.5 pr-4">
                      <span className={`flex items-center gap-1 text-xs font-medium ${cfg.cls}`}>
                        <StatusIcon className="w-3 h-3" />
                        {cfg.label}
                      </span>
                    </td>
                    <td className="py-2.5 text-xs text-gray-400 capitalize">{log.source}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
            <p className="text-xs text-gray-400">Page {page + 1} of {totalPages}</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Prev</Button>
              <Button size="sm" variant="outline" disabled={page === totalPages - 1} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

// ─── TAB: LEAVES ───────────────────────────────────────────────────────────────
function LeavesTab({ employeeId }: { employeeId: string }) {
  const requests = useMemo(
    () => leaveRequestsData.filter((r) => r.employeeId === employeeId),
    [employeeId]
  );

  const balance = useMemo(
    () => leaveBalancesData.find((b) => b.employeeId === employeeId),
    [employeeId]
  );

  const leaveStatusCls: Record<string, string> = {
    approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    pending:  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    rejected: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    cancelled:'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Leave balance */}
      {balance && (
        <SectionCard title={`Leave Balances — ${balance.year}`}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Object.entries(balance)
              .filter(([k]) => !['employeeId', 'year'].includes(k))
              .map(([key, val]) => {
                const v = val as { entitled: number; used: number; remaining: number; carryOver?: number };
                if (typeof v !== 'object' || v === null) return null;
                return (
                  <div key={key} className="border border-gray-100 dark:border-gray-800 rounded-xl p-3">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{key.toUpperCase()}</p>
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-xl font-bold text-gray-900 dark:text-white">{v.remaining}</p>
                        <p className="text-[10px] text-gray-400">remaining</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">{v.used} used</p>
                        <p className="text-xs text-gray-400">of {v.entitled + (v.carryOver ?? 0)} total</p>
                      </div>
                    </div>
                    <div className="mt-2 h-1 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#0038a8]"
                        style={{ width: `${Math.min(((v.entitled + (v.carryOver ?? 0) - v.remaining) / (v.entitled + (v.carryOver ?? 0))) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </SectionCard>
      )}

      {/* Leave requests */}
      <SectionCard title={`Leave Requests (${requests.length})`}>
        {requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Calendar className="w-8 h-8 text-gray-200 dark:text-gray-700 mb-2" />
            <p className="text-xs text-gray-400">No leave requests on file.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {requests.map((req) => (
              <div key={req.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 border border-gray-100 dark:border-gray-800 rounded-xl">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{req.leaveTypeName}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${leaveStatusCls[req.status] ?? leaveStatusCls['pending']}`}>
                      {req.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {format(new Date(req.startDate), 'MMM d')} – {format(new Date(req.endDate), 'MMM d, yyyy')} · {req.days} day{req.days !== 1 ? 's' : ''}
                  </p>
                  {req.reason && <p className="text-xs text-gray-500 mt-0.5 italic">"{req.reason}"</p>}
                </div>
                <p className="text-[10px] text-gray-400 shrink-0">
                  Filed {format(new Date(req.submittedAt), 'MMM d, yyyy')}
                </p>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

// ─── TAB: DOCUMENTS ────────────────────────────────────────────────────────────
function DocumentsTab({ employeeId, employeeName }: { employeeId: string; employeeName: string }) {
  const docs = useMemo(
    () => documentsLibraryData.filter((d) => d.employeeId === employeeId),
    [employeeId]
  );

  const docStatusCls: Record<string, string> = {
    active:   'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    expired:  'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    archived: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">{docs.length} document{docs.length !== 1 ? 's' : ''} on file for {employeeName}</p>
        <Button size="sm" variant="outline" className="flex items-center gap-1.5 text-xs">
          <Download className="w-3.5 h-3.5" /> Export All
        </Button>
      </div>

      {docs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-gray-200 dark:border-gray-700 rounded-2xl">
          <FileText className="w-10 h-10 text-gray-200 dark:text-gray-700 mb-3" />
          <p className="text-sm text-gray-400">No documents on file.</p>
          <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">Documents uploaded during onboarding will appear here.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {docs.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between gap-3 p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl hover:border-[#0038a8]/30 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[#0038a8]/10 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-[#0038a8]" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{doc.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize ${docStatusCls[doc.status] ?? docStatusCls['active']}`}>
                      {doc.status}
                    </span>
                    <span className="text-[10px] text-gray-400">{doc.fileType.toUpperCase()} · {doc.fileSize}</span>
                    {doc.expiryDate && (
                      <span className="text-[10px] text-gray-400">Expires {format(new Date(doc.expiryDate), 'MMM d, yyyy')}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] text-gray-400">{doc.version}</span>
                <Button size="sm" variant="outline" className="text-xs h-7 px-2.5 flex items-center gap-1">
                  <Download className="w-3 h-3" /> Download
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── TAB: PERFORMANCE ──────────────────────────────────────────────────────────
function PerformanceTab({ employeeId }: { employeeId: string }) {
  const reviews = useMemo(
    () => performanceReviewsData.filter((r) => r.employeeId === employeeId),
    [employeeId]
  );

  const reviewStatusCls: Record<string, string> = {
    completed:       'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    manager_review:  'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    self_assessment: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    draft:           'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
  };

  if (reviews.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <TrendingUp className="w-10 h-10 text-gray-200 dark:text-gray-700 mb-3" />
        <p className="text-sm text-gray-400">No performance reviews found.</p>
      </div>
    );
  }

  const latest = reviews[0];
  const hasManagerReview = latest.managerReview?.overallRating > 0;

  return (
    <div className="flex flex-col gap-5">
      {/* Overall rating card */}
      {hasManagerReview && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#0038a8] flex items-center justify-center shrink-0">
              <span className="text-2xl font-extrabold text-white">{latest.finalRating.toFixed(1)}</span>
            </div>
            <div>
              <p className="text-xs text-gray-400">Final Rating</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {latest.finalRating >= 4.5 ? 'Outstanding' :
                 latest.finalRating >= 3.5 ? 'Exceeds Expectations' :
                 latest.finalRating >= 2.5 ? 'Meets Expectations' : 'Needs Improvement'}
              </p>
              <div className="flex">
                {[1,2,3,4,5].map((s) => (
                  <Star
                    key={s}
                    className={`w-3.5 h-3.5 ${s <= Math.round(latest.finalRating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200 dark:text-gray-700'}`}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="flex-1 sm:pl-5 sm:border-l border-gray-100 dark:border-gray-800">
            {latest.managerReview?.strengths && (
              <div className="mb-2">
                <p className="text-xs font-semibold text-gray-400 mb-1">Manager Strengths Note</p>
                <p className="text-sm text-gray-700 dark:text-gray-300 italic">"{latest.managerReview.strengths}"</p>
              </div>
            )}
            {latest.managerReview?.comments && (
              <p className="text-xs text-gray-500 italic">"{latest.managerReview.comments}"</p>
            )}
          </div>
        </div>
      )}

      {/* Competency breakdown */}
      {hasManagerReview && (
        <SectionCard title="Competency Ratings (Manager Evaluation)">
          <div className="flex flex-col gap-3 pt-1">
            <RatingBar label="Quality of Work"   value={latest.managerReview.qualityOfWork} />
            <RatingBar label="Productivity"      value={latest.managerReview.productivity} />
            <RatingBar label="Communication"     value={latest.managerReview.communication} />
            <RatingBar label="Teamwork"          value={latest.managerReview.teamwork} />
            <RatingBar label="Leadership"        value={latest.managerReview.leadership} />
            <RatingBar label="Initiative"        value={latest.managerReview.initiative} />
            <RatingBar label="Technical Skills"  value={latest.managerReview.technicalSkills} />
            <RatingBar label="Attendance"        value={latest.managerReview.attendance} />
          </div>
        </SectionCard>
      )}

      {/* Self-assessment */}
      {latest.selfAssessment && (
        <SectionCard title="Self-Assessment">
          <div className="flex flex-col gap-3">
            {latest.selfAssessment.accomplishments && (
              <div>
                <p className="text-xs font-semibold text-gray-400 mb-1">Key Accomplishments</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{latest.selfAssessment.accomplishments}</p>
              </div>
            )}
            {latest.selfAssessment.improvements && (
              <div>
                <p className="text-xs font-semibold text-gray-400 mb-1">Areas for Improvement</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{latest.selfAssessment.improvements}</p>
              </div>
            )}
            {latest.selfAssessment.careerGoals && (
              <div>
                <p className="text-xs font-semibold text-gray-400 mb-1">Career Goals</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{latest.selfAssessment.careerGoals}</p>
              </div>
            )}
          </div>
        </SectionCard>
      )}

      {/* Review history */}
      <SectionCard title={`Review History (${reviews.length})`}>
        <div className="flex flex-col gap-2">
          {reviews.map((rev) => (
            <div key={rev.id} className="flex items-center justify-between gap-3 p-3 border border-gray-100 dark:border-gray-800 rounded-xl">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-gray-400 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Review Cycle {rev.cycleId}</p>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${reviewStatusCls[rev.status] ?? reviewStatusCls['draft']}`}>
                    {rev.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
              {rev.finalRating > 0 && (
                <span className="text-sm font-bold text-[#0038a8]">{rev.finalRating.toFixed(1)}/5</span>
              )}
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

// ─── TAB: 201 FILE ─────────────────────────────────────────────────────────────
function File201Tab({ employeeId, employee: _employee, details }: {
  employeeId: string;
  employee: MockEmployee;
  details: MockDetail | undefined;
}) {
  const docs = useMemo(
    () => documentsLibraryData.filter((d) => d.employeeId === employeeId),
    [employeeId]
  );

  const sections = [
    {
      title: 'Employment Records',
      items: [
        { label: 'Employment Contract',  present: docs.some((d) => d.categoryId === 'dcat001') },
        { label: 'Job Description',      present: false },
        { label: 'Appointment Letter',   present: false },
      ],
    },
    {
      title: 'Government Documents',
      items: [
        { label: 'SSS E-1 Form',         present: !!details?.sss },
        { label: 'PhilHealth MDR',       present: !!details?.philhealth },
        { label: 'Pag-IBIG MDF',         present: !!details?.pagibig },
        { label: 'BIR TIN / 1902',       present: !!details?.tin },
      ],
    },
    {
      title: 'Pre-employment Requirements',
      items: [
        { label: 'NBI Clearance',        present: docs.some((d) => d.tags?.includes('nbi')) },
        { label: 'Medical Certificate',  present: docs.some((d) => d.tags?.includes('medical')) },
        { label: 'Diploma / TOR',        present: docs.some((d) => d.categoryId === 'dcat003') },
        { label: 'PRC License',          present: docs.some((d) => d.tags?.includes('prc')) },
      ],
    },
    {
      title: 'Disciplinary Records',
      items: [
        { label: 'Notice to Explain',    present: docs.some((d) => d.tags?.includes('nte')) },
        { label: 'Notice of Decision',   present: false },
        { label: 'Written Warning',      present: false },
      ],
    },
  ];

  const totalItems = sections.flatMap((s) => s.items).length;
  const presentItems = sections.flatMap((s) => s.items).filter((i) => i.present).length;
  const completeness = Math.round((presentItems / totalItems) * 100);

  return (
    <div className="flex flex-col gap-5">
      {/* Completeness */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">201 File Completeness</p>
            <p className="text-xs text-gray-400 mt-0.5">{presentItems} of {totalItems} documents on file</p>
          </div>
          <span className={`text-2xl font-extrabold ${completeness >= 80 ? 'text-green-600' : completeness >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
            {completeness}%
          </span>
        </div>
        <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${completeness >= 80 ? 'bg-green-500' : completeness >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
            style={{ width: `${completeness}%` }}
          />
        </div>
      </div>

      {/* Sections */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {sections.map((sec) => (
          <SectionCard key={sec.title} title={sec.title}>
            <div className="flex flex-col gap-1">
              {sec.items.map((item) => (
                <div key={item.label} className="flex items-center gap-2 py-1.5">
                  {item.present ? (
                    <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-gray-300 dark:text-gray-600 shrink-0" />
                  )}
                  <span className={`text-sm ${item.present ? 'text-gray-800 dark:text-gray-200' : 'text-gray-400'}`}>
                    {item.label}
                  </span>
                  {!item.present && (
                    <span className="ml-auto text-[10px] text-amber-500 font-medium">Missing</span>
                  )}
                </div>
              ))}
            </div>
          </SectionCard>
        ))}
      </div>

      {/* Uploaded docs */}
      {docs.length > 0 && (
        <SectionCard title={`Uploaded Files (${docs.length})`}>
          <div className="flex flex-col gap-2">
            {docs.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between gap-2 py-2 border-b border-gray-50 dark:border-gray-800 last:border-0">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-4 h-4 text-[#0038a8] shrink-0" />
                  <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{doc.name}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] text-gray-400">{format(new Date(doc.uploadedDate), 'MMM d, yyyy')}</span>
                  <Button size="sm" variant="outline" className="text-xs h-6 px-2 flex items-center gap-1">
                    <Download className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  );
}

// ─── TAB: ACTIVITY TIMELINE ────────────────────────────────────────────────────
function ActivityTimelineTab({ employeeId }: { employeeId: string }) {
  type TEvent = {
    id: string; date: Date; icon: React.ElementType;
    dotCls: string; title: string; desc: string;
    tag: string; tagCls: string;
  };

  const events = useMemo<TEvent[]>(() => {
    const out: TEvent[] = [];

    // Leave requests
    leaveRequestsData
      .filter((r) => r.employeeId === employeeId)
      .forEach((r) => {
        const tagCls =
          r.status === 'approved' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
          r.status === 'rejected' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
          'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
        out.push({
          id: `leave-${r.id}`,
          date: new Date(r.submittedAt),
          icon: Calendar,
          dotCls: r.status === 'approved' ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' :
                  r.status === 'rejected' ? 'bg-red-100 dark:bg-red-900/30 text-red-500' :
                  'bg-amber-100 dark:bg-amber-900/30 text-amber-500',
          title: `Leave Request: ${r.leaveTypeName}`,
          desc: `${r.days} day${r.days !== 1 ? 's' : ''} · ${format(new Date(r.startDate), 'MMM d')} – ${format(new Date(r.endDate), 'MMM d, yyyy')}${r.reason ? ` · "${r.reason}"` : ''}`,
          tag: r.status,
          tagCls,
        });
      });

    // Payroll records
    const runsMap: Record<string, typeof payrollRunsData[number]> = {};
    payrollRunsData.forEach((r) => { runsMap[r.id] = r; });
    payrollRecordsData
      .filter((r) => r.employeeId === employeeId)
      .forEach((r) => {
        const run = runsMap[r.runId];
        if (!run?.payDate) return;
        out.push({
          id: `payroll-${r.id}`,
          date: new Date(run.payDate),
          icon: Banknote,
          dotCls: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
          title: 'Payslip Released',
          desc: `${run.period} · Net Pay: ₱${r.netPay.toLocaleString()} · Gross: ₱${r.grossPay.toLocaleString()}`,
          tag: 'payroll',
          tagCls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        });
      });

    // Overtime requests
    overtimeRequestsData
      .filter((r) => r.employeeId === employeeId)
      .forEach((r) => {
        out.push({
          id: `ot-${r.id}`,
          date: new Date(r.date),
          icon: Clock,
          dotCls: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400',
          title: `Overtime Filed: ${r.hours}h (${r.type})`,
          desc: `${r.startTime} – ${r.endTime}${r.reason ? ` · ${r.reason}` : ''}`,
          tag: r.status,
          tagCls: r.status === 'approved'
            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
        });
      });

    // Performance reviews
    performanceReviewsData
      .filter((r) => r.employeeId === employeeId)
      .forEach((r) => {
        const rawDate = r.managerReview?.reviewDate;
        const date = rawDate ? new Date(rawDate) : null;
        if (!date || isNaN(date.getTime())) return;
        out.push({
          id: `perf-${r.id}`,
          date,
          icon: TrendingUp,
          dotCls: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
          title: 'Performance Review Completed',
          desc: `Cycle ${r.cycleId} · Final Rating: ${r.finalRating > 0 ? `${r.finalRating.toFixed(1)}/5` : 'Pending'}`,
          tag: r.status.replace('_', ' '),
          tagCls: r.status === 'completed'
            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
        });
      });

    return out.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [employeeId]);

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Clock className="w-10 h-10 text-gray-200 dark:text-gray-700 mb-3" />
        <p className="text-sm text-gray-400">No activity recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="relative pl-8">
      <div className="absolute left-3.5 top-3 bottom-3 w-px bg-gray-100 dark:bg-gray-800" />
      {events.map((event, i) => {
        const Icon = event.icon;
        return (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.02, duration: 0.2 }}
            className="relative flex gap-4 pb-5 last:pb-0"
          >
            <div className={`absolute -left-8 mt-0.5 w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${event.dotCls}`}>
              <Icon className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{event.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{event.desc}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize whitespace-nowrap ${event.tagCls}`}>
                    {event.tag}
                  </span>
                  <p className="text-[10px] text-gray-400 whitespace-nowrap">
                    {format(event.date, 'MMM d, yyyy')}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function EmployeeProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: dbEmployee, isLoading } = useEmployee(id);

  // Build an adapter that matches the shape the JSX expects
  const employee = useMemo((): MockEmployee | undefined => {
    if (dbEmployee) {
      return {
        id:         dbEmployee.id,
        name:       dbEmployee.name,
        position:   dbEmployee.position ?? '',
        department: dbEmployee.department ?? '',
        status:     dbEmployee.status,
        hireDate:   dbEmployee.dateHired ?? '',
        birthday:   dbEmployee.birthday ?? '',
        salary:     dbEmployee.salary,
        type:       dbEmployee.employmentType ?? '',
        avatar:     dbEmployee.avatarUrl ?? null,
      } as MockEmployee;
    }
    return mockEmployeesData.find((e) => e.id === id) as MockEmployee | undefined;
  }, [dbEmployee, id]);

  const details = useMemo((): MockDetail | undefined => {
    if (dbEmployee) {
      return {
        id:                 dbEmployee.id,
        companyEmail:       dbEmployee.workEmail ?? '',
        personalEmail:      dbEmployee.personalEmail ?? '',
        mobile:             dbEmployee.mobile ?? '',
        landline:           dbEmployee.landline ?? '',
        address: {
          street:   dbEmployee.addressLine1 ?? '',
          city:     dbEmployee.city ?? '',
          province: dbEmployee.province ?? '',
          zip:      dbEmployee.zipCode ?? '',
        },
        emergencyContact: dbEmployee.emergencyName ? {
          name:         dbEmployee.emergencyName,
          relationship: dbEmployee.emergencyRelationship ?? '',
          phone:        dbEmployee.emergencyPhone ?? '',
        } : undefined,
        regularizationDate: dbEmployee.dateRegularized ?? '',
        gender:       dbEmployee.gender ?? '',
        civilStatus:  dbEmployee.civilStatus ?? '',
        nationality:  dbEmployee.nationality ?? '',
        sss:          dbEmployee.sss ?? '',
        philhealth:   dbEmployee.philhealth ?? '',
        pagibig:      dbEmployee.pagibig ?? '',
        tin:          dbEmployee.tin ?? '',
        bank: dbEmployee.bankName ? {
          name:          dbEmployee.bankName,
          accountNumber: dbEmployee.accountNumber ?? '',
          accountName:   dbEmployee.accountName ?? '',
          type:          dbEmployee.accountType ?? '',
        } : undefined,
        supervisor: dbEmployee.managerId ?? '',
        notes: '',
      } as unknown as MockDetail;
    }
    return mockEmployeeDetailsData.find((d) => d.id === id) as MockDetail | undefined;
  }, [dbEmployee, id]);

  const supervisor = useMemo(
    () => (details as any)?.supervisor
      ? mockEmployeesData.find((e) => e.id === (details as any).supervisor)
      : null,
    [details]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 rounded-full border-2 border-[#0038a8] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <AlertCircle className="w-10 h-10 text-gray-300 mb-4" />
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Employee not found</p>
        <Button variant="outline" size="sm" onClick={() => navigate('/employees')} className="mt-4">
          Back to list
        </Button>
      </div>
    );
  }

  const tenure = differenceInYears(new Date(), new Date(employee.hireDate));
  const statusCfg = statusConfig[employee.status as keyof typeof statusConfig];

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      {/* Back nav */}
      <Link
        to="/employees"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors mb-5"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Employees
      </Link>

      {/* Profile header */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 mb-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="w-20 h-20 rounded-2xl bg-[#0038a8] flex items-center justify-center text-white text-2xl font-bold shrink-0">
            {getInitials(employee.name)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-xl font-extrabold text-gray-900 dark:text-white">{employee.name}</h1>
              <Chip
                label={statusCfg?.label ?? employee.status}
                color={statusCfg?.color ?? 'default'}
                size="small"
                sx={{ fontSize: 11, fontWeight: 600 }}
              />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{employee.position}</p>
            <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-gray-400">
              <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />{employee.department}</span>
              <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />Hired {format(new Date(employee.hireDate), 'MMM d, yyyy')}</span>
              <span className="flex items-center gap-1"><BadgeCheck className="w-3.5 h-3.5" />{tenure} yr{tenure !== 1 ? 's' : ''} tenure</span>
              <span className="flex items-center gap-1">
                <span className="capitalize bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full text-gray-600 dark:text-gray-400">
                  {employee.type}
                </span>
              </span>
            </div>
            {details && (
              <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-gray-400">
                {details.companyEmail && (
                  <a href={`mailto:${details.companyEmail}`} className="flex items-center gap-1 hover:text-[#0038a8] transition-colors">
                    <Mail className="w-3.5 h-3.5" />{details.companyEmail}
                  </a>
                )}
                {details.mobile && (
                  <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{details.mobile}</span>
                )}
              </div>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/employees/${id}/edit`)}
            className="flex items-center gap-1.5 shrink-0"
          >
            <Edit className="w-4 h-4" />
            Edit
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <div className="overflow-x-auto pb-1">
          <TabsList className="w-max">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="personal">Personal</TabsTrigger>
            <TabsTrigger value="employment">Employment</TabsTrigger>
            <TabsTrigger value="govids">Gov&apos;t IDs &amp; Bank</TabsTrigger>
            <TabsTrigger value="payroll">Payroll</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="leaves">Leaves</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="file201">201 File</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
          </TabsList>
        </div>

        {/* ── Overview ── */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 flex flex-col gap-4">
              <SectionCard title="Contact Information">
                <InfoRow label="Company Email"  value={details?.companyEmail}  icon={Mail} />
                <InfoRow label="Personal Email" value={details?.personalEmail} icon={Mail} />
                <InfoRow label="Mobile"         value={details?.mobile}        icon={Phone} />
                <InfoRow label="Landline"       value={details?.landline || undefined} icon={PhoneCall} />
                {details?.address && (
                  <InfoRow
                    label="Address"
                    value={`${details.address.street}, ${details.address.city}, ${details.address.province} ${details.address.zip}`}
                    icon={MapPin}
                  />
                )}
              </SectionCard>

              {details?.emergencyContact && (
                <SectionCard title="Emergency Contact">
                  <InfoRow label="Name"         value={details.emergencyContact.name}         icon={User} />
                  <InfoRow label="Relationship" value={details.emergencyContact.relationship} />
                  <InfoRow label="Phone"        value={details.emergencyContact.phone}        icon={Phone} />
                </SectionCard>
              )}

              {details?.notes && (
                <SectionCard title="Notes">
                  <p className="text-sm text-gray-700 dark:text-gray-300">{details.notes}</p>
                </SectionCard>
              )}
            </div>

            <div className="flex flex-col gap-4">
              <SectionCard title="Employment Summary">
                <InfoRow label="Position"        value={employee.position} />
                <InfoRow label="Department"      value={employee.department} />
                <InfoRow label="Employment Type" value={employee.type.charAt(0).toUpperCase() + employee.type.slice(1)} />
                <InfoRow label="Hire Date"       value={format(new Date(employee.hireDate), 'MMMM d, yyyy')} />
                {details?.regularizationDate && (
                  <InfoRow label="Regularization Date" value={format(new Date(details.regularizationDate), 'MMMM d, yyyy')} />
                )}
              </SectionCard>

              {supervisor && (
                <SectionCard title="Direct Supervisor">
                  <div
                    className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl p-2 -mx-2 transition-colors"
                    onClick={() => navigate(`/employees/${supervisor.id}`)}
                  >
                    <div className="w-9 h-9 rounded-full bg-[#0038a8] flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {getInitials(supervisor.name)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{supervisor.name}</p>
                      <p className="text-xs text-gray-400">{supervisor.position}</p>
                    </div>
                  </div>
                </SectionCard>
              )}

              <SectionCard title="Compensation">
                <InfoRow label="Monthly Salary" value={`₱${employee.salary.toLocaleString()}`} icon={Banknote} />
              </SectionCard>
            </div>
          </div>
        </TabsContent>

        {/* ── Personal ── */}
        <TabsContent value="personal">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SectionCard title="Personal Information">
              <InfoRow label="Full Name"    value={employee.name}                                                                              icon={User} />
              <InfoRow label="Birthday"    value={employee.birthday ? format(new Date(employee.birthday), 'MMMM d, yyyy') : undefined}       icon={Calendar} />
              <InfoRow label="Gender"      value={details?.gender} />
              <InfoRow label="Civil Status" value={details?.civilStatus} />
              <InfoRow label="Nationality" value={details?.nationality} />
            </SectionCard>

            <SectionCard title="Address">
              {details?.address ? (
                <>
                  <InfoRow label="Street"   value={details.address.street}   icon={MapPin} />
                  <InfoRow label="City"     value={details.address.city} />
                  <InfoRow label="Province" value={details.address.province} />
                  <InfoRow label="ZIP Code" value={details.address.zip} />
                </>
              ) : (
                <p className="text-sm text-gray-400 py-4">No address on file.</p>
              )}
            </SectionCard>

            <SectionCard title="Contact">
              <InfoRow label="Personal Email" value={details?.personalEmail} icon={Mail} />
              <InfoRow label="Mobile"         value={details?.mobile}        icon={Phone} />
              <InfoRow label="Landline"       value={details?.landline || undefined} icon={PhoneCall} />
            </SectionCard>

            {details?.emergencyContact && (
              <SectionCard title="Emergency Contact">
                <InfoRow label="Name"         value={details.emergencyContact.name}         icon={User} />
                <InfoRow label="Relationship" value={details.emergencyContact.relationship} />
                <InfoRow label="Phone"        value={details.emergencyContact.phone}        icon={Phone} />
              </SectionCard>
            )}
          </div>
        </TabsContent>

        {/* ── Employment ── */}
        <TabsContent value="employment">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SectionCard title="Job Details">
              <InfoRow label="Employee ID"      value={employee.id} />
              <InfoRow label="Position"         value={employee.position} />
              <InfoRow label="Department"       value={employee.department}  icon={Building2} />
              <InfoRow label="Employment Type"  value={employee.type.charAt(0).toUpperCase() + employee.type.slice(1)} />
              <InfoRow label="Status"           value={statusCfg?.label} />
            </SectionCard>

            <SectionCard title="Dates">
              <InfoRow label="Hire Date"  value={format(new Date(employee.hireDate), 'MMMM d, yyyy')} icon={Calendar} />
              {details?.regularizationDate && (
                <InfoRow label="Regularization Date" value={format(new Date(details.regularizationDate), 'MMMM d, yyyy')} icon={Calendar} />
              )}
              <InfoRow label="Tenure" value={`${tenure} year${tenure !== 1 ? 's' : ''}`} />
            </SectionCard>

            <SectionCard title="Compensation">
              <InfoRow label="Monthly Basic Salary" value={`₱${employee.salary.toLocaleString()}`}           icon={Banknote} />
              <InfoRow label="Annual Salary"        value={`₱${(employee.salary * 12).toLocaleString()}`} />
            </SectionCard>

            {supervisor && (
              <SectionCard title="Reporting To">
                <div
                  className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl p-2 -mx-2 transition-colors"
                  onClick={() => navigate(`/employees/${supervisor.id}`)}
                >
                  <div className="w-9 h-9 rounded-full bg-[#0038a8] flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {getInitials(supervisor.name)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{supervisor.name}</p>
                    <p className="text-xs text-gray-400">{supervisor.position} · {supervisor.department}</p>
                  </div>
                </div>
              </SectionCard>
            )}
          </div>
        </TabsContent>

        {/* ── Gov't IDs & Bank ── */}
        <TabsContent value="govids">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SectionCard title="Government IDs">
              <InfoRow label="SSS Number"       value={details?.sss}        icon={Shield} />
              <InfoRow label="PhilHealth Number" value={details?.philhealth} icon={Shield} />
              <InfoRow label="Pag-IBIG Number"  value={details?.pagibig}    icon={Shield} />
              <InfoRow label="TIN"              value={details?.tin}        icon={CreditCard} />
            </SectionCard>

            {details?.bank && (
              <SectionCard title="Bank Account">
                <InfoRow label="Bank"           value={details.bank.name}          icon={Banknote} />
                <InfoRow label="Account Number" value={details.bank.accountNumber} icon={CreditCard} />
                <InfoRow label="Account Name"   value={details.bank.accountName} />
                <InfoRow label="Account Type"   value={details.bank.type} />
              </SectionCard>
            )}

            {!details && (
              <div className="lg:col-span-2 flex flex-col items-center justify-center py-16 text-center">
                <Shield className="w-10 h-10 text-gray-200 dark:text-gray-700 mb-3" />
                <p className="text-sm text-gray-400">No government ID records on file.</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Payroll ── */}
        <TabsContent value="payroll">
          <PayrollTab employeeId={employee.id} />
        </TabsContent>

        {/* ── Attendance ── */}
        <TabsContent value="attendance">
          <AttendanceTab employeeId={employee.id} />
        </TabsContent>

        {/* ── Leaves ── */}
        <TabsContent value="leaves">
          <LeavesTab employeeId={employee.id} />
        </TabsContent>

        {/* ── Documents ── */}
        <TabsContent value="documents">
          <DocumentsTab employeeId={employee.id} employeeName={employee.name} />
        </TabsContent>

        {/* ── Performance ── */}
        <TabsContent value="performance">
          <PerformanceTab employeeId={employee.id} />
        </TabsContent>

        {/* ── 201 File ── */}
        <TabsContent value="file201">
          <File201Tab employeeId={employee.id} employee={employee} details={details} />
        </TabsContent>

        {/* ── Timeline ── */}
        <TabsContent value="timeline">
          <ActivityTimelineTab employeeId={employee.id} />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
