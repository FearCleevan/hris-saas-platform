import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { isSupabaseConfigured } from '@/lib/supabase';
import {
  getOnboardingRecords,
  getOnboardingDetail,
  updateOnboardingTaskStatus,
  initiateOnboarding,
  type OnboardingRecord,
  type OnboardingDetail,
} from '@/services/onboarding';
import mockOnboardingData from '@/data/mock/onboarding.json';
import mockEmployeesData from '@/data/mock/employees.json';

// ── Mock adapters ─────────────────────────────────────────────────────────────

function mockToRecords(): OnboardingRecord[] {
  return mockOnboardingData.map((rec) => {
    const emp = mockEmployeesData.find((e) => e.id === rec.employeeId);
    const allItems = rec.checklist.flatMap((cat) =>
      cat.items.map((item) => ({
        status: item.done ? 'completed' : 'pending',
        dueDate: item.dueDate,
      })),
    );
    const categories = rec.checklist.map((cat) => ({
      name:  cat.category,
      done:  cat.items.filter((i) => i.done).length,
      total: cat.items.length,
    }));
    const today = new Date().toISOString().split('T')[0];
    const isOverdue = allItems.some(
      (i) => i.dueDate && i.dueDate < today && i.status !== 'completed',
    );
    const allDone = allItems.every((i) => i.status === 'completed');
    return {
      employeeId:     rec.employeeId,
      employeeName:   emp?.name ?? rec.employeeId,
      employeeNo:     rec.employeeId,
      avatarUrl:      emp?.avatar ?? null,
      position:       emp?.position ?? rec.position,
      department:     emp?.department ?? rec.department,
      dateHired:      rec.hireDate,
      overallStatus:  allDone ? 'completed' : isOverdue ? 'overdue' : rec.status as any,
      totalTasks:     allItems.length,
      completedTasks: allItems.filter((i) => i.status === 'completed').length,
      categories,
    };
  });
}

function mockToDetail(employeeId: string): OnboardingDetail | null {
  const rec = mockOnboardingData.find((r) => r.employeeId === employeeId);
  const emp = mockEmployeesData.find((e) => e.id === employeeId);
  if (!rec) return null;

  const items = rec.checklist.flatMap((cat) =>
    cat.items.map((item, idx) => ({
      id:          `mock-${item.id}`,
      taskId:      `mock-task-${item.id}`,
      status:      (item.done ? 'completed' : 'pending') as 'completed' | 'pending',
      dueDate:     item.dueDate,
      completedAt: item.done ? item.dueDate : null,
      notes:       null,
      task: {
        id:               `mock-task-${item.id}`,
        title:            item.task,
        description:      null,
        category:         cat.category,
        assignedToRole:   item.assignee,
        isRequired:       true,
        dueDaysAfterHire: 7,
        sortOrder:        idx,
      },
    })),
  );

  const today = new Date().toISOString().split('T')[0];
  const isOverdue = items.some(
    (i) => i.dueDate && i.dueDate < today && i.status !== 'completed',
  );
  const allDone = items.every((i) => i.status === 'completed');
  const categories = rec.checklist.map((cat) => ({
    name:  cat.category,
    done:  cat.items.filter((i) => i.done).length,
    total: cat.items.length,
  }));

  return {
    employeeId:     rec.employeeId,
    employeeName:   emp?.name ?? rec.employeeId,
    employeeNo:     rec.employeeId,
    avatarUrl:      emp?.avatar ?? null,
    position:       emp?.position ?? rec.position,
    department:     emp?.department ?? rec.department,
    dateHired:      rec.hireDate,
    overallStatus:  allDone ? 'completed' : isOverdue ? 'overdue' : rec.status as any,
    totalTasks:     items.length,
    completedTasks: items.filter((i) => i.status === 'completed').length,
    categories,
    items,
  };
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useOnboardingRecords() {
  return useQuery<OnboardingRecord[]>({
    queryKey: ['onboarding-records'],
    queryFn: isSupabaseConfigured ? getOnboardingRecords : async () => mockToRecords(),
    staleTime: 1000 * 60 * 5,
  });
}

export function useOnboardingDetail(employeeId: string | undefined) {
  return useQuery<OnboardingDetail | null>({
    queryKey: ['onboarding-detail', employeeId],
    queryFn: () => {
      if (!employeeId) return null;
      if (isSupabaseConfigured) return getOnboardingDetail(employeeId);
      return mockToDetail(employeeId);
    },
    enabled: !!employeeId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useInitiateOnboarding() {
  const qc = useQueryClient();
  return useMutation<void, Error, { employeeIds: string[]; startDate: string }>({
    mutationFn: async ({ employeeIds, startDate }) => {
      for (const employeeId of employeeIds) {
        await initiateOnboarding(employeeId, startDate);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['onboarding-records'] });
    },
  });
}

export function useUpdateOnboardingTask() {
  const qc = useQueryClient();
  return useMutation<
    void,
    Error,
    { progressId: string; status: 'pending' | 'completed' | 'skipped'; employeeId: string; notes?: string }
  >({
    mutationFn: ({ progressId, status, notes }) =>
      updateOnboardingTaskStatus(progressId, status, notes),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['onboarding-records'] });
      qc.invalidateQueries({ queryKey: ['onboarding-detail', variables.employeeId] });
    },
  });
}
