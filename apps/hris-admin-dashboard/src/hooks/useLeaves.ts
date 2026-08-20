import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { isSupabaseConfigured } from '@/lib/supabase';
import {
  getLeaveRequests,
  getLeaveBalances,
  getLeaveTypes,
  approveLeaveRequest,
  rejectLeaveRequest,
  type LeaveRequestRow,
  type LeaveBalanceRow,
  type LeaveTypeRow,
} from '@/services/leaves';
import leaveRequestsRaw from '@/data/mock/leave-requests.json';
import leaveBalancesRaw from '@/data/mock/leave-balances.json';
import leaveTypesRaw from '@/data/mock/leave-types.json';
import employeesRaw from '@/data/mock/employees.json';

// ── Mock adapters ─────────────────────────────────────────────────────────────

function mockRequests(): LeaveRequestRow[] {
  return (leaveRequestsRaw as any[]).map((r) => {
    const emp = (employeesRaw as any[]).find((e) => e.id === r.employeeId);
    const approvals    = r.approvals ?? [];
    const lastApproval = approvals[approvals.length - 1];
    const approver = lastApproval
      ? (employeesRaw as any[]).find((e) => e.id === lastApproval.approverId)
      : null;
    return {
      id:             r.id,
      employeeId:     r.employeeId,
      employeeName:   emp?.name ?? r.employeeId,
      position:       emp?.position ?? '',
      department:     emp?.department ?? '',
      avatarUrl:      emp?.avatar ?? null,
      leaveTypeId:    r.leaveTypeId,
      leaveTypeCode:  r.leaveTypeCode,
      leaveTypeName:  r.leaveTypeName,
      startDate:      r.startDate,
      endDate:        r.endDate,
      days:           r.days,
      isHalfDay:      r.isHalfDay ?? false,
      reason:         r.reason,
      status:         r.status,
      approvals:      r.approvals ?? [],
      approvedByName: approver?.name ?? null,
      approvedAt:     lastApproval?.timestamp ?? null,
      submittedAt:    r.submittedAt,
      documents:      r.documents ?? [],
      notes:          r.notes ?? '',
    } satisfies LeaveRequestRow;
  });
}

function mockBalances(): LeaveBalanceRow[] {
  return (leaveBalancesRaw as any[]).map((b) => {
    const emp = (employeesRaw as any[]).find((e) => e.id === b.employeeId);
    return {
      employeeId:   b.employeeId,
      employeeName: emp?.name ?? b.employeeId,
      position:     emp?.position ?? '',
      department:   emp?.department ?? '',
      year:         b.year,
      vl:           b.vl,
      sl:           b.sl,
      sil:          b.sil,
    } satisfies LeaveBalanceRow;
  });
}

function mockTypes(): LeaveTypeRow[] {
  return leaveTypesRaw as LeaveTypeRow[];
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useLeaveRequests() {
  return useQuery<LeaveRequestRow[]>({
    queryKey:  ['leave-requests'],
    queryFn:   isSupabaseConfigured ? getLeaveRequests : async () => mockRequests(),
    staleTime: 1000 * 60 * 2,
  });
}

export function useLeaveBalances() {
  return useQuery<LeaveBalanceRow[]>({
    queryKey:  ['leave-balances'],
    queryFn:   isSupabaseConfigured ? getLeaveBalances : async () => mockBalances(),
    staleTime: 1000 * 60 * 5,
  });
}

export function useLeaveTypes() {
  return useQuery<LeaveTypeRow[]>({
    queryKey:  ['leave-types'],
    queryFn:   isSupabaseConfigured ? getLeaveTypes : async () => mockTypes(),
    staleTime: 1000 * 60 * 10,
  });
}

export function useApproveLeaveRequest() {
  const qc = useQueryClient();
  return useMutation<void, Error, { id: string; remarks?: string }>({
    mutationFn: ({ id, remarks }) =>
      isSupabaseConfigured
        ? approveLeaveRequest(id, remarks)
        : Promise.resolve(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leave-requests'] });
      qc.invalidateQueries({ queryKey: ['leave-balances'] });
    },
  });
}

export function useRejectLeaveRequest() {
  const qc = useQueryClient();
  return useMutation<void, Error, { id: string; remarks?: string }>({
    mutationFn: ({ id, remarks }) =>
      isSupabaseConfigured
        ? rejectLeaveRequest(id, remarks)
        : Promise.resolve(),
    // Reject doesn't touch balances on the backend, but invalidating both
    // keeps approve/reject symmetric and costs nothing (no-op refetch).
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leave-requests'] });
      qc.invalidateQueries({ queryKey: ['leave-balances'] });
    },
  });
}

// Re-export types for convenience
export type { LeaveRequestRow, LeaveBalanceRow, LeaveTypeRow } from '@/services/leaves';