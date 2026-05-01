import { useQuery } from '@tanstack/react-query';
import { isSupabaseConfigured } from '@/lib/supabase';
import {
  getEmployees,
  getEmployeeStats,
  type EmployeeRow,
  type EmployeeStats,
} from '@/services/employees';
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
          })),
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
