import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export type EmployeeRow = {
  id: string;
  name: string;
  position: string;
  department: string;
  status: string;
  hireDate: string;
  birthday: string;
  salary: number;
  type: string;
  avatar: string | null;
  employeeNo: string;
  email: string | null;
};

export type EmployeeStats = {
  total: number;
  active: number;
  onLeave: number;
  probationary: number;
  newThisMonth: number;
  totalMonthlySalary: number;
};

type SupabaseEmployeeRow = {
  id: string;
  first_name: string;
  last_name: string;
  middle_name: string | null;
  date_of_birth: string | null;
  avatar_url: string | null;
  status: string;
  work_email: string | null;
  employee_no: string;
  employee_employment: {
    date_hired: string;
    is_current: boolean;
    departments: { name: string } | null;
    positions: { title: string } | null;
    employment_types: { name: string; code: string } | null;
  }[];
  employee_compensation: {
    basic_salary: number;
    is_current: boolean;
  }[];
};

function mapRow(row: SupabaseEmployeeRow): EmployeeRow {
  const emp = row.employee_employment?.find((e) => e.is_current) ?? row.employee_employment?.[0];
  const comp = row.employee_compensation?.find((c) => c.is_current) ?? row.employee_compensation?.[0];

  return {
    id: row.id,
    name: [row.first_name, row.last_name].filter(Boolean).join(' '),
    position: emp?.positions?.title ?? '—',
    department: emp?.departments?.name ?? '—',
    status: row.status,
    hireDate: emp?.date_hired ?? '',
    birthday: row.date_of_birth ?? '',
    salary: comp?.basic_salary ?? 0,
    type: emp?.employment_types?.code ?? 'regular',
    avatar: row.avatar_url,
    employeeNo: row.employee_no,
    email: row.work_email,
  };
}

export async function getEmployees(): Promise<EmployeeRow[]> {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase not configured');

  const { data, error } = await supabase
    .from('employees')
    .select(`
      id, employee_no, first_name, last_name, middle_name,
      date_of_birth, avatar_url, status, work_email,
      employee_employment(
        date_hired, is_current,
        departments(name),
        positions(title),
        employment_types(name, code)
      ),
      employee_compensation(basic_salary, is_current)
    `)
    .eq('is_active', true)
    .order('last_name');

  if (error) throw error;
  return (data as SupabaseEmployeeRow[]).map(mapRow);
}

export async function getEmployeeStats(): Promise<EmployeeStats> {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase not configured');

  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

  const [allRes, compRes] = await Promise.all([
    supabase
      .from('employees')
      .select('status, employee_employment(date_hired, is_current, employment_types(code))')
      .eq('is_active', true),
    supabase
      .from('employee_compensation')
      .select('basic_salary')
      .eq('is_current', true),
  ]);

  if (allRes.error) throw allRes.error;

  const rows = allRes.data as {
    status: string;
    employee_employment: { date_hired: string; is_current: boolean; employment_types: { code: string } | null }[];
  }[];

  const total = rows.length;
  const active = rows.filter((r) => r.status === 'active').length;
  const onLeave = rows.filter((r) => r.status === 'on_leave').length;
  const probationary = rows.filter((r) =>
    r.employee_employment?.find((e) => e.is_current)?.employment_types?.code === 'probationary'
  ).length;
  const newThisMonth = rows.filter((r) => {
    const hired = r.employee_employment?.find((e) => e.is_current)?.date_hired ?? '';
    return hired >= firstOfMonth;
  }).length;

  const totalMonthlySalary = (compRes.data ?? []).reduce(
    (sum, c) => sum + (c.basic_salary ?? 0),
    0
  );

  return { total, active, onLeave, probationary, newThisMonth, totalMonthlySalary };
}
