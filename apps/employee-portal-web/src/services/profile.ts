import { supabase } from '@/lib/supabase';

// Real column names differ from the old mock shape in a few places —
// address is address_line1/address_line2/city/province/zip_code/country on
// `employees` directly (no separate "barangay" column; address_line2 is
// where that kind of sub-locality detail goes), and personal/contact info
// all lives on `employees` itself (no separate profile table).
const PROFILE_SELECT = `
  id, employee_no, first_name, middle_name, last_name, suffix, gender,
  civil_status, date_of_birth, place_of_birth, nationality, religion,
  blood_type, personal_email, work_email, mobile_number, phone_number,
  address_line1, address_line2, city, province, zip_code, country,
  employee_employment!employee_id (
    date_hired, date_regularized, work_schedule, work_arrangement,
    direct_manager_id,
    departments(name),
    positions(title),
    employment_types(name)
  )
`;

export async function getMyProfile(employeeId: string) {
  if (!supabase) throw new Error('Supabase is not configured for this environment.');
  const { data, error } = await supabase
    .from('employees')
    .select(PROFILE_SELECT)
    .eq('id', employeeId)
    .single();
  if (error) throw error;
  return data;
}

interface PersonalUpdate {
  civil_status?: string;
  religion?: string;
}

export async function updatePersonalInfo(employeeId: string, fields: PersonalUpdate) {
  if (!supabase) throw new Error('Supabase is not configured for this environment.');
  const { error } = await supabase.from('employees').update(fields).eq('id', employeeId);
  if (error) throw error;
}

interface AddressUpdate {
  address_line1: string;
  address_line2: string;
  city: string;
  province: string;
  zip_code: string;
}

export async function updateAddress(employeeId: string, fields: AddressUpdate) {
  if (!supabase) throw new Error('Supabase is not configured for this environment.');
  const { error } = await supabase.from('employees').update(fields).eq('id', employeeId);
  if (error) throw error;
}

interface ContactUpdate {
  personal_email: string;
  mobile_number: string;
  phone_number: string | null;
}

export async function updateContactDetails(employeeId: string, fields: ContactUpdate) {
  if (!supabase) throw new Error('Supabase is not configured for this environment.');
  const { error } = await supabase.from('employees').update(fields).eq('id', employeeId);
  if (error) throw error;
}

export async function getGovernmentIds(employeeId: string) {
  if (!supabase) throw new Error('Supabase is not configured for this environment.');
  const { data, error } = await supabase
    .from('employee_government_ids')
    .select('sss_number, tin_number, pagibig_number, philhealth_number, umid_number')
    .eq('employee_id', employeeId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getBankAccount(employeeId: string) {
  if (!supabase) throw new Error('Supabase is not configured for this environment.');
  const { data, error } = await supabase
    .from('employee_bank_accounts')
    .select('bank_name, account_name, account_number, account_type')
    .eq('employee_id', employeeId)
    .eq('is_primary', true)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getEmergencyContacts(employeeId: string) {
  if (!supabase) throw new Error('Supabase is not configured for this environment.');
  const { data, error } = await supabase
    .from('employee_emergency_contacts')
    .select('id, name, relationship, mobile_number, phone_number, address, is_primary')
    .eq('employee_id', employeeId)
    .order('is_primary', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

interface EmergencyContactInput {
  name: string;
  relationship: string;
  mobile_number: string;
  address: string;
}

export async function addEmergencyContact(
  employeeId: string,
  organizationId: string,
  fields: EmergencyContactInput,
) {
  if (!supabase) throw new Error('Supabase is not configured for this environment.');
  const { data, error } = await supabase
    .from('employee_emergency_contacts')
    .insert({ employee_id: employeeId, organization_id: organizationId, ...fields })
    .select('id, name, relationship, mobile_number, address')
    .single();
  if (error) throw error;
  return data;
}

export async function getDependents(employeeId: string) {
  if (!supabase) throw new Error('Supabase is not configured for this environment.');
  const { data, error } = await supabase
    .from('employee_dependents')
    .select('id, first_name, last_name, relationship, date_of_birth, is_dependent_for_tax')
    .eq('employee_id', employeeId);
  if (error) throw error;
  return data ?? [];
}
