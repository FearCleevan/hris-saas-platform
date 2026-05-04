import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// ── Display row (list view) ───────────────────────────────────────
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
  managerId: string | null;
};

// ── Aggregate stats ───────────────────────────────────────────────
export type EmployeeStats = {
  total: number;
  active: number;
  onLeave: number;
  probationary: number;
  newThisMonth: number;
  totalMonthlySalary: number;
};

// ── Full employee detail (profile / edit) ─────────────────────────
export type EmployeeDetail = {
  id: string;
  name: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  suffix: string | null;
  gender: string | null;
  civilStatus: string | null;
  birthday: string | null;
  nationality: string;
  personalEmail: string | null;
  workEmail: string | null;
  mobile: string | null;
  landline: string | null;
  addressLine1: string | null;
  city: string | null;
  province: string | null;
  zipCode: string | null;
  avatarUrl: string | null;
  status: string;
  employeeNo: string;
  position: string | null;
  positionId: string | null;
  department: string | null;
  departmentId: string | null;
  employmentType: string | null;
  employmentTypeId: string | null;
  dateHired: string | null;
  dateRegularized: string | null;
  managerId: string | null;
  salary: number;
  rateType: string;
  sss: string | null;
  tin: string | null;
  pagibig: string | null;
  philhealth: string | null;
  bankName: string | null;
  accountNumber: string | null;
  accountName: string | null;
  accountType: string | null;
  emergencyName: string | null;
  emergencyRelationship: string | null;
  emergencyPhone: string | null;
};

// ── Update payload (matches EditEmployeePage form fields) ─────────
export type UpdateEmployeePayload = {
  firstName: string;
  middleName?: string;
  lastName: string;
  birthday: string;
  gender: 'Male' | 'Female';
  civilStatus: string;
  nationality: string;
  personalEmail: string;
  companyEmail: string;
  mobile: string;
  landline?: string;
  street: string;
  city: string;
  province: string;
  zip: string;
  emergencyName: string;
  emergencyRelationship: string;
  emergencyPhone: string;
  position: string;
  department: string;
  type: string;
  hireDate: string;
  salary: string;
  sss?: string;
  philhealth?: string;
  pagibig?: string;
  tin?: string;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  accountType?: string;
};

export type DepartmentOption = { id: string; name: string };
export type PositionOption   = { id: string; title: string; departmentId: string | null };

// ── Internal Supabase shape ───────────────────────────────────────
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
    direct_manager_id: string | null;
    departments: { name: string }[];
    positions: { title: string }[];
    employment_types: { name: string; code: string }[];
  }[];
  employee_compensation: {
    basic_salary: number;
    is_current: boolean;
  }[];
};

function mapRow(row: SupabaseEmployeeRow): EmployeeRow {
  const emp  = row.employee_employment?.find((e) => e.is_current) ?? row.employee_employment?.[0];
  const comp = row.employee_compensation?.find((c) => c.is_current) ?? row.employee_compensation?.[0];

  return {
    id:          row.id,
    name:        [row.first_name, row.last_name].filter(Boolean).join(' '),
    position:    emp?.positions?.[0]?.title ?? '—',
    department:  emp?.departments?.[0]?.name ?? '—',
    status:      row.status,
    hireDate:    emp?.date_hired ?? '',
    birthday:    row.date_of_birth ?? '',
    salary:      comp?.basic_salary ?? 0,
    type:        emp?.employment_types?.[0]?.code ?? 'regular',
    avatar:      row.avatar_url,
    employeeNo:  row.employee_no,
    email:       row.work_email,
    managerId:   emp?.direct_manager_id ?? null,
  };
}

