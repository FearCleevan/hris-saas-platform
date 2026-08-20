import { supabase, isSupabaseConfigured } from '@/lib/supabase';

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

// ── Types ──────────────────────────────────────────────────────────────────────

export type LeaveApproval = {
  level: number;
  approverId: string;
  approverName: string | null;
  status: string;
  timestamp: string;
  remarks: string;
};

export type LeaveRequestRow = {
  id: string;
  employeeId: string;
  employeeName: string;
  position: string;
  department: string;
  avatarUrl: string | null;
  leaveTypeId: string;
  leaveTypeCode: string;
  leaveTypeName: string;
  startDate: string;
  endDate: string;
  days: number;
  isHalfDay: boolean;
  reason: string;
  status: string;
  approvals: LeaveApproval[];
  approvedByName: string | null;
  approvedAt: string | null;
  submittedAt: string;
  documents: string[];
  notes: string;
};

export type LeaveBalanceEntry = {
  entitled: number;
  carryOver: number;
  used: number;
  pending: number;
  remaining: number;
};

export type LeaveBalanceRow = {
  employeeId: string;
  employeeName: string;
  position: string;
  department: string;
  year: number;
  vl: LeaveBalanceEntry;
  sl: LeaveBalanceEntry;
  sil: LeaveBalanceEntry;
};

export type LeaveTypeRow = {
  id: string;
  code: string;
  name: string;
  daysPerYear: number;
  isPaid: boolean;
  isMonetizable: boolean;
  requiresDocuments: boolean;
  documentNote: string;
  maxCarryOver: number;
  color: string;
  description: string;
};

// ── Internal Supabase shapes ───────────────────────────────────────────────────

type SupabaseLeaveRequest = {
  id: string;
  employee_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string;
  status: string;
  document_url: string | null;
  remarks: string | null;
  approved_at: string | null;
  created_at: string;
  leave_types: { code: string; name: string } | null;
  employees: { first_name: string; last_name: string; position: string | null; department: string | null; avatar_url: string | null } | null;
};

type SupabaseLeaveBalance = {
  employee_id: string;
  year: number;
  entitled_days: number;
  used_days: number;
  pending_days: number;
  carried_over: number;
  balance: number;
  leave_types: { code: string } | null;
  employees: { first_name: string; last_name: string; position: string | null; department: string | null } | null;
};

type SupabaseLeaveType = {
  id: string;
  code: string;
  name: string;
  max_days_per_year: number | null;
  is_paid: boolean;
  requires_document: boolean;
  carry_over_days: number;
  description: string | null;
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function emptyBalance(): LeaveBalanceEntry {
  return { entitled: 0, carryOver: 0, used: 0, pending: 0, remaining: 0 };
}

const LEAVE_COLOR_MAP: Record<string, string> = {
  VL: '#0038a8', SL: '#f59e0b', SIL: '#10b981',
  ML: '#ec4899', PL: '#6366f1', SPL: '#8b5cf6',
  BL: '#64748b', EL: '#ce1126',
};

// ── Leave Requests ─────────────────────────────────────────────────────────────

export async function getLeaveRequests(): Promise<LeaveRequestRow[]> {
  const orgId = await getAuthOrgId();

  const { data, error } = await supabase!
    .from('leave_requests')
    .select(`
      id, employee_id, leave_type_id, start_date, end_date, total_days,
      reason, status, document_url, remarks, approved_at, created_at,
      leave_types(code, name),
      employees(first_name, last_name, position, department, avatar_url)
    `)
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data as unknown as SupabaseLeaveRequest[]).map((r) => {
    const emp  = r.employees;
    const name = emp
      ? [emp.first_name, emp.last_name].filter(Boolean).join(' ') || r.employee_id
      : r.employee_id;

    return {
      id:            r.id,
      employeeId:    r.employee_id,
      employeeName:  name,
      position:      emp?.position   ?? '',
      department:    emp?.department ?? '',
      avatarUrl:     emp?.avatar_url ?? null,
      leaveTypeId:   r.leave_type_id,
      leaveTypeCode: r.leave_types?.code ?? '',
      leaveTypeName: r.leave_types?.name ?? '',
      startDate:     r.start_date,
      endDate:       r.end_date,
      days:          Number(r.total_days),
      isHalfDay:     false,
      reason:        r.reason,
      status:        r.status,
      approvals:     [],
      approvedByName: null,
      approvedAt:    r.approved_at ?? null,
      submittedAt:   r.created_at,
      documents:     r.document_url ? [r.document_url] : [],
      notes:         r.remarks ?? '',
    };
  });
}

