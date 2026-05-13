import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { isSupabaseConfigured } from '@/lib/supabase';
import {
  getOffboardingRecords,
  getOffboardingDetail,
  updateClearanceItem,
  upsertExitInterview,
  updateFinalPayStatus,
  initiateOffboarding,
  type OffboardingRecord,
  type OffboardingDetail,
  type UpdateClearanceInput,
  type UpdateExitInterviewInput,
  type InitiateOffboardingInput,
} from '@/services/offboarding';
import mockData from '@/data/mock/offboarding.json';
import mockEmployees from '@/data/mock/employees.json';

// ── Mock adapters ─────────────────────────────────────────────────────────────

function mockToRecords(): OffboardingRecord[] {
  return mockData.map((rec) => {
    const emp = mockEmployees.find((e) => e.id === rec.employeeId);
    const done  = rec.clearance.filter((c) => c.cleared).length;
    const total = rec.clearance.length;
    return {
      id:                        rec.id,
      employeeId:                rec.employeeId,
      employeeName:              emp?.name ?? rec.employeeId,
      employeeNo:                rec.employeeId,
      avatarUrl:                 (emp as any)?.avatar ?? null,
      position:                  emp?.position ?? rec.position,
      department:                emp?.department ?? rec.department,
      separationType:            rec.reason,
      lastDayOfWork:             rec.lastDay,
      resignationDate:           rec.resignationDate,
      overallStatus:             rec.status as 'in_progress' | 'completed',
      exitInterviewStatus:       rec.exitInterviewStatus as 'pending' | 'scheduled' | 'done',
      exitInterviewDate:         rec.exitInterviewDate ?? null,
      finalPayStatus:            rec.finalPayStatus as any,
      finalPayAmount:            rec.finalPay.netFinalPay,
      clearanceDone:             done,
      clearanceTotal:            total,
      clearancePct:              total > 0 ? Math.round((done / total) * 100) : 0,
      notes:                     rec.notes ?? null,
      assignedHRId:              rec.assignedHR ?? null,
      resignationLetterUploaded: rec.resignationLetterUploaded,
      createdAt:                 rec.resignationDate,
    };
  });
}

function mockToDetail(id: string): OffboardingDetail | null {
  const rec = mockData.find((r) => r.id === id);
  if (!rec) return null;
  const emp   = mockEmployees.find((e) => e.id === rec.employeeId);
  const done  = rec.clearance.filter((c) => c.cleared).length;
  const total = rec.clearance.length;

  const base: OffboardingRecord = {
    id:                        rec.id,
    employeeId:                rec.employeeId,
    employeeName:              emp?.name ?? rec.employeeId,
    employeeNo:                rec.employeeId,
    avatarUrl:                 (emp as any)?.avatar ?? null,
    position:                  emp?.position ?? rec.position,
    department:                emp?.department ?? rec.department,
    separationType:            rec.reason,
    lastDayOfWork:             rec.lastDay,
    resignationDate:           rec.resignationDate,
    overallStatus:             rec.status as 'in_progress' | 'completed',
    exitInterviewStatus:       rec.exitInterviewStatus as 'pending' | 'scheduled' | 'done',
    exitInterviewDate:         rec.exitInterviewDate ?? null,
    finalPayStatus:            rec.finalPayStatus as any,
    finalPayAmount:            rec.finalPay.netFinalPay,
    clearanceDone:             done,
    clearanceTotal:            total,
    clearancePct:              total > 0 ? Math.round((done / total) * 100) : 0,
    notes:                     rec.notes ?? null,
    assignedHRId:              rec.assignedHR ?? null,
    resignationLetterUploaded: rec.resignationLetterUploaded,
    createdAt:                 rec.resignationDate,
  };

  return {
    ...base,
    clearanceItems: rec.clearance.map((c, idx) => ({
      id:            `mock-cp-${rec.id}-${idx}`,
      itemId:        `mock-ci-${rec.id}-${idx}`,
      department:    c.department,
      title:         `${c.department} Clearance`,
      status:        c.cleared ? 'cleared' : 'pending',
      clearedAt:     c.clearedDate ?? null,
      clearedByName: c.clearedBy
        ? (mockEmployees.find((e) => e.id === c.clearedBy)?.name ?? c.clearedBy)
        : null,
      remarks:       c.notes,
      isRequired:    true,
    })),
    exitInterview: {
      id:                null,
      status:            rec.exitInterviewStatus as 'pending' | 'scheduled' | 'done',
      scheduledAt:       rec.exitInterviewDate ?? null,
      conductedAt:       rec.exitInterviewStatus === 'done' ? rec.exitInterviewDate ?? null : null,
      primaryReason:     null,
      wouldRecommend:    null,
      satisfactionScore: null,
      feedback:          null,
    },
    finalPay: rec.finalPay,
  };
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useOffboardingRecords() {
  return useQuery<OffboardingRecord[]>({
    queryKey: ['offboarding-records'],
    queryFn:  isSupabaseConfigured ? getOffboardingRecords : async () => mockToRecords(),
    staleTime: 1000 * 60 * 5,
  });
}

export function useOffboardingDetail(id: string | undefined) {
  return useQuery<OffboardingDetail | null>({
    queryKey: ['offboarding-detail', id],
    queryFn: () => {
      if (!id) return null;
      if (isSupabaseConfigured) return getOffboardingDetail(id);
      return mockToDetail(id);
    },
    enabled:   !!id,
    staleTime: 1000 * 60 * 5,
  });
}

export function useUpdateClearance() {
  const qc = useQueryClient();
  return useMutation<void, Error, UpdateClearanceInput & { offboardingId: string }>({
    mutationFn: ({ clearanceProgressId, status, remarks }) =>
      updateClearanceItem({ clearanceProgressId, status, remarks }),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['offboarding-records'] });
      qc.invalidateQueries({ queryKey: ['offboarding-detail', vars.offboardingId] });
    },
  });
}

export function useUpsertExitInterview() {
  const qc = useQueryClient();
  return useMutation<void, Error, UpdateExitInterviewInput>({
    mutationFn: upsertExitInterview,
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['offboarding-records'] });
      qc.invalidateQueries({ queryKey: ['offboarding-detail', vars.offboardingId] });
    },
  });
}

export function useUpdateFinalPay() {
  const qc = useQueryClient();
  return useMutation<
    void,
    Error,
    { offboardingId: string; status: 'computed' | 'approved' | 'released'; amount?: number }
  >({
    mutationFn: ({ offboardingId, status, amount }) =>
      updateFinalPayStatus(offboardingId, status, amount),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['offboarding-records'] });
      qc.invalidateQueries({ queryKey: ['offboarding-detail', vars.offboardingId] });
    },
  });
}

export function useInitiateOffboarding() {
  const qc = useQueryClient();
  return useMutation<
    void,
    Error,
    { employeeIds: string[]; separationType: InitiateOffboardingInput['separationType']; lastDayOfWork: string; notes?: string }
  >({
    mutationFn: async ({ employeeIds, separationType, lastDayOfWork, notes }) => {
      for (const employeeId of employeeIds) {
        await initiateOffboarding({ employeeId, separationType, lastDayOfWork, notes });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['offboarding-records'] });
    },
  });
}

// Re-export types for convenience
export type {
  OffboardingRecord,
  OffboardingDetail,
  ClearanceItem,
  ExitInterview,
  FinalPayBreakdown,
} from '@/services/offboarding';
