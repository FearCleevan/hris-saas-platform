import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { isSupabaseConfigured } from '@/lib/supabase';
import {
  getPayrollRuns,
  advancePayrollRunStatus,
  getPayslips,
  getThirteenthMonthPay,
  getPayrollDisputes,
  reviewPayrollDispute,
  resolvePayrollDispute,
  rejectPayrollDispute,
  type PayrollRunRow,
  type PayslipRow,
  type ThirteenthMonthRow,
  type PayrollDisputeRow,
  type PayrollRunStatus,
} from '@/services/payroll';

const STALE_TIME = 1000 * 60 * 5;

export function usePayrollRuns() {
  return useQuery<PayrollRunRow[]>({
    queryKey: ['payroll-runs'],
    queryFn: getPayrollRuns,
    staleTime: STALE_TIME,
  });
}

export function useAdvancePayrollRun() {
  const qc = useQueryClient();
  return useMutation<void, Error, { id: string; next: Exclude<PayrollRunStatus, 'draft'> }>({
    mutationFn: ({ id, next }) =>
      isSupabaseConfigured ? advancePayrollRunStatus(id, next) : Promise.resolve(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payroll-runs'] }),
  });
}

export function usePayslips(runId: string | null) {
  return useQuery<PayslipRow[]>({
    queryKey: ['payslips', runId],
    queryFn: () => getPayslips(runId as string),
    enabled: !!runId,
    staleTime: STALE_TIME,
  });
}

export function useThirteenthMonthPay(year: number) {
  return useQuery<ThirteenthMonthRow[]>({
    queryKey: ['thirteenth-month-pay', year],
    queryFn: () => getThirteenthMonthPay(year),
    staleTime: STALE_TIME,
  });
}

export function usePayrollDisputes() {
  return useQuery<PayrollDisputeRow[]>({
    queryKey: ['payroll-disputes'],
    queryFn: getPayrollDisputes,
    staleTime: STALE_TIME,
  });
}

export function useReviewPayrollDispute() {
  const qc = useQueryClient();
  return useMutation<void, Error, { id: string }>({
    mutationFn: ({ id }) => (isSupabaseConfigured ? reviewPayrollDispute(id) : Promise.resolve()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payroll-disputes'] }),
  });
}

export function useResolvePayrollDispute() {
  const qc = useQueryClient();
  return useMutation<void, Error, { id: string; resolution: string }>({
    mutationFn: ({ id, resolution }) =>
      isSupabaseConfigured ? resolvePayrollDispute(id, resolution) : Promise.resolve(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payroll-disputes'] }),
  });
}

export function useRejectPayrollDispute() {
  const qc = useQueryClient();
  return useMutation<void, Error, { id: string; resolution: string }>({
    mutationFn: ({ id, resolution }) =>
      isSupabaseConfigured ? rejectPayrollDispute(id, resolution) : Promise.resolve(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payroll-disputes'] }),
  });
}
