// src/services/addEmployee.ts
import { supabase } from '@/lib/supabase';

// ─── Types (you can move to a shared types file) ─────────────────
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
  beneficiaries: Beneficiary[];
};

// ─── Helper: get current user's organisation ID ─────────────────
async function getOrgId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Not authenticated');

  const orgId = user.app_metadata?.org_id as string | undefined;

  if (!orgId)
    throw new Error('Organization ID not found – please select a company first');

  return orgId;
}

// ─── Main function ───────────────────────────────────────────────
export async function addEmployee(payload: AddEmployeePayload): Promise<string> {
  const orgId = await getOrgId();   // now async

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
    })
    .select('id')
    .single();

  if (empErr) throw empErr;
  const employeeId = employee.id;

  // 2. Department & Position lookup / creation ----------------------
  const { data: dept } = await supabase
    .from('departments')
    .select('id')
    .eq('organization_id', orgId)
    .eq('name', payload.department)
    .maybeSingle();

  let departmentId = dept?.id ?? null;
  // optionally create department if missing – skipped for brevity

  const { data: pos } = await supabase
    .from('positions')
    .select('id')
    .eq('organization_id', orgId)
    .eq('title', payload.position)
    .maybeSingle();

  let positionId = pos?.id ?? null;
  if (!positionId) {
    const { data: newPos, error: posErr } = await supabase
      .from('positions')
      .insert({
        organization_id: orgId,
        department_id: departmentId,
        title: payload.position,
      })
      .select('id')
      .single();
    if (!posErr) positionId = newPos.id;
  }

  // 3. Employment type lookup --------------------------------------
  const { data: empType } = await supabase
    .from('employment_types')
    .select('id')
    .eq('organization_id', orgId)
    .eq('code', payload.type)
    .maybeSingle();

  const employmentTypeId = empType?.id ?? null;

  // 4. Insert employee_employment ----------------------------------
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

  // 5. Insert employee_compensation ---------------------------------
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

  // 6. Government IDs -----------------------------------------------
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

  // 7. Bank account -------------------------------------------------
  if (payload.bankName && payload.accountNumber) {
    const { error: bankErr } = await supabase
      .from('employee_bank_accounts')
      .insert({
        employee_id: employeeId,
        organization_id: orgId,
        bank_name: payload.bankName,
        account_name: payload.accountName || '',
        account_number: payload.accountNumber,
        account_type: payload.accountType || 'savings',
        is_primary: true,
      });
    if (bankErr) throw bankErr;
  }

  // 8. Emergency contact --------------------------------------------
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

  // 9. Beneficiaries ------------------------------------------------
  if (payload.beneficiaries.length > 0) {
    const benRows = payload.beneficiaries.map((b) => ({
      employee_id: employeeId,
      organization_id: orgId,
      name: b.name,
      relationship: b.relationship,
      date_of_birth: b.birthday || null,
    }));
    const { error: benErr } = await supabase.from('employee_beneficiaries').insert(benRows);
    if (benErr) throw benErr;
  }

  return employeeId;
}