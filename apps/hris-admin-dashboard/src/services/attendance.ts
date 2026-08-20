import { supabase, isSupabaseConfigured } from '@/lib/supabase';

async function getAuthOrgId(): Promise<string> {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase not configured');
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const orgId =
    (user.app_metadata?.org_id as string | undefined) ??
    (user.user_metadata?.org_id as string | undefined);
  if (orgId) return orgId;
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single();
  if (!profile?.organization_id) throw new Error('Organization not found');
  return profile.organization_id;
}

// ── Types ──────────────────────────────────────────────────────────────────────

export interface AttendanceLogEntry {
  id: string;
  employeeId: string;
  employeeName: string;
  position: string;
  department: string;
  avatarUrl: string | null;
  date: string;         // YYYY-MM-DD
  timeIn: string | null;
  timeOut: string | null;
  workHours: number;
  lateMinutes: number;
  overtimeHours: number;
  status: string;
  source: string;
  locationLat: number | null;
  locationLng: number | null;
  isCorrected: boolean;
  notes: string | null;
}

export interface OvertimeRequestEntry {
  id: string;
  employeeId: string;
  employeeName: string;
  position: string;
  department: string;
  date: string;         // YYYY-MM-DD
  startTime: string;    // HH:MM
  endTime: string;
  hours: number;
  reason: string;
  type: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  approvedByName: string | null;
  approvedAt: string | null;
  remarks: string | null;
}

export interface ScheduleEntry {
  id: string;
  name: string;
  code: string;
  startTime: string;      // HH:MM
  endTime: string;
  breakMinutes: number;
  workHours: number;
  gracePeriodMinutes: number;
  isNightShift: boolean;
  isFlexible: boolean;
  isActive: boolean;
  // UI-only — not persisted to DB
  color: string;
  departments: string[];
  workDays: string[];
}

export interface ScheduleAssignmentEntry {
  id: string;
  employeeId: string;
  scheduleId: string;
  workDays: string[];
}

export type MonthlyDateMap = Record<string, {
  present: number;
  late: number;
  halfDay: number;
  total: number;
}>;

export interface CreateScheduleInput {
  name: string;
  code: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  gracePeriodMinutes: number;
  isNightShift: boolean;
  isFlexible: boolean;
  workDays: string[];
  color: string;
  departments: string[];
}

