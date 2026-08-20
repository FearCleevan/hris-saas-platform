import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import payrollRunsData from '@/data/mock/payroll-runs.json';
import payrollRecordsData from '@/data/mock/payroll-records.json';
import payrollDisputesData from '@/data/mock/payroll-disputes.json';

async function getAuthOrgId(): Promise<string> {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase not configured');
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const orgId =
    (user.app_metadata?.org_id as string | undefined) ??
    (user.user_metadata?.org_id as string | undefined);
  if (orgId) return orgId;
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single();
  if (!profile?.organization_id) throw new Error('Organization not found');
  return profile.organization_id;
}

// ── Types ──────────────────────────────────────────────────────────────────
// Shaped to match backend/supabase/migrations/20250501000009_payroll.sql
// column-for-column — NOT the old mock JSON's field names. See
// ADMIN_DASHBOARD_AUDIT.md / FRONTEND_IMPLEMENTATION.md Phase F6.

export type PayrollRunStatus = 'draft' | 'review' | 'approved' | 'released';
export type PayslipStatus = 'draft' | 'approved' | 'released' | 'disputed';
export type DisputeStatus = 'open' | 'under_review' | 'resolved' | 'rejected';

export interface PayrollRunRow {
  id: string;
  periodId: string;
  period: string;
  cutoffStart: string;
  cutoffEnd: string;
  payDate: string;
  frequency: string;
  status: PayrollRunStatus;
  totalEmployees: number;
  totalGross: number;
  totalDeductions: number;
  totalNetPay: number;
}

export interface PayslipRow {
  id: string;
  payrollRunId: string;
  employeeId: string;
  basicPay: number;
  overtimePay: number;
  holidayPay: number;
  nightDiffPay: number;
  allowances: number;
  otherEarnings: number;
  grossPay: number;
  sssEe: number;
  philhealthEe: number;
  pagibigEe: number;
  withholdingTax: number;
  loanDeductions: number;
  lateDeductions: number;
  absentDeductions: number;
  otherDeductions: number;
  totalDeductions: number;
  netPay: number;
  daysWorked: number;
  hoursWorked: number;
  status: PayslipStatus;
}

export interface PayrollDisputeRow {
  id: string;
  payslipId: string;
  employeeId: string;
  runId: string | null;
  reason: string;
  status: DisputeStatus;
  resolution: string | null;
  resolvedAt: string | null;
  createdAt: string;
  amountDisputed: number;
}

// UI's 4-stage workflow (draft → review → approved → released) maps onto the
// DB's 5-stage enum ('draft'|'computed'|'reviewed'|'approved'|'released').
// 'computed' is skipped here since nothing in this phase populates payslips
// yet — see FRONTEND_IMPLEMENTATION.md Phase F6's scope note. A future
// payroll-compute phase can introduce a distinct "computed" UI state.
const DB_TO_UI_RUN_STATUS: Record<string, PayrollRunStatus> = {
  draft: 'draft', computed: 'draft', reviewed: 'review', approved: 'approved', released: 'released',
};
const UI_TO_DB_RUN_STATUS: Record<Exclude<PayrollRunStatus, 'draft'>, string> = {
  review: 'reviewed', approved: 'approved', released: 'released',
};

function num(v: unknown): number {
  return v == null ? 0 : Number(v);
}

// ── Payroll Runs ─────────────────────────────────────────────────────────

export async function getPayrollRuns(): Promise<PayrollRunRow[]> {
  if (!isSupabaseConfigured || !supabase) {
    return (payrollRunsData as typeof payrollRunsData).map((r) => ({
      id: r.id,
      periodId: r.id,
      period: r.period,
      cutoffStart: r.cutoffStart,
      cutoffEnd: r.cutoffEnd,
      payDate: r.payDate,
      frequency: r.type,
      status: r.status as PayrollRunStatus,
      totalEmployees: r.employeeCount,
      totalGross: r.totalGross,
      totalDeductions: r.totalDeductions,
      totalNetPay: r.totalNetPay,
    }));
  }

  const orgId = await getAuthOrgId();
  const { data, error } = await supabase
    .from('payroll_runs')
    .select(`
      id, status, total_employees, total_gross_pay, total_deductions, total_net_pay,
      payroll_periods!payroll_period_id ( id, name, period_start, period_end, pay_date, frequency )
    `)
    .eq('organization_id', orgId)
    .order('created_at', { ascending: true });
  if (error) throw error;

  type Row = {
    id: string; status: string; total_employees: number;
    total_gross_pay: string; total_deductions: string; total_net_pay: string;
    payroll_periods: { id: string; name: string; period_start: string; period_end: string; pay_date: string; frequency: string };
  };
  return (data as unknown as Row[]).map((r) => ({
    id: r.id,
    periodId: r.payroll_periods.id,
    period: r.payroll_periods.name,
    cutoffStart: r.payroll_periods.period_start,
    cutoffEnd: r.payroll_periods.period_end,
    payDate: r.payroll_periods.pay_date,
    frequency: r.payroll_periods.frequency,
    status: DB_TO_UI_RUN_STATUS[r.status] ?? 'draft',
    totalEmployees: r.total_employees,
    totalGross: num(r.total_gross_pay),
    totalDeductions: num(r.total_deductions),
    totalNetPay: num(r.total_net_pay),
  }));
}

