import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { isSupabaseConfigured } from '@/lib/supabase';
import {
  getEmployees,
  getEmployee,
  getEmployeeStats,
  updateEmployee,
  deleteEmployee,
  syncBeneficiaries,
  type EmployeeRow,
  type EmployeeDetail,
  type EmployeeStats,
  type UpdateEmployeePayload,
  type EmployeeBeneficiary,
} from '@/services/employees';
import { addEmployee } from '@/services/addEmployee';
import mockEmployees from '@/data/mock/employees.json';

const MOCK_STATS: EmployeeStats = {
  total: mockEmployees.length,
  active: mockEmployees.filter((e) => e.status === 'active').length,
  onLeave: mockEmployees.filter((e) => e.status === 'on_leave').length,
  probationary: mockEmployees.filter((e) => e.type === 'probationary').length,
  newThisMonth: 3,
  totalMonthlySalary: mockEmployees.reduce((s, e) => s + e.salary, 0),
};

export function useEmployees() {
  return useQuery<EmployeeRow[]>({
    queryKey: ['employees'],
    queryFn: isSupabaseConfigured
      ? getEmployees
      : async () =>
          mockEmployees.map((e) => ({
            id: e.id,
            name: e.name,
            position: e.position,
            department: e.department,
            status: e.status,
            hireDate: e.hireDate,
            birthday: e.birthday ?? '',
            salary: e.salary,
            type: e.type,
            avatar: e.avatar,
            employeeNo: e.id,
            email: null,
            managerId: null,
          })),
    staleTime: 1000 * 60 * 5,
  });
}

export function useEmployee(id: string | undefined) {
  return useQuery<EmployeeDetail | null>({
    queryKey: ['employee', id],
    queryFn: () => (id ? getEmployee(id) : null),
    enabled: !!id && isSupabaseConfigured,
    staleTime: 1000 * 60 * 5,
  });
}

export function useEmployeeStats() {
  return useQuery<EmployeeStats>({
    queryKey: ['employee-stats'],
    queryFn: isSupabaseConfigured ? getEmployeeStats : async () => MOCK_STATS,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateEmployee() {
  const qc = useQueryClient();
  return useMutation<string, Error, Parameters<typeof addEmployee>[0]>({
    mutationFn: addEmployee,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] });
      qc.invalidateQueries({ queryKey: ['employee-stats'] });
    },
  });
}

export function useUpdateEmployee() {
  const qc = useQueryClient();
  return useMutation<void, Error, { id: string; payload: UpdateEmployeePayload }>({
    mutationFn: ({ id, payload }) => updateEmployee(id, payload),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['employees'] });
      qc.invalidateQueries({ queryKey: ['employee', variables.id] });
    },
  });
}

export function useDeleteEmployee() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: deleteEmployee,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] });
      qc.invalidateQueries({ queryKey: ['employee-stats'] });
    },
  });
}

export function useSyncBeneficiaries() {
  const qc = useQueryClient();
  return useMutation<void, Error, { employeeId: string; beneficiaries: EmployeeBeneficiary[] }>({
    mutationFn: ({ employeeId, beneficiaries }) => syncBeneficiaries(employeeId, beneficiaries),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['employee', variables.employeeId] });
    },
  });
}