export interface UpdateScheduleInput extends CreateScheduleInput {
  assignedEmployeeIds: string[];
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatTime(ts: string | null): string | null {
  if (!ts) return null;
  // If it's already HH:MM (time-only from DB), return as-is (trim seconds)
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(ts)) return ts.slice(0, 5);
  return new Date(ts).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function normalizeLog(row: any): AttendanceLogEntry {
  const emp = row.employees ?? {};
  const name = [emp.first_name, emp.last_name].filter(Boolean).join(' ') || row.employee_id;
  return {
    id:           row.id,
    employeeId:   row.employee_id,
    employeeName: name,
    position:     emp.position ?? '',
    department:   emp.department ?? '',
    avatarUrl:    emp.avatar_url ?? null,
    date:         row.log_date,
    timeIn:       formatTime(row.time_in),
    timeOut:      formatTime(row.time_out),
    workHours:    Number(row.hours_worked ?? 0),
    lateMinutes:  row.late_minutes ?? 0,
    overtimeHours: Number(row.overtime_hours ?? 0),
    status:       row.status,
    source:       row.source,
    locationLat:  row.location_lat ?? null,
    locationLng:  row.location_lng ?? null,
    isCorrected:  row.is_corrected ?? false,
    notes:        row.notes ?? null,
  };
}

function normalizeOT(row: any): OvertimeRequestEntry {
  const emp = row.employees ?? {};
  const name = [emp.first_name, emp.last_name].filter(Boolean).join(' ') || row.employee_id;
  const approver = row.user_profiles ?? null;
  return {
    id:              row.id,
    employeeId:      row.employee_id,
    employeeName:    name,
    position:        emp.position ?? '',
    department:      emp.department ?? '',
    date:            row.request_date,
    startTime:       formatTime(row.ot_start) ?? '',
    endTime:         formatTime(row.ot_end) ?? '',
    hours:           Number(row.ot_hours ?? 0),
    reason:          row.reason,
    type:            row.ot_type,
    status:          row.status,
    approvedByName:  approver?.full_name ?? null,
    approvedAt:      row.approved_at ?? null,
    remarks:         row.remarks ?? null,
  };
}

const DEFAULT_SHIFT_COLORS = [
  '#0038a8', '#1d4ed8', '#7c3aed', '#6366f1',
  '#0891b2', '#059669', '#ca8a04', '#f97316',
];

function normalizeSchedule(row: any, index = 0): ScheduleEntry {
  return {
    id:                row.id,
    name:              row.name,
    code:              row.code,
    startTime:         (row.shift_start as string).slice(0, 5),
    endTime:           (row.shift_end as string).slice(0, 5),
    breakMinutes:      row.break_minutes,
    workHours:         Number(row.work_hours),
    gracePeriodMinutes: row.grace_period_minutes,
    isNightShift:      row.is_night_shift,
    isFlexible:        row.is_flexible,
    isActive:          row.is_active,
    color:             DEFAULT_SHIFT_COLORS[index % DEFAULT_SHIFT_COLORS.length],
    departments:       [],
    workDays:          ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
  };
}

// ── Attendance Logs ────────────────────────────────────────────────────────────

export async function getAttendanceLogsByDate(date: string): Promise<AttendanceLogEntry[]> {
  const orgId = await getAuthOrgId();
  const { data, error } = await supabase!
    .from('attendance_logs')
    .select('*, employees(first_name, last_name, position, department, avatar_url)')
    .eq('organization_id', orgId)
    .eq('log_date', date)
    .order('late_minutes', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(normalizeLog);
}

export async function getMonthlyAttendanceSummary(
  year: number,
  month: number,
): Promise<MonthlyDateMap> {
  const orgId = await getAuthOrgId();
  const from = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const to = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const { data, error } = await supabase!
    .from('attendance_logs')
    .select('log_date, status')
    .eq('organization_id', orgId)
    .gte('log_date', from)
    .lte('log_date', to);
  if (error) throw error;

  const map: MonthlyDateMap = {};
  for (const row of data ?? []) {
    if (!map[row.log_date]) map[row.log_date] = { present: 0, late: 0, halfDay: 0, total: 0 };
    map[row.log_date].total++;
    if (row.status === 'present')  map[row.log_date].present++;
    if (row.status === 'late')     map[row.log_date].late++;
    if (row.status === 'half_day') map[row.log_date].halfDay++;
  }
  return map;
}

export async function getAttendanceLogsForReports(
  startDate: string,
  endDate: string,
): Promise<AttendanceLogEntry[]> {
  const orgId = await getAuthOrgId();
  const { data, error } = await supabase!
    .from('attendance_logs')
    .select('*, employees(first_name, last_name, position, department, avatar_url)')
    .eq('organization_id', orgId)
    .gte('log_date', startDate)
    .lte('log_date', endDate);
  if (error) throw error;
  return (data ?? []).map(normalizeLog);
}

// ── Overtime Requests ──────────────────────────────────────────────────────────

export async function getOvertimeRequests(): Promise<OvertimeRequestEntry[]> {
  const orgId = await getAuthOrgId();
  const { data, error } = await supabase!
    .from('overtime_requests')
    .select('*, employees(first_name, last_name, position, department)')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(normalizeOT);
}

export async function approveOvertimeRequest(id: string, remarks?: string): Promise<void> {
  const { data: { user } } = await supabase!.auth.getUser();
  const { error } = await supabase!
    .from('overtime_requests')
    .update({
      status:      'approved',
      approved_by: user?.id ?? null,
      approved_at: new Date().toISOString(),
      remarks:     remarks ?? null,
    })
    .eq('id', id);
  if (error) throw error;
}

export async function rejectOvertimeRequest(id: string, remarks?: string): Promise<void> {
  const { data: { user } } = await supabase!.auth.getUser();
  const { error } = await supabase!
    .from('overtime_requests')
    .update({
      status:      'rejected',
      approved_by: user?.id ?? null,
      approved_at: new Date().toISOString(),
      remarks:     remarks ?? null,
    })
    .eq('id', id);
  if (error) throw error;
}

// ── Schedules (Shifts) ─────────────────────────────────────────────────────────

export async function getSchedules(): Promise<ScheduleEntry[]> {
  const orgId = await getAuthOrgId();
  const { data, error } = await supabase!
    .from('schedules')
    .select('*')
    .eq('organization_id', orgId)
    .eq('is_active', true)
    .order('name');
  if (error) throw error;
  return (data ?? []).map(normalizeSchedule);
}

export async function createSchedule(input: CreateScheduleInput): Promise<ScheduleEntry> {
  const orgId = await getAuthOrgId();
  const { data, error } = await supabase!
    .from('schedules')
    .insert({
      organization_id:      orgId,
      name:                 input.name,
      code:                 input.code,
      shift_start:          input.startTime,
      shift_end:            input.endTime,
      break_minutes:        input.breakMinutes,
      grace_period_minutes: input.gracePeriodMinutes,
      work_hours:           calcWorkHoursFromTimes(input.startTime, input.endTime, input.breakMinutes),
      is_night_shift:       input.isNightShift,
      is_flexible:          input.isFlexible,
      is_active:            true,
    })
    .select()
    .single();
  if (error) throw error;
  const entry = normalizeSchedule(data);
  entry.color       = input.color;
  entry.departments = input.departments;
  entry.workDays    = input.workDays;
  return entry;
}

export async function updateSchedule(id: string, input: UpdateScheduleInput): Promise<ScheduleEntry> {
  const { error } = await supabase!
    .from('schedules')
    .update({
      name:               input.name,
      code:               input.code,
      shift_start:        input.startTime,
      shift_end:          input.endTime,
      break_minutes:      input.breakMinutes,
      grace_period_minutes: input.gracePeriodMinutes,
      work_hours:         calcWorkHoursFromTimes(input.startTime, input.endTime, input.breakMinutes),
      is_night_shift:     input.isNightShift,
      is_flexible:        input.isFlexible,
    })
    .eq('id', id);
  if (error) throw error;
  const entry: ScheduleEntry = {
    id,
    name:              input.name,
    code:              input.code,
    startTime:         input.startTime,
    endTime:           input.endTime,
    breakMinutes:      input.breakMinutes,
    workHours:         calcWorkHoursFromTimes(input.startTime, input.endTime, input.breakMinutes),
    gracePeriodMinutes: input.gracePeriodMinutes,
    isNightShift:      input.isNightShift,
    isFlexible:        input.isFlexible,
    isActive:          true,
    color:             input.color,
    departments:       input.departments,
    workDays:          input.workDays,
  };
  return entry;
}

export async function toggleScheduleActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase!
    .from('schedules')
    .update({ is_active: isActive })
    .eq('id', id);
  if (error) throw error;
}

// A real hard delete — safe because the caller (ShiftsSettingsTab) only
// enables this when the shift has zero current assignments. `employee_schedules`
// has `schedule_id ... ON DELETE CASCADE`, so deleting a shift that still had
// assignments would silently wipe their assignment history, not just
// unassign them — that's why this isn't exposed for in-use shifts.
export async function deleteSchedule(id: string): Promise<void> {
  const { error } = await supabase!.from('schedules').delete().eq('id', id);
  if (error) throw error;
}

// ── Schedule Assignments ───────────────────────────────────────────────────────

export async function getScheduleAssignments(): Promise<ScheduleAssignmentEntry[]> {
  const orgId = await getAuthOrgId();
  const { data, error } = await supabase!
    .from('employee_schedules')
    .select('id, employee_id, schedule_id')
    .eq('organization_id', orgId)
    .eq('is_current', true);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id:         row.id,
    employeeId: row.employee_id,
    scheduleId: row.schedule_id,
    workDays:   ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
  }));
}