// ── LIST ─────────────────────────────────────────────────────────
export async function getEmployees(): Promise<EmployeeRow[]> {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase not configured');

  const { data, error } = await supabase
    .from('employees')
    .select(`
      id, employee_no, first_name, last_name, middle_name,
      date_of_birth, avatar_url, status, work_email,
      employee_employment(
        date_hired, is_current, direct_manager_id,
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

// ── SINGLE DETAIL ────────────────────────────────────────────────
export async function getEmployee(id: string): Promise<EmployeeDetail | null> {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase not configured');

  const { data, error } = await supabase
    .from('employees')
    .select(`
      id, employee_no, first_name, middle_name, last_name, suffix,
      gender, civil_status, date_of_birth, nationality,
      personal_email, work_email, mobile_number, phone_number,
      address_line1, city, province, zip_code,
      avatar_url, status,
      employee_employment(
        date_hired, date_regularized, is_current, direct_manager_id,
        departments(id, name),
        positions(id, title),
        employment_types(id, name, code)
      ),
      employee_compensation(basic_salary, rate_type, is_current),
      employee_government_ids(sss_number, tin_number, pagibig_number, philhealth_number),
      employee_bank_accounts(bank_name, account_name, account_number, account_type, is_primary),
      employee_emergency_contacts(name, relationship, mobile_number, is_primary)
    `)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  if (!data) return null;

  const d   = data as any;
  const emp = d.employee_employment?.find((e: any) => e.is_current) ?? d.employee_employment?.[0];
  const comp = d.employee_compensation?.find((c: any) => c.is_current) ?? d.employee_compensation?.[0];
  const gov  = d.employee_government_ids?.[0];
  const bank = d.employee_bank_accounts?.find((b: any) => b.is_primary) ?? d.employee_bank_accounts?.[0];
  const ec   = d.employee_emergency_contacts?.find((e: any) => e.is_primary) ?? d.employee_emergency_contacts?.[0];

  return {
    id:                   d.id,
    name:                 [d.first_name, d.last_name].filter(Boolean).join(' '),
    firstName:            d.first_name,
    middleName:           d.middle_name,
    lastName:             d.last_name,
    suffix:               d.suffix,
    gender:               d.gender,
    civilStatus:          d.civil_status,
    birthday:             d.date_of_birth,
    nationality:          d.nationality ?? 'Filipino',
    personalEmail:        d.personal_email,
    workEmail:            d.work_email,
    mobile:               d.mobile_number,
    landline:             d.phone_number,
    addressLine1:         d.address_line1,
    city:                 d.city,
    province:             d.province,
    zipCode:              d.zip_code,
    avatarUrl:            d.avatar_url,
    status:               d.status,
    employeeNo:           d.employee_no,
    position:             emp?.positions?.[0]?.title ?? null,
    positionId:           emp?.positions?.[0]?.id ?? null,
    department:           emp?.departments?.[0]?.name ?? null,
    departmentId:         emp?.departments?.[0]?.id ?? null,
    employmentType:       emp?.employment_types?.[0]?.code ?? null,
    employmentTypeId:     emp?.employment_types?.[0]?.id ?? null,
    dateHired:            emp?.date_hired ?? null,
    dateRegularized:      emp?.date_regularized ?? null,
    managerId:            emp?.direct_manager_id ?? null,
    salary:               comp?.basic_salary ?? 0,
    rateType:             comp?.rate_type ?? 'monthly',
    sss:                  gov?.sss_number ?? null,
    tin:                  gov?.tin_number ?? null,
    pagibig:              gov?.pagibig_number ?? null,
    philhealth:           gov?.philhealth_number ?? null,
    bankName:             bank?.bank_name ?? null,
    accountNumber:        bank?.account_number ?? null,
    accountName:          bank?.account_name ?? null,
    accountType:          bank?.account_type ?? null,
    emergencyName:        ec?.name ?? null,
    emergencyRelationship: ec?.relationship ?? null,
    emergencyPhone:       ec?.mobile_number ?? null,
  };
}

// ── STATS ─────────────────────────────────────────────────────────
export async function getEmployeeStats(): Promise<EmployeeStats> {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase not configured');

  const firstOfMonth = new Date();
  firstOfMonth.setDate(1);
  const firstOfMonthStr = firstOfMonth.toISOString().split('T')[0];

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
    employee_employment: { date_hired: string; is_current: boolean; employment_types: { code: string }[] }[];
  }[];

  const total       = rows.length;
  const active      = rows.filter((r) => r.status === 'active').length;
  const onLeave     = rows.filter((r) => r.status === 'on_leave').length;
  const probationary = rows.filter((r) =>
    r.employee_employment?.find((e) => e.is_current)?.employment_types?.[0]?.code === 'probationary'
  ).length;
  const newThisMonth = rows.filter((r) => {
    const hired = r.employee_employment?.find((e) => e.is_current)?.date_hired ?? '';
    return hired >= firstOfMonthStr;
  }).length;
  const totalMonthlySalary = (compRes.data ?? []).reduce((s, c) => s + (c.basic_salary ?? 0), 0);

  return { total, active, onLeave, probationary, newThisMonth, totalMonthlySalary };
}

// ── DEPARTMENTS & POSITIONS (for dropdowns) ───────────────────────
export async function getDepartments(): Promise<DepartmentOption[]> {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase not configured');

  const { data, error } = await supabase
    .from('departments')
    .select('id, name')
    .eq('is_active', true)
    .order('name');

  if (error) throw error;
  return data as DepartmentOption[];
}

export async function getPositions(): Promise<PositionOption[]> {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase not configured');

  const { data, error } = await supabase
    .from('positions')
    .select('id, title, department_id')
    .eq('is_active', true)
    .order('title');

  if (error) throw error;
  return (data as any[]).map((p) => ({
    id:           p.id,
    title:        p.title,
    departmentId: p.department_id,
  }));
}

// ── UPDATE ────────────────────────────────────────────────────────
export async function updateEmployee(id: string, payload: UpdateEmployeePayload): Promise<void> {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase not configured');

  // 1. Update employees table
  const { error: empErr } = await supabase
    .from('employees')
    .update({
      first_name:   payload.firstName,
      middle_name:  payload.middleName || null,
      last_name:    payload.lastName,
      date_of_birth: payload.birthday || null,
      gender:       payload.gender.toLowerCase(),
      civil_status: payload.civilStatus.toLowerCase(),
      nationality:  payload.nationality,
      personal_email: payload.personalEmail,
      work_email:   payload.companyEmail,
      mobile_number: payload.mobile,
      phone_number: payload.landline || null,
      address_line1: payload.street,
      city:         payload.city,
      province:     payload.province,
      zip_code:     payload.zip,
    })
    .eq('id', id);
  if (empErr) throw empErr;

  // 2. Dept lookup
  const { data: dept } = await supabase
    .from('departments')
    .select('id')
    .eq('name', payload.department)
    .maybeSingle();

  // 3. Position lookup
  const { data: pos } = await supabase
    .from('positions')
    .select('id')
    .eq('title', payload.position)
    .maybeSingle();

  // 4. Employment type lookup
  const { data: empType } = await supabase
    .from('employment_types')
    .select('id')
    .eq('code', payload.type)
    .maybeSingle();

  // 5. Update employee_employment (current record)
  await supabase
    .from('employee_employment')
    .update({
      department_id:      dept?.id ?? null,
      position_id:        pos?.id ?? null,
      employment_type_id: empType?.id ?? null,
      date_hired:         payload.hireDate,
    })
    .eq('employee_id', id)
    .eq('is_current', true);

  // 6. Update employee_compensation (current record)
  const salaryNum = parseFloat(String(payload.salary).replace(/[^0-9.]/g, ''));
  await supabase
    .from('employee_compensation')
    .update({ basic_salary: salaryNum })
    .eq('employee_id', id)
    .eq('is_current', true);

  // 7. Upsert government IDs
  await supabase
    .from('employee_government_ids')
    .upsert({
      employee_id:      id,
      sss_number:       payload.sss || null,
      philhealth_number: payload.philhealth || null,
      pagibig_number:   payload.pagibig || null,
      tin_number:       payload.tin || null,
    }, { onConflict: 'employee_id' });

  // 8. Upsert bank account (primary)
  if (payload.bankName && payload.accountNumber) {
    const { data: existingBank } = await supabase
      .from('employee_bank_accounts')
      .select('id')
      .eq('employee_id', id)
      .eq('is_primary', true)
      .maybeSingle();

    if (existingBank) {
      await supabase
        .from('employee_bank_accounts')
        .update({
          bank_name:      payload.bankName,
          account_name:   payload.accountName || '',
          account_number: payload.accountNumber,
          account_type:   payload.accountType || 'savings',
        })
        .eq('id', existingBank.id);
    } else {
      await supabase
        .from('employee_bank_accounts')
        .insert({
          employee_id:    id,
          bank_name:      payload.bankName,
          account_name:   payload.accountName || '',
          account_number: payload.accountNumber,
          account_type:   payload.accountType || 'savings',
          is_primary:     true,
        });
    }
  }

  // 9. Upsert emergency contact (primary)
  if (payload.emergencyName) {
    const { data: existing } = await supabase
      .from('employee_emergency_contacts')
      .select('id')
      .eq('employee_id', id)
      .eq('is_primary', true)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('employee_emergency_contacts')
        .update({
          name:          payload.emergencyName,
          relationship:  payload.emergencyRelationship,
          mobile_number: payload.emergencyPhone,
        })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('employee_emergency_contacts')
        .insert({
          employee_id:   id,
          name:          payload.emergencyName,
          relationship:  payload.emergencyRelationship,
          mobile_number: payload.emergencyPhone,
          is_primary:    true,
        });
    }
  }
}

// ── SOFT DELETE ───────────────────────────────────────────────────
export async function deleteEmployee(id: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase not configured');
  const { error } = await supabase
    .from('employees')
    .update({ is_active: false, status: 'terminated' })
    .eq('id', id);
  if (error) throw error;
}
