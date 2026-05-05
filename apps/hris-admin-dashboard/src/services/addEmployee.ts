// src/services/addEmployee.ts
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { uploadEmployeeDocuments } from '@/services/documents';

// ─── Types ────────────────────────────────────────────────────────
export interface Beneficiary {
  id: string;
  name: string;
  relationship: string;
  birthday: string;
  type: 'primary' | 'contingent';
}

type AddEmployeePayload = {
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
  emergencyName?: string;
  emergencyRelationship?: string;
  emergencyPhone?: string;
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
  beneficiaries: Beneficiary[];
  uploads?: Record<string, File | null>;
};

// ─── Helper: get current user's organisation ID ─────────────────
async function getOrgId(): Promise<string> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase not configured');
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // JWT claim is set after refresh; fall back to user_profiles row
  const orgId = (user.app_metadata?.org_id as string | undefined)
    ?? (user.user_metadata?.org_id as string | undefined);

  if (orgId) return orgId;

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single();

  if (!profile?.organization_id) {
    throw new Error('Organization ID not found – please select a company first');
  }
  return profile.organization_id;
}

// ─── Main function ───────────────────────────────────────────────
export async function addEmployee(payload: AddEmployeePayload): Promise<string> {
  // ‼️ Guard – same pattern as employees.ts
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase not configured');
  }

  const orgId = await getOrgId();   // now safe because we already checked

  // 1. Insert into employees ---------------------------------------
  const { data: employee, error: empErr } = await supabase
    .from('employees')
    .insert({
      organization_id: orgId,
      employee_no: `EMP-${Date.now()}`,
      first_name: payload.firstName,
      middle_name: payload.middleName || null,
      last_name: payload.lastName,
      date_of_birth: payload.birthday || null,
      gender: payload.gender.toLowerCase(),
      civil_status: payload.civilStatus.toLowerCase(),
      nationality: payload.nationality || 'Filipino',
      personal_email: payload.personalEmail,
      work_email: payload.companyEmail,
      mobile_number: payload.mobile,
      phone_number: payload.landline || null,
      address_line1: payload.street,
      city: payload.city,
      province: payload.province,
      zip_code: payload.zip,
      country: 'Philippines',
      status: 'active',
      is_active: true,
    })
    .select('id')
    .single();

  if (empErr) throw empErr;
  const employeeId = employee.id;

  // 2. Department — look up, auto-create if missing (code is NOT NULL in schema)
  const { data: dept } = await supabase
    .from('departments')
    .select('id')
    .eq('organization_id', orgId)
    .eq('name', payload.department)
    .maybeSingle();

  let departmentId = dept?.id ?? null;
  if (!departmentId && payload.department) {
    const deptCode = payload.department
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 20) || 'dept';
    const { data: newDept } = await supabase
      .from('departments')
      .insert({ organization_id: orgId, name: payload.department, code: deptCode, is_active: true })
      .select('id')
      .single();
    if (newDept) departmentId = newDept.id;
  }

  // 3. Position — look up, auto-create if missing
  const { data: pos } = await supabase
    .from('positions')
    .select('id')
    .eq('organization_id', orgId)
    .eq('title', payload.position)
    .maybeSingle();

  let positionId = pos?.id ?? null;
  if (!positionId && payload.position) {
    const { data: newPos } = await supabase
      .from('positions')
      .insert({
        organization_id: orgId,
        department_id:   departmentId,
        title:           payload.position,
        is_active:       true,
      })
      .select('id')
      .single();
    if (newPos) positionId = newPos.id;
  }

  // 4. Employment type — look up, auto-create standard types if missing
  const { data: empType } = await supabase
    .from('employment_types')
    .select('id')
    .eq('organization_id', orgId)
    .eq('code', payload.type)
    .maybeSingle();

  let employmentTypeId = empType?.id ?? null;
  if (!employmentTypeId && payload.type) {
    const typeLabels: Record<string, string> = {
      regular:       'Regular',
      probationary:  'Probationary',
      contractual:   'Contractual',
      part_time:     'Part Time',
    };
    const { data: newEmpType } = await supabase
      .from('employment_types')
      .insert({
        organization_id: orgId,
        code:            payload.type,
        name:            typeLabels[payload.type] ?? payload.type,
        is_active:       true,
      })
      .select('id')
      .single();
    if (newEmpType) employmentTypeId = newEmpType.id;
  }

  // 4. Insert employee_employment -----------------------------------
  const { error: empRelErr } = await supabase
    .from('employee_employment')
    .insert({
      employee_id: employeeId,
      organization_id: orgId,
      department_id: departmentId,
      position_id: positionId,
      employment_type_id: employmentTypeId,
      date_hired: payload.hireDate,
      is_current: true,
    });
  if (empRelErr) throw empRelErr;

  // 5. Insert employee_compensation ----------------------------------
  const salaryNum = parseFloat(payload.salary.replace(/[^0-9.]/g, ''));
  const { error: compErr } = await supabase
    .from('employee_compensation')
    .insert({
      employee_id: employeeId,
      organization_id: orgId,
      basic_salary: salaryNum,
      effective_date: payload.hireDate,
      is_current: true,
      currency: 'PHP',
      rate_type: 'monthly',
    });
  if (compErr) throw compErr;

  // 6. Government IDs -------------------------------------------------
  if (payload.sss || payload.philhealth || payload.pagibig || payload.tin) {
    const { error: govErr } = await supabase
      .from('employee_government_ids')
      .insert({
        employee_id: employeeId,
        organization_id: orgId,
        sss_number: payload.sss || null,
        philhealth_number: payload.philhealth || null,
        pagibig_number: payload.pagibig || null,
        tin_number: payload.tin || null,
      });
    if (govErr) throw govErr;
  }

  // 7. Bank account --------------------------------------------------
  if (payload.bankName && payload.accountNumber) {
    const { error: bankErr } = await supabase
      .from('employee_bank_accounts')
      .insert({
        employee_id: employeeId,
        organization_id: orgId,
        bank_name: payload.bankName,
        account_name: payload.accountName || '',
        account_number: payload.accountNumber,
        account_type: (payload.accountType || 'savings').toLowerCase(),
        is_primary: true,
      });
    if (bankErr) throw bankErr;
  }

  // 8. Emergency contact (optional — bulk upload may omit it) -------
  if (payload.emergencyName && payload.emergencyPhone) {
    const { error: emergErr } = await supabase
      .from('employee_emergency_contacts')
      .insert({
        employee_id: employeeId,
        organization_id: orgId,
        name: payload.emergencyName,
        relationship: payload.emergencyRelationship,
        mobile_number: payload.emergencyPhone,
        is_primary: true,
      });
    if (emergErr) throw emergErr;
  }

  // 9. Beneficiaries -------------------------------------------------
  if (payload.beneficiaries.length > 0) {
    const benRows = payload.beneficiaries.map((b) => ({
      employee_id: employeeId,
      organization_id: orgId,
      name: b.name,
      relationship: b.relationship,
      date_of_birth: b.birthday || null,
    }));
    const { error: benErr } = await supabase
      .from('employee_beneficiaries')
      .insert(benRows);
    if (benErr) throw benErr;
  }

  // 10. Documents ------------------------------------------------
  if (payload.uploads && Object.values(payload.uploads).some(Boolean)) {
    await uploadEmployeeDocuments(employeeId, payload.uploads);
  }

  return employeeId;
}