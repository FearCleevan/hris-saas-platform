import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// ── Shared: resolve the current user's org ID ─────────────────────
async function getAuthOrgId(): Promise<string> {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase not configured');

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const orgId = (user.app_metadata?.org_id as string | undefined)
    ?? (user.user_metadata?.org_id as string | undefined);
  if (orgId) return orgId;

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single();

  if (!profile?.organization_id) throw new Error('Organization not found');
  return profile.organization_id;
}

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
export type EmployeeBeneficiary = {
  id: string;
  name: string;
  relationship: string;
  birthday: string | null;
  type: 'primary' | 'contingent';
};

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
  beneficiaries: EmployeeBeneficiary[];
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

  const orgId = await getAuthOrgId();

  const { data, error } = await supabase
    .from('employees')
    .select(`
      id, employee_no, first_name, last_name, middle_name,
      date_of_birth, avatar_url, status, work_email,
      employee_employment!employee_id(
        date_hired, is_current, direct_manager_id,
        departments(name),
        positions(title),
        employment_types(name, code)
      ),
      employee_compensation(basic_salary, is_current)
    `)
    .eq('organization_id', orgId)
    .eq('is_active', true)
    .order('last_name');

  if (error) throw error;
  return (data as SupabaseEmployeeRow[]).map(mapRow);
}

// ── SINGLE DETAIL ────────────────────────────────────────────────
export async function getEmployee(id: string): Promise<EmployeeDetail | null> {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase not configured');

  // Run all queries in parallel. Gov IDs and beneficiaries are fetched directly
  // (not via join) to avoid RLS policies that may block embedded-resource access.
  const [mainRes, govRes, benRes] = await Promise.all([
    supabase
      .from('employees')
      .select(`
        id, employee_no, first_name, middle_name, last_name, suffix,
        gender, civil_status, date_of_birth, nationality,
        personal_email, work_email, mobile_number, phone_number,
        address_line1, city, province, zip_code,
        avatar_url, status,
        employee_employment!employee_id(
          date_hired, date_regularized, is_current, direct_manager_id,
          departments(id, name),
          positions(id, title),
          employment_types(id, name, code)
        ),
        employee_compensation(basic_salary, rate_type, is_current),
        employee_bank_accounts(bank_name, account_name, account_number, account_type, is_primary),
        employee_emergency_contacts(name, relationship, mobile_number, is_primary)
      `)
      .eq('id', id)
      .single(),

    supabase
      .from('employee_government_ids')
      .select('sss_number, tin_number, pagibig_number, philhealth_number')
      .eq('employee_id', id)
      .maybeSingle(),

    supabase
      .from('employee_beneficiaries')
      .select('id, name, relationship, date_of_birth')
      .eq('employee_id', id),
  ]);

  if (mainRes.error) {
    if (mainRes.error.code === 'PGRST116') return null;
    throw mainRes.error;
  }
  if (!mainRes.data) return null;

  const d    = mainRes.data as any;
  const gov  = govRes.data;
  const bens = benRes.data ?? [];
  const emp  = d.employee_employment?.find((e: any) => e.is_current) ?? d.employee_employment?.[0];
  const comp = d.employee_compensation?.find((c: any) => c.is_current) ?? d.employee_compensation?.[0];
  const bank = d.employee_bank_accounts?.find((b: any) => b.is_primary) ?? d.employee_bank_accounts?.[0];
  const ec   = d.employee_emergency_contacts?.find((e: any) => e.is_primary) ?? d.employee_emergency_contacts?.[0];

  return {
    id:                    d.id,
    name:                  [d.first_name, d.last_name].filter(Boolean).join(' '),
    firstName:             d.first_name,
    middleName:            d.middle_name,
    lastName:              d.last_name,
    suffix:                d.suffix,
    gender:                d.gender,
    civilStatus:           d.civil_status,
    birthday:              d.date_of_birth,
    nationality:           d.nationality ?? 'Filipino',
    personalEmail:         d.personal_email,
    workEmail:             d.work_email,
    mobile:                d.mobile_number,
    landline:              d.phone_number,
    addressLine1:          d.address_line1,
    city:                  d.city,
    province:              d.province,
    zipCode:               d.zip_code,
    avatarUrl:             d.avatar_url,
    status:                d.status,
    employeeNo:            d.employee_no,
    position:              emp?.positions?.[0]?.title ?? null,
    positionId:            emp?.positions?.[0]?.id ?? null,
    department:            emp?.departments?.[0]?.name ?? null,
    departmentId:          emp?.departments?.[0]?.id ?? null,
    employmentType:        emp?.employment_types?.[0]?.code ?? null,
    employmentTypeId:      emp?.employment_types?.[0]?.id ?? null,
    dateHired:             emp?.date_hired ?? null,
    dateRegularized:       emp?.date_regularized ?? null,
    managerId:             emp?.direct_manager_id ?? null,
    salary:                comp?.basic_salary ?? 0,
    rateType:              comp?.rate_type ?? 'monthly',
    sss:                   gov?.sss_number ?? null,
    tin:                   gov?.tin_number ?? null,
    pagibig:               gov?.pagibig_number ?? null,
    philhealth:            gov?.philhealth_number ?? null,
    bankName:              bank?.bank_name ?? null,
    accountNumber:         bank?.account_number ?? null,
    accountName:           bank?.account_name ?? null,
    accountType:           bank?.account_type ?? null,
    emergencyName:         ec?.name ?? null,
    emergencyRelationship: ec?.relationship ?? null,
    emergencyPhone:        ec?.mobile_number ?? null,
    beneficiaries: bens.map((b: any) => ({
      id:           b.id,
      name:         b.name,
      relationship: b.relationship,
      birthday:     b.date_of_birth ?? null,
      type:         'primary' as const,
    })),
  };
}

