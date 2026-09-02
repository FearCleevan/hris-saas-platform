import { supabase } from '@/lib/supabase';

const LOG_SELECT =
  'id, log_date, time_in, time_out, hours_worked, overtime_hours, late_minutes, undertime_minutes, status, source, is_corrected';

export async function getLogsForMonth(employeeId: string, yearMonth: string) {
  if (!supabase) throw new Error('Supabase is not configured for this environment.');
  const { data, error } = await supabase
    .from('attendance_logs')
    .select(LOG_SELECT)
    .eq('employee_id', employeeId)
    .gte('log_date', `${yearMonth}-01`)
    .lt('log_date', nextMonthStart(yearMonth))
    .order('log_date', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getLogByDate(employeeId: string, date: string) {
  if (!supabase) throw new Error('Supabase is not configured for this environment.');
  const { data, error } = await supabase
    .from('attendance_logs')
    .select(LOG_SELECT)
    .eq('employee_id', employeeId)
    .eq('log_date', date)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// hours_worked isn't a generated column — computed client-side and sent
// explicitly on clock-out, same as v1/hris-admin-dashboard's own
// calcWorkHours() pattern (handles the overnight-shift wraparound).
function calcHoursWorked(timeIn: string, timeOut: Date): number {
  const start = new Date(timeIn);
  const ms = timeOut.getTime() - start.getTime();
  return Math.max(0, Math.round((ms / 3_600_000) * 100) / 100);
}

export async function clockIn(
  employeeId: string,
  organizationId: string,
  date: string,
  location?: { lat: number; lng: number } | null,
) {
  if (!supabase) throw new Error('Supabase is not configured for this environment.');
  const { data, error } = await supabase
    .from('attendance_logs')
    .insert({
      employee_id: employeeId,
      organization_id: organizationId,
      log_date: date,
      time_in: new Date().toISOString(),
      status: 'present',
      source: 'web',
      location_lat: location?.lat ?? null,
      location_lng: location?.lng ?? null,
    })
    .select(LOG_SELECT)
    .single();
  if (error) throw error;
  return data;
}

export async function clockOut(logId: string, timeIn: string) {
  if (!supabase) throw new Error('Supabase is not configured for this environment.');
  const now = new Date();
  const { data, error } = await supabase
    .from('attendance_logs')
    .update({ time_out: now.toISOString(), hours_worked: calcHoursWorked(timeIn, now) })
    .eq('id', logId)
    .select(LOG_SELECT)
    .single();
  if (error) throw error;
  return data;
}

export async function getCurrentSchedule(employeeId: string) {
  if (!supabase) throw new Error('Supabase is not configured for this environment.');
  const { data, error } = await supabase
    .from('employee_schedules')
    .select(`
      effective_date,
      schedules ( name, code, shift_start, shift_end, break_minutes, work_days, is_night_shift )
    `)
    .eq('employee_id', employeeId)
    .eq('is_current', true)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export interface OvertimeRequestInput {
  request_date: string;
  ot_start: string;
  ot_end: string;
  ot_hours: number;
  ot_type: string;
  reason: string;
}

export async function listOvertimeRequests(employeeId: string) {
  if (!supabase) throw new Error('Supabase is not configured for this environment.');
  const { data, error } = await supabase
    .from('overtime_requests')
    .select('id, request_date, ot_start, ot_end, ot_hours, ot_type, reason, status, approved_at, created_at')
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function submitOvertimeRequest(
  employeeId: string,
  organizationId: string,
  input: OvertimeRequestInput,
) {
  if (!supabase) throw new Error('Supabase is not configured for this environment.');
  const { data, error } = await supabase
    .from('overtime_requests')
    .insert({ employee_id: employeeId, organization_id: organizationId, status: 'pending', ...input })
    .select('id, request_date, ot_hours, status')
    .single();
  if (error) throw error;
  return data;
}

export interface CorrectionRequestInput {
  attendance_log_id: string | null;
  correction_type: 'time_in' | 'time_out' | 'both';
  corrected_value: string;
  reason: string;
}

export async function listCorrectionRequests(employeeId: string) {
  if (!supabase) throw new Error('Supabase is not configured for this environment.');
  const { data, error } = await supabase
    .from('attendance_corrections')
    .select('id, attendance_log_id, correction_type, original_value, corrected_value, reason, status, created_at')
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function submitCorrectionRequest(
  employeeId: string,
  organizationId: string,
  input: CorrectionRequestInput,
) {
  if (!supabase) throw new Error('Supabase is not configured for this environment.');
  const { data, error } = await supabase
    .from('attendance_corrections')
    .insert({ employee_id: employeeId, organization_id: organizationId, status: 'pending', ...input })
    .select('id, correction_type, corrected_value, status')
    .single();
  if (error) throw error;
  return data;
}

function nextMonthStart(yearMonth: string): string {
  const [y, m] = yearMonth.split('-').map(Number);
  const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
  return next;
}