export async function advancePayrollRunStatus(
  runId: string,
  next: Exclude<PayrollRunStatus, 'draft'>,
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  const { data: { user } } = await supabase.auth.getUser();
  const patch: Record<string, unknown> = { status: UI_TO_DB_RUN_STATUS[next] };
  if (next === 'approved') { patch.approved_at = new Date().toISOString(); patch.approved_by = user?.id ?? null; }
  if (next === 'released') { patch.released_at = new Date().toISOString(); patch.released_by = user?.id ?? null; }
  const { error } = await supabase.from('payroll_runs').update(patch).eq('id', runId);
  if (error) throw error;
}

// ── Payslips ─────────────────────────────────────────────────────────────
// Note: real employee name/department is NOT embedded here — resolved
// client-side against the already-loaded useEmployees() list, matching the
// existing convention used throughout this codebase (e.g. RegisterTab).

export async function getPayslips(runId: string): Promise<PayslipRow[]> {
  if (!isSupabaseConfigured || !supabase) {
    return (payrollRecordsData as typeof payrollRecordsData)
      .filter((r) => r.runId === runId)
      .map((r) => ({
        id: r.id,
        payrollRunId: r.runId,
        employeeId: r.employeeId,
        basicPay: r.basicPay,
        overtimePay: r.overtimePay,
        holidayPay: 0,
        nightDiffPay: 0,
        allowances: r.transportationAllowance + r.mealAllowance,
        otherEarnings: 0,
        grossPay: r.grossPay,
        sssEe: r.sss,
        philhealthEe: r.philhealth,
        pagibigEe: r.pagibig,
        withholdingTax: r.withholdingTax,
        loanDeductions: r.sssLoan + r.pagibigLoan + r.companyLoan,
        lateDeductions: r.tardiness,
        absentDeductions: 0,
        otherDeductions: 0,
        totalDeductions: r.totalDeductions,
        netPay: r.netPay,
        daysWorked: r.daysWorked,
        hoursWorked: r.daysWorked * 8,
        status: 'draft',
      }));
  }

  const orgId = await getAuthOrgId();
  const { data, error } = await supabase
    .from('payslips')
    .select(`
      id, payroll_run_id, employee_id, basic_pay, overtime_pay, holiday_pay, night_diff_pay,
      allowances, other_earnings, gross_pay, sss_ee, philhealth_ee, pagibig_ee, withholding_tax,
      loan_deductions, late_deductions, absent_deductions, other_deductions, total_deductions,
      net_pay, days_worked, hours_worked, status
    `)
    .eq('payroll_run_id', runId)
    .eq('organization_id', orgId);
  if (error) throw error;

  type Row = {
    id: string; payroll_run_id: string; employee_id: string;
    basic_pay: string; overtime_pay: string; holiday_pay: string; night_diff_pay: string;
    allowances: string; other_earnings: string; gross_pay: string;
    sss_ee: string; philhealth_ee: string; pagibig_ee: string; withholding_tax: string;
    loan_deductions: string; late_deductions: string; absent_deductions: string; other_deductions: string;
    total_deductions: string; net_pay: string; days_worked: string; hours_worked: string;
    status: PayslipStatus;
  };
  return (data as unknown as Row[]).map((r) => ({
    id: r.id,
    payrollRunId: r.payroll_run_id,
    employeeId: r.employee_id,
    basicPay: num(r.basic_pay),
    overtimePay: num(r.overtime_pay),
    holidayPay: num(r.holiday_pay),
    nightDiffPay: num(r.night_diff_pay),
    allowances: num(r.allowances),
    otherEarnings: num(r.other_earnings),
    grossPay: num(r.gross_pay),
    sssEe: num(r.sss_ee),
    philhealthEe: num(r.philhealth_ee),
    pagibigEe: num(r.pagibig_ee),
    withholdingTax: num(r.withholding_tax),
    loanDeductions: num(r.loan_deductions),
    lateDeductions: num(r.late_deductions),
    absentDeductions: num(r.absent_deductions),
    otherDeductions: num(r.other_deductions),
    totalDeductions: num(r.total_deductions),
    netPay: num(r.net_pay),
    daysWorked: num(r.days_worked),
    hoursWorked: num(r.hours_worked),
    status: r.status,
  }));
}