// Uses approve_leave_request/reject_leave_request RPCs (not a direct .update())
// so the approval atomically updates leave_balances (used_days/pending_days),
// leave_approvals, and leave_credits_history too — see
// backend/supabase/migrations/20260820000022_leave_approval_rpcs.sql.
// Approving/rejecting an already-actioned request now raises, instead of
// silently overwriting a prior decision.
export async function approveLeaveRequest(id: string, remarks?: string): Promise<void> {
  const { error } = await supabase!.rpc('approve_leave_request', {
    p_request_id: id,
    p_remarks:    remarks ?? null,
  });
  if (error) throw error;
}

export async function rejectLeaveRequest(id: string, remarks?: string): Promise<void> {
  const { error } = await supabase!.rpc('reject_leave_request', {
    p_request_id: id,
    p_remarks:    remarks ?? null,
  });
  if (error) throw error;
}

// ── Leave Balances ─────────────────────────────────────────────────────────────

export async function getLeaveBalances(): Promise<LeaveBalanceRow[]> {
  const orgId = await getAuthOrgId();
  const currentYear = new Date().getFullYear();

  const { data, error } = await supabase!
    .from('leave_balances')
    .select(`
      employee_id, year, entitled_days, used_days, pending_days, carried_over, balance,
      leave_types(code),
      employees(first_name, last_name, position, department)
    `)
    .eq('organization_id', orgId)
    .eq('year', currentYear)
    .order('employee_id');

  if (error) throw error;

  const map: Record<string, LeaveBalanceRow> = {};

  for (const b of (data as unknown) as SupabaseLeaveBalance[]) {
    if (!map[b.employee_id]) {
      const emp  = b.employees;
      const name = emp
        ? [emp.first_name, emp.last_name].filter(Boolean).join(' ') || b.employee_id
        : b.employee_id;
      map[b.employee_id] = {
        employeeId:   b.employee_id,
        employeeName: name,
        position:     emp?.position  ?? '',
        department:   emp?.department ?? '',
        year:         b.year,
        vl:           emptyBalance(),
        sl:           emptyBalance(),
        sil:          emptyBalance(),
      };
    }

    const code = b.leave_types?.code?.toUpperCase();
    const entry: LeaveBalanceEntry = {
      entitled:  Number(b.entitled_days),
      carryOver: Number(b.carried_over),
      used:      Number(b.used_days),
      pending:   Number(b.pending_days),
      remaining: Number(b.balance),
    };

    if (code === 'VL')  map[b.employee_id].vl  = entry;
    else if (code === 'SL')  map[b.employee_id].sl  = entry;
    else if (code === 'SIL') map[b.employee_id].sil = entry;
  }

  return Object.values(map);
}

// ── Leave Types ────────────────────────────────────────────────────────────────

export async function getLeaveTypes(): Promise<LeaveTypeRow[]> {
  const orgId = await getAuthOrgId();

  const { data, error } = await supabase!
    .from('leave_types')
    .select('id, code, name, max_days_per_year, is_paid, requires_document, carry_over_days, description')
    .eq('organization_id', orgId)
    .eq('is_active', true)
    .order('code');

  if (error) throw error;

  return (data as SupabaseLeaveType[]).map((t) => ({
    id:                t.id,
    code:              t.code,
    name:              t.name,
    daysPerYear:       Number(t.max_days_per_year ?? 0),
    isPaid:            t.is_paid,
    isMonetizable:     ['VL', 'SL', 'SIL'].includes(t.code),
    requiresDocuments: t.requires_document,
    documentNote:      t.requires_document
      ? 'Supporting documents are required for this leave type.'
      : '',
    maxCarryOver:  Number(t.carry_over_days),
    color:         LEAVE_COLOR_MAP[t.code] ?? '#9ca3af',
    description:   t.description ?? '',
  }));
}