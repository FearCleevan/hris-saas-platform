import { supabase } from '@/lib/supabase';

export async function listLeaveTypes(organizationId: string) {
  if (!supabase) throw new Error('Supabase is not configured for this environment.');
  const { data, error } = await supabase
    .from('leave_types')
    .select('id, name, code, description, is_paid, is_mandatory, requires_document, max_days_per_year, carry_over_days, is_active')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .order('name');
  if (error) throw error;
  return data ?? [];
}

export async function getLeaveBalances(employeeId: string, year: number) {
  if (!supabase) throw new Error('Supabase is not configured for this environment.');
  const { data, error } = await supabase
    .from('leave_balances')
    .select('id, leave_type_id, year, entitled_days, used_days, pending_days, carried_over')
    .eq('employee_id', employeeId)
    .eq('year', year);
  if (error) throw error;
  // `remaining` computed client-side rather than trusting the stored
  // `balance` column's exact formula, which isn't documented anywhere —
  // explicit is safer than assuming it matches this definition.
  return (data ?? []).map((b) => ({
    ...b,
    remaining: b.entitled_days - b.used_days - b.pending_days + b.carried_over,
  }));
}

export interface LeaveRequestListItem {
  id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  approved_at: string | null;
  remarks: string | null;
  created_at: string;
}

export async function listLeaveRequests(employeeId: string) {
  if (!supabase) throw new Error('Supabase is not configured for this environment.');
  const { data, error } = await supabase
    .from('leave_requests')
    .select('id, leave_type_id, start_date, end_date, total_days, reason, status, approved_at, remarks, created_at')
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as LeaveRequestListItem[];
}

export interface LeaveRequestInput {
  leave_type_id: string;
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string;
}

// Mirrors hris-admin-dashboard's applyLeave() and the hris-mcp apply_leave
// tool exactly: insert the request, bump pending_days on the matching
// balance row (creating one if it doesn't exist yet), and roll back the
// insert if the balance step fails — never leave an orphaned "ghost"
// pending request with no corresponding balance change.
export async function submitLeaveRequest(
  employeeId: string,
  organizationId: string,
  input: LeaveRequestInput,
) {
  if (!supabase) throw new Error('Supabase is not configured for this environment.');
  const year = new Date(input.start_date).getFullYear();

  const { data: inserted, error: insertError } = await supabase
    .from('leave_requests')
    .insert({ employee_id: employeeId, organization_id: organizationId, status: 'pending', ...input })
    .select('id')
    .single();
  if (insertError) throw insertError;

  const { data: existing, error: fetchError } = await supabase
    .from('leave_balances')
    .select('id, pending_days')
    .eq('employee_id', employeeId)
    .eq('leave_type_id', input.leave_type_id)
    .eq('year', year)
    .maybeSingle();

  let balanceError = fetchError;
  if (!balanceError) {
    if (existing) {
      const { error } = await supabase
        .from('leave_balances')
        .update({ pending_days: Number(existing.pending_days) + input.total_days })
        .eq('id', existing.id);
      balanceError = error;
    } else {
      const { error } = await supabase
        .from('leave_balances')
        .insert({
          employee_id: employeeId,
          organization_id: organizationId,
          leave_type_id: input.leave_type_id,
          year,
          entitled_days: 0,
          used_days: 0,
          carried_over: 0,
          pending_days: input.total_days,
        });
      balanceError = error;
    }
  }

  if (balanceError) {
    await supabase.from('leave_requests').delete().eq('id', inserted.id);
    throw balanceError;
  }

  return { id: inserted.id, ...input, status: 'pending' as const };
}

// self_update_leave_request only allows this while status = 'pending' — a
// cancel attempt on an already-approved/rejected request fails at the RLS
// layer (0 rows affected), so callers must check the row's current status
// before showing a Cancel button, not just handle the error after the fact.
export async function cancelLeaveRequest(requestId: string) {
  if (!supabase) throw new Error('Supabase is not configured for this environment.');
  const { data, error } = await supabase
    .from('leave_requests')
    .update({ status: 'cancelled' })
    .eq('id', requestId)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('This request can no longer be cancelled — it may have already been decided.');
  return data;
}