// ── 13th Month Pay ───────────────────────────────────────────────────────
// Real table only — no client-side "estimate" projection. If no rows exist
// yet (compute engine isn't built — see F6 scope note), callers should show
// an honest empty state rather than a computed guess.

export interface ThirteenthMonthRow {
  id: string;
  employeeId: string;
  year: number;
  totalBasicPay: number;
  monthsWorked: number;
  amount: number;
  status: 'pending' | 'approved' | 'released';
}

export async function getThirteenthMonthPay(year: number): Promise<ThirteenthMonthRow[]> {
  if (!isSupabaseConfigured || !supabase) return [];

  const orgId = await getAuthOrgId();
  const { data, error } = await supabase
    .from('thirteenth_month_pay')
    .select('id, employee_id, year, total_basic_pay, months_worked, amount, status')
    .eq('organization_id', orgId)
    .eq('year', year);
  if (error) throw error;

  type Row = {
    id: string; employee_id: string; year: number;
    total_basic_pay: string; months_worked: string; amount: string;
    status: 'pending' | 'approved' | 'released';
  };
  return (data as unknown as Row[]).map((r) => ({
    id: r.id,
    employeeId: r.employee_id,
    year: r.year,
    totalBasicPay: num(r.total_basic_pay),
    monthsWorked: num(r.months_worked),
    amount: num(r.amount),
    status: r.status,
  }));
}

// ── Disputes ─────────────────────────────────────────────────────────────

export async function getPayrollDisputes(): Promise<PayrollDisputeRow[]> {
  if (!isSupabaseConfigured || !supabase) {
    return (payrollDisputesData as typeof payrollDisputesData).map((d) => ({
      id: d.id,
      payslipId: d.id,
      employeeId: d.employeeId,
      runId: d.runId,
      reason: d.description,
      status: d.status === 'review' ? 'under_review' : (d.status as DisputeStatus),
      resolution: d.resolution,
      resolvedAt: d.resolvedDate,
      createdAt: d.filedDate,
      amountDisputed: d.amountDisputed,
    }));
  }

  const orgId = await getAuthOrgId();
  const { data, error } = await supabase
    .from('payroll_disputes')
    .select(`
      id, payslip_id, employee_id, reason, status, resolution, resolved_at, created_at,
      payslips!payslip_id ( payroll_run_id, gross_pay )
    `)
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });
  if (error) throw error;

  type Row = {
    id: string; payslip_id: string; employee_id: string; reason: string;
    status: DisputeStatus; resolution: string | null; resolved_at: string | null; created_at: string;
    payslips: { payroll_run_id: string; gross_pay: string } | null;
  };
  return (data as unknown as Row[]).map((d) => ({
    id: d.id,
    payslipId: d.payslip_id,
    employeeId: d.employee_id,
    runId: d.payslips?.payroll_run_id ?? null,
    reason: d.reason,
    status: d.status,
    resolution: d.resolution,
    resolvedAt: d.resolved_at,
    createdAt: d.created_at,
    // The real payroll_disputes table has no "amount disputed" column — that
    // was a mock-only field. Left at 0 for real disputes; the reason text
    // carries the detail instead. See Phase F6 report.
    amountDisputed: 0,
  }));
}

export async function reviewPayrollDispute(id: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  const { error } = await supabase
    .from('payroll_disputes')
    .update({ status: 'under_review' })
    .eq('id', id);
  if (error) throw error;
}

export async function resolvePayrollDispute(id: string, resolution: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase
    .from('payroll_disputes')
    .update({
      status: 'resolved',
      resolution,
      resolved_by: user?.id ?? null,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) throw error;
}

export async function rejectPayrollDispute(id: string, resolution: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase
    .from('payroll_disputes')
    .update({
      status: 'rejected',
      resolution,
      resolved_by: user?.id ?? null,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) throw error;
}
