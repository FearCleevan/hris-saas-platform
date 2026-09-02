import { supabase } from '@/lib/supabase';

const PAYSLIP_SELECT = `
  id, basic_pay, overtime_pay, holiday_pay, night_diff_pay, allowances, other_earnings,
  gross_pay, sss_ee, philhealth_ee, pagibig_ee, withholding_tax,
  loan_deductions, late_deductions, absent_deductions, other_deductions,
  total_deductions, net_pay, days_worked, hours_worked, status, pdf_url,
  payroll_periods!payroll_period_id ( name, period_start, period_end, pay_date, frequency )
`;

export async function listPayslips(employeeId: string) {
  if (!supabase) throw new Error('Supabase is not configured for this environment.');
  const { data, error } = await supabase
    .from('payslips')
    .select(PAYSLIP_SELECT)
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getPayrollItems(payslipId: string) {
  if (!supabase) throw new Error('Supabase is not configured for this environment.');
  const { data, error } = await supabase
    .from('payroll_items')
    .select('type, category, description, amount, is_taxable')
    .eq('payslip_id', payslipId);
  if (error) throw error;
  return data ?? [];
}

export interface GovContributionRow {
  period_year: number;
  period_month: number;
  ee_contribution: number;
  er_contribution: number;
}

export async function getSssHistory(employeeId: string) {
  if (!supabase) throw new Error('Supabase is not configured for this environment.');
  const { data, error } = await supabase
    .from('sss_records')
    .select('period_year, period_month, ee_contribution, er_contribution, total_contribution, sss_no')
    .eq('employee_id', employeeId)
    .order('period_year', { ascending: false })
    .order('period_month', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getPhilhealthHistory(employeeId: string) {
  if (!supabase) throw new Error('Supabase is not configured for this environment.');
  const { data, error } = await supabase
    .from('philhealth_records')
    .select('period_year, period_month, ee_contribution, er_contribution, philhealth_no')
    .eq('employee_id', employeeId)
    .order('period_year', { ascending: false })
    .order('period_month', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getPagibigHistory(employeeId: string) {
  if (!supabase) throw new Error('Supabase is not configured for this environment.');
  const { data, error } = await supabase
    .from('pagibig_records')
    .select('period_year, period_month, ee_contribution, er_contribution, pagibig_no')
    .eq('employee_id', employeeId)
    .order('period_year', { ascending: false })
    .order('period_month', { ascending: false });
  if (error) throw error;
  return data ?? [];
}
