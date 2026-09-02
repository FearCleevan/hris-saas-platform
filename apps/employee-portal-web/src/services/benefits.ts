import { supabase } from '@/lib/supabase';

// No claims/utilization/accredited-hospitals tables exist anywhere in the
// schema — that's a real, separate feature that was never built on the
// backend (see BACKEND_IMPLEMENTATION.md Phase 4 notes). Only real plan
// enrollment + dependents are wired here.
export async function getMyHmoEnrollment(employeeId: string) {
  if (!supabase) throw new Error('Supabase is not configured for this environment.');
  const { data, error } = await supabase
    .from('employee_benefits')
    .select(`
      id, effective_date, end_date, status,
      hmo_plans ( plan_name, provider, mbl, room_board, coverage_type, dependents_allowed )
    `)
    .eq('employee_id', employeeId)
    .eq('status', 'active')
    .not('hmo_plan_id', 'is', null)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getHmoDependents(employeeId: string) {
  if (!supabase) throw new Error('Supabase is not configured for this environment.');
  const { data, error } = await supabase
    .from('hmo_dependents')
    .select('id, first_name, last_name, relationship, date_of_birth, is_active')
    .eq('employee_id', employeeId)
    .eq('is_active', true);
  if (error) throw error;
  return data ?? [];
}

export async function listOtherBenefits(employeeId: string) {
  if (!supabase) throw new Error('Supabase is not configured for this environment.');
  const { data, error } = await supabase
    .from('employee_benefits')
    .select(`
      id, effective_date, end_date, status,
      benefits ( name, type, description, provider, coverage_amount )
    `)
    .eq('employee_id', employeeId)
    .eq('status', 'active')
    .is('hmo_plan_id', null);
  if (error) throw error;
  return data ?? [];
}

const LOAN_SELECT =
  'id, loan_type, principal, interest_rate, term_months, monthly_amort, outstanding_balance, loan_date, first_deduction_date, status';

export async function listLoans(employeeId: string) {
  if (!supabase) throw new Error('Supabase is not configured for this environment.');
  const { data, error } = await supabase
    .from('loans')
    .select(LOAN_SELECT)
    .eq('employee_id', employeeId)
    .order('loan_date', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listLoanApplications(employeeId: string) {
  if (!supabase) throw new Error('Supabase is not configured for this environment.');
  const { data, error } = await supabase
    .from('loan_applications')
    .select('id, loan_type, amount_requested, term_months, purpose, status, created_at')
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export interface LoanApplicationInput {
  loan_type: string;
  amount_requested: number;
  term_months: number;
  purpose: string;
}

export async function submitLoanApplication(
  employeeId: string,
  organizationId: string,
  input: LoanApplicationInput,
) {
  if (!supabase) throw new Error('Supabase is not configured for this environment.');
  const { data, error } = await supabase
    .from('loan_applications')
    .insert({ employee_id: employeeId, organization_id: organizationId, status: 'pending', ...input })
    .select('id, loan_type, amount_requested, status')
    .single();
  if (error) throw error;
  return data;
}