// ── SYNC BENEFICIARIES (used by edit flow) ────────────────────────
export async function syncBeneficiaries(
  employeeId: string,
  beneficiaries: EmployeeBeneficiary[],
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase not configured');

  const orgId = await getAuthOrgId();

  // Delete all existing then re-insert — simpler than diffing
  const { error: delErr } = await supabase
    .from('employee_beneficiaries')
    .delete()
    .eq('employee_id', employeeId);
  if (delErr) throw delErr;

  if (beneficiaries.length === 0) return;

  const { error: insErr } = await supabase
    .from('employee_beneficiaries')
    .insert(
      beneficiaries.map((b) => ({
        employee_id:     employeeId,
        organization_id: orgId,
        name:            b.name,
        relationship:    b.relationship,
        date_of_birth:   b.birthday || null,
      })),
    );
  if (insErr) throw insErr;
}

// ── STATS ─────────────────────────────────────────────────────────
export async function getEmployeeStats(): Promise<EmployeeStats> {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase not configured');

  const orgId = await getAuthOrgId();

  const firstOfMonth = new Date();
  firstOfMonth.setDate(1);
  const firstOfMonthStr = firstOfMonth.toISOString().split('T')[0];

  const [allRes, compRes] = await Promise.all([
    supabase
      .from('employees')
      .select('status, employee_employment!employee_id(date_hired, is_current, employment_types(code))')
      .eq('organization_id', orgId)
      .eq('is_active', true),
    supabase
      .from('employee_compensation')
      .select('basic_salary')
      .eq('organization_id', orgId)
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

  const orgId = await getAuthOrgId();

  const { data, error } = await supabase
    .from('departments')
    .select('id, name')
    .eq('organization_id', orgId)
    .eq('is_active', true)
    .order('name');

  if (error) throw error;
  return data as DepartmentOption[];
}

export async function getPositions(): Promise<PositionOption[]> {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase not configured');

  const orgId = await getAuthOrgId();

  const { data, error } = await supabase
    .from('positions')
    .select('id, title, department_id')
    .eq('organization_id', orgId)
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

  const orgId = await getAuthOrgId();

  // 1. Update core employee fields
  const { error: empErr } = await supabase
    .from('employees')
    .update({
      first_name:    payload.firstName,
      middle_name:   payload.middleName || null,
      last_name:     payload.lastName,
      date_of_birth: payload.birthday || null,
      gender:        payload.gender?.toLowerCase() ?? null,
      civil_status:  payload.civilStatus?.toLowerCase() ?? null,
      nationality:   payload.nationality,
      personal_email: payload.personalEmail,
      work_email:    payload.companyEmail,
      mobile_number: payload.mobile,
      phone_number:  payload.landline || null,
      address_line1: payload.street,
      city:          payload.city,
      province:      payload.province,
      zip_code:      payload.zip,
    })
    .eq('id', id)
    .eq('organization_id', orgId);
  if (empErr) throw empErr;

  // 2. Parallel lookups — scoped to this org so RLS can't return wrong rows
  const [deptRes, posRes, empTypeRes] = await Promise.all([
    supabase.from('departments').select('id').eq('name', payload.department).eq('organization_id', orgId).maybeSingle(),
    supabase.from('positions').select('id').eq('title', payload.position).eq('organization_id', orgId).maybeSingle(),
    supabase.from('employment_types').select('id').eq('code', payload.type).maybeSingle(),
  ]);

  // 3. Build employment update — only overwrite an ID when the lookup actually found a row
  const empUpdatePayload: Record<string, unknown> = { date_hired: payload.hireDate };
  if (deptRes.data?.id)    empUpdatePayload.department_id      = deptRes.data.id;
  if (posRes.data?.id)     empUpdatePayload.position_id        = posRes.data.id;
  if (empTypeRes.data?.id) empUpdatePayload.employment_type_id = empTypeRes.data.id;

  const { error: empEmpErr } = await supabase
    .from('employee_employment')
    .update(empUpdatePayload)
    .eq('employee_id', id)
    .eq('is_current', true);
  if (empEmpErr) throw empEmpErr;

  // 4. Update compensation
  const salaryNum = parseFloat(String(payload.salary).replace(/[^0-9.]/g, ''));
  if (!isNaN(salaryNum) && salaryNum > 0) {
    const { error: compErr } = await supabase
      .from('employee_compensation')
      .update({ basic_salary: salaryNum })
      .eq('employee_id', id)
      .eq('is_current', true);
    if (compErr) throw compErr;
  }

  // 5. Upsert government IDs
  const { error: govErr } = await supabase
    .from('employee_government_ids')
    .upsert({
      employee_id:       id,
      organization_id:   orgId,
      sss_number:        payload.sss || null,
      philhealth_number: payload.philhealth || null,
      pagibig_number:    payload.pagibig || null,
      tin_number:        payload.tin || null,
    }, { onConflict: 'employee_id' });
  if (govErr) throw govErr;

  // 6. Upsert primary bank account
  if (payload.bankName && payload.accountNumber) {
    const { data: existingBank, error: bankFetchErr } = await supabase
      .from('employee_bank_accounts')
      .select('id')
      .eq('employee_id', id)
      .eq('is_primary', true)
      .maybeSingle();
    if (bankFetchErr) throw bankFetchErr;

    if (existingBank) {
      const { error: bankUpdErr } = await supabase
        .from('employee_bank_accounts')
        .update({
          bank_name:      payload.bankName,
          account_name:   payload.accountName || '',
          account_number: payload.accountNumber,
          account_type:   payload.accountType || 'savings',
        })
        .eq('id', existingBank.id);
      if (bankUpdErr) throw bankUpdErr;
    } else {
      const { error: bankInsErr } = await supabase
        .from('employee_bank_accounts')
        .insert({
          employee_id:    id,
          organization_id: orgId,
          bank_name:      payload.bankName,
          account_name:   payload.accountName || '',
          account_number: payload.accountNumber,
          account_type:   payload.accountType || 'savings',
          is_primary:     true,
        });
      if (bankInsErr) throw bankInsErr;
    }
  }

  // 7. Upsert primary emergency contact
  if (payload.emergencyName) {
    const { data: existingEc, error: ecFetchErr } = await supabase
      .from('employee_emergency_contacts')
      .select('id')
      .eq('employee_id', id)
      .eq('is_primary', true)
      .maybeSingle();
    if (ecFetchErr) throw ecFetchErr;

    if (existingEc) {
      const { error: ecUpdErr } = await supabase
        .from('employee_emergency_contacts')
        .update({
          name:          payload.emergencyName,
          relationship:  payload.emergencyRelationship,
          mobile_number: payload.emergencyPhone,
        })
        .eq('id', existingEc.id);
      if (ecUpdErr) throw ecUpdErr;
    } else {
      const { error: ecInsErr } = await supabase
        .from('employee_emergency_contacts')
        .insert({
          employee_id:    id,
          organization_id: orgId,
          name:           payload.emergencyName,
          relationship:   payload.emergencyRelationship,
          mobile_number:  payload.emergencyPhone,
          is_primary:     true,
        });
      if (ecInsErr) throw ecInsErr;
    }
  }
}

// ── DELETE (hard — cascades all child tables via RPC) ─────────────
export async function deleteEmployee(id: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.rpc('delete_employees_hard', { p_ids: [id] });
  if (error) throw error;
}

// ── BULK DELETE ───────────────────────────────────────────────────
export async function deleteEmployees(ids: string[]): Promise<void> {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase not configured');
  if (ids.length === 0) return;
  const { error } = await supabase.rpc('delete_employees_hard', { p_ids: ids });
  if (error) throw error;
}