export async function updateScheduleAssignments(
  scheduleId: string,
  employeeIds: string[],
): Promise<void> {
  const orgId = await getAuthOrgId();
  const today = new Date().toISOString().slice(0, 10);

  // End current assignments for this schedule
  await supabase!
    .from('employee_schedules')
    .update({ is_current: false, end_date: today })
    .eq('schedule_id', scheduleId)
    .eq('organization_id', orgId)
    .eq('is_current', true);

  if (employeeIds.length === 0) return;

  // Upsert new assignments
  const rows = employeeIds.map((empId) => ({
    employee_id:    empId,
    organization_id: orgId,
    schedule_id:    scheduleId,
    effective_date: today,
    is_current:     true,
  }));
  const { error } = await supabase!.from('employee_schedules').insert(rows);
  if (error) throw error;
}

// ── Holidays ─────────────────────────────────────────────────────────────────
// Real `holidays` table only — the mock JSON this replaced only had 2023
// dates and was never wired to anything. See FRONTEND_IMPLEMENTATION.md
// Phase F7: shared-utils' PH_HOLIDAYS_2026 is also missing (only has
// 2024/2025), so callers should expect this to be empty until real 2026
// dates are seeded — an honest empty state, not a bug.

export interface HolidayEntry {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  type: 'regular_holiday' | 'special_non_working' | 'special_working' | 'company';
  isNationwide: boolean;
}

export async function getHolidays(year: number): Promise<HolidayEntry[]> {
  if (!isSupabaseConfigured || !supabase) return [];

  const orgId = await getAuthOrgId();
  const { data, error } = await supabase
    .from('holidays')
    .select('id, name, date, type, is_nationwide, organization_id')
    .or(`organization_id.eq.${orgId},organization_id.is.null`)
    .gte('date', `${year}-01-01`)
    .lte('date', `${year}-12-31`)
    .order('date');
  if (error) throw error;

  return (data ?? []).map((h) => ({
    id: h.id,
    name: h.name,
    date: h.date,
    type: h.type as HolidayEntry['type'],
    isNationwide: h.is_nationwide,
  }));
}

// ── Local helper ───────────────────────────────────────────────────────────────

function calcWorkHoursFromTimes(start: string, end: string, breakMins: number): number {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let startMins = sh * 60 + sm;
  let endMins   = eh * 60 + em;
  if (endMins <= startMins) endMins += 24 * 60;
  const total = (endMins - startMins - breakMins) / 60;
  return Math.max(0, parseFloat(total.toFixed(1)));
}
