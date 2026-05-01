import { supabase, isSupabaseConfigured } from '@/lib/supabase';

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
  leaveTypeId: string;
  leaveTypeCode: string;
  leaveTypeName: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: string;
  approvals: LeaveApproval[];
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
  created_at: string;
  leave_types: { code: string; name: string } | null;
  leave_approvals: {
    level: number;
    approver_id: string;
    status: string;
    acted_at: string | null;
    remarks: string | null;
  }[];
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

function emptyBalance(): LeaveBalanceEntry {
  return { entitled: 0, carryOver: 0, used: 0, pending: 0, remaining: 0 };
}

const LEAVE_COLOR_MAP: Record<string, string> = {
  VL: '#0038a8', SL: '#f59e0b', SIL: '#10b981',
  ML: '#ec4899', PL: '#6366f1', SPL: '#8b5cf6',
  BL: '#64748b', EL: '#ce1126',
};

export async function getLeaveRequests(): Promise<LeaveRequestRow[]> {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase not configured');

  const { data, error } = await supabase
    .from('leave_requests')
    .select(`
      id, employee_id, leave_type_id, start_date, end_date, total_days,
      reason, status, document_url, remarks, created_at,
      leave_types(code, name),
      leave_approvals(level, approver_id, status, acted_at, remarks)
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data as SupabaseLeaveRequest[]).map((r) => ({
    id: r.id,
    employeeId: r.employee_id,
    leaveTypeId: r.leave_type_id,
    leaveTypeCode: r.leave_types?.code ?? '',
    leaveTypeName: r.leave_types?.name ?? '',
    startDate: r.start_date,
    endDate: r.end_date,
    days: Number(r.total_days),
    reason: r.reason,
    status: r.status,
    approvals: (r.leave_approvals ?? []).map((a) => ({
      level: a.level,
      approverId: a.approver_id,
      approverName: null,
      status: a.status,
      timestamp: a.acted_at ?? '',
      remarks: a.remarks ?? '',
    })),
    submittedAt: r.created_at,
    documents: r.document_url ? [r.document_url] : [],
    notes: r.remarks ?? '',
  }));
}

export async function getLeaveBalances(): Promise<LeaveBalanceRow[]> {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase not configured');

  const currentYear = new Date().getFullYear();

  const { data, error } = await supabase
    .from('leave_balances')
    .select(`
      employee_id, year, entitled_days, used_days, pending_days, carried_over, balance,
      leave_types(code)
    `)
    .eq('year', currentYear)
    .order('employee_id');

  if (error) throw error;

  const map: Record<string, LeaveBalanceRow> = {};
  for (const b of data as SupabaseLeaveBalance[]) {
    if (!map[b.employee_id]) {
      map[b.employee_id] = {
        employeeId: b.employee_id,
        year: b.year,
        vl: emptyBalance(),
        sl: emptyBalance(),
        sil: emptyBalance(),
      };
    }
    const code = b.leave_types?.code?.toUpperCase();
    const entry: LeaveBalanceEntry = {
      entitled: Number(b.entitled_days),
      carryOver: Number(b.carried_over),
      used: Number(b.used_days),
      pending: Number(b.pending_days),
      remaining: Number(b.balance),
    };
    if (code === 'VL') map[b.employee_id].vl = entry;
    else if (code === 'SL') map[b.employee_id].sl = entry;
    else if (code === 'SIL') map[b.employee_id].sil = entry;
  }

  return Object.values(map);
}

export async function getLeaveTypes(): Promise<LeaveTypeRow[]> {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase not configured');

  const { data, error } = await supabase
    .from('leave_types')
    .select('id, code, name, max_days_per_year, is_paid, requires_document, carry_over_days, description')
    .eq('is_active', true)
    .order('code');

  if (error) throw error;

  return (data as SupabaseLeaveType[]).map((t) => ({
    id: t.id,
    code: t.code,
    name: t.name,
    daysPerYear: Number(t.max_days_per_year ?? 0),
    isPaid: t.is_paid,
    isMonetizable: ['VL', 'SL', 'SIL'].includes(t.code),
    requiresDocuments: t.requires_document,
    documentNote: t.requires_document ? 'Documents may be required for this leave type.' : '',
    maxCarryOver: Number(t.carry_over_days),
    color: LEAVE_COLOR_MAP[t.code] ?? '#9ca3af',
    description: t.description ?? '',
  }));
}
