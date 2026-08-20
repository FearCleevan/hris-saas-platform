import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { isSupabaseConfigured } from '@/lib/supabase';
import {
  getAttendanceLogsByDate,
  getMonthlyAttendanceSummary,
  getAttendanceLogsForReports,
  getOvertimeRequests,
  approveOvertimeRequest,
  rejectOvertimeRequest,
  getSchedules,
  createSchedule,
  updateSchedule,
  toggleScheduleActive,
  getScheduleAssignments,
  updateScheduleAssignments,
  deleteSchedule,
  getHolidays,
  type AttendanceLogEntry,
  type OvertimeRequestEntry,
  type ScheduleEntry,
  type ScheduleAssignmentEntry,
  type MonthlyDateMap,
  type CreateScheduleInput,
  type UpdateScheduleInput,
  type HolidayEntry,
} from '@/services/attendance';
import attendanceLogsRaw from '@/data/mock/attendance-logs.json';
import overtimeRequestsRaw from '@/data/mock/overtime-requests.json';
import shiftsRaw from '@/data/mock/shifts.json';
import shiftAssignmentsRaw from '@/data/mock/shift-assignments.json';
import employeesRaw from '@/data/mock/employees.json';

// ── Mock adapters ─────────────────────────────────────────────────────────────

function mockLogs(date: string): AttendanceLogEntry[] {
  return (attendanceLogsRaw as any[])
    .filter((l) => l.date === date)
    .map((l) => {
      const emp = (employeesRaw as any[]).find((e) => e.id === l.employeeId);
      return {
        id:           l.id,
        employeeId:   l.employeeId,
        employeeName: emp?.name ?? l.employeeId,
        position:     emp?.position ?? '',
        department:   emp?.department ?? '',
        avatarUrl:    emp?.avatar ?? null,
        date:         l.date,
        timeIn:       l.timeIn,
        timeOut:      l.timeOut,
        workHours:    l.workHours,
        lateMinutes:  l.lateMinutes,
        overtimeHours: l.overtimeHours,
        status:       l.status,
        source:       l.source,
        locationLat:  null,
        locationLng:  null,
        isCorrected:  false,
        notes:        null,
      } satisfies AttendanceLogEntry;
    });
}

function mockMonthlyMap(year: number, month: number): MonthlyDateMap {
  const map: MonthlyDateMap = {};
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  for (const l of attendanceLogsRaw as any[]) {
    if (!l.date.startsWith(prefix)) continue;
    if (!map[l.date]) map[l.date] = { present: 0, late: 0, halfDay: 0, total: 0 };
    map[l.date].total++;
    if (l.status === 'present')  map[l.date].present++;
    if (l.status === 'late')     map[l.date].late++;
    if (l.status === 'half_day') map[l.date].halfDay++;
  }
  return map;
}

function mockLogsForReports(): AttendanceLogEntry[] {
  return (attendanceLogsRaw as any[]).map((l) => {
    const emp = (employeesRaw as any[]).find((e) => e.id === l.employeeId);
    return {
      id:           l.id,
      employeeId:   l.employeeId,
      employeeName: emp?.name ?? l.employeeId,
      position:     emp?.position ?? '',
      department:   emp?.department ?? '',
      avatarUrl:    emp?.avatar ?? null,
      date:         l.date,
      timeIn:       l.timeIn,
      timeOut:      l.timeOut,
      workHours:    l.workHours,
      lateMinutes:  l.lateMinutes,
      overtimeHours: l.overtimeHours,
      status:       l.status,
      source:       l.source,
      locationLat:  null,
      locationLng:  null,
      isCorrected:  false,
      notes:        null,
    } satisfies AttendanceLogEntry;
  });
}

function mockOT(): OvertimeRequestEntry[] {
  return (overtimeRequestsRaw as any[]).map((r) => {
    const emp = (employeesRaw as any[]).find((e) => e.id === r.employeeId);
    const approver = (employeesRaw as any[]).find((e) => e.id === r.approvedBy);
    return {
      id:              r.id,
      employeeId:      r.employeeId,
      employeeName:    emp?.name ?? r.employeeId,
      position:        emp?.position ?? '',
      department:      emp?.department ?? '',
      date:            r.date,
      startTime:       r.startTime,
      endTime:         r.endTime,
      hours:           r.hours,
      reason:          r.reason,
      type:            r.type,
      status:          r.status,
      approvedByName:  approver?.name ?? null,
      approvedAt:      r.approvedAt ?? null,
      remarks:         r.remarks ?? null,
    } satisfies OvertimeRequestEntry;
  });
}

function mockSchedules(): ScheduleEntry[] {
  return (shiftsRaw as any[]).map((s) => ({
    id:                s.id,
    name:              s.name,
    code:              s.code,
    startTime:         s.startTime,
    endTime:           s.endTime,
    breakMinutes:      s.breakMinutes,
    workHours:         s.workHours,
    gracePeriodMinutes: s.gracePeriodMinutes,
    isNightShift:      s.isNightShift ?? false,
    isFlexible:        s.isFlexible   ?? false,
    isActive:          true,
    color:             s.color,
    departments:       s.departments ?? [],
    workDays:          s.workDays    ?? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
  } satisfies ScheduleEntry));
}

function mockAssignments(): ScheduleAssignmentEntry[] {
  return (shiftAssignmentsRaw as any[]).map((a, i) => ({
    id:         `mock-assign-${i}`,
    employeeId: a.employeeId,
    scheduleId: a.shiftId,
    workDays:   a.workDays,
  } satisfies ScheduleAssignmentEntry));
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useAttendanceLogs(date: string) {
  return useQuery<AttendanceLogEntry[]>({
    queryKey:  ['attendance-logs-date', date],
    queryFn:   isSupabaseConfigured
      ? () => getAttendanceLogsByDate(date)
      : async () => mockLogs(date),
    staleTime: 1000 * 60 * 2,
    enabled:   !!date,
  });
}

export function useMonthlyAttendanceSummary(year: number, month: number) {
  return useQuery<MonthlyDateMap>({
    queryKey:  ['attendance-monthly', year, month],
    queryFn:   isSupabaseConfigured
      ? () => getMonthlyAttendanceSummary(year, month)
      : async () => mockMonthlyMap(year, month),
    staleTime: 1000 * 60 * 5,
  });
}

export function useAttendanceLogsForReports(startDate: string, endDate: string) {
  return useQuery<AttendanceLogEntry[]>({
    queryKey:  ['attendance-reports', startDate, endDate],
    queryFn:   isSupabaseConfigured
      ? () => getAttendanceLogsForReports(startDate, endDate)
      : async () => mockLogsForReports(),
    staleTime: 1000 * 60 * 5,
  });
}

// No mock fallback here on purpose — the old holidays mock JSON only had
// 2023 dates and was never a real source of truth. getHolidays() already
// returns [] safely when Supabase isn't configured.
export function useHolidays(year: number) {
  return useQuery<HolidayEntry[]>({
    queryKey:  ['holidays', year],
    queryFn:   () => getHolidays(year),
    staleTime: 1000 * 60 * 60,
  });
}

export function useOvertimeRequests() {
  return useQuery<OvertimeRequestEntry[]>({
    queryKey:  ['overtime-requests-admin'],
    queryFn:   isSupabaseConfigured ? getOvertimeRequests : async () => mockOT(),
    staleTime: 1000 * 60 * 2,
  });
}

export function useApproveOvertimeRequest() {
  const qc = useQueryClient();
  return useMutation<void, Error, { id: string; remarks?: string }>({
    mutationFn: ({ id, remarks }) =>
      isSupabaseConfigured
        ? approveOvertimeRequest(id, remarks)
        : Promise.resolve(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['overtime-requests-admin'] }),
  });
}

export function useRejectOvertimeRequest() {
  const qc = useQueryClient();
  return useMutation<void, Error, { id: string; remarks?: string }>({
    mutationFn: ({ id, remarks }) =>
      isSupabaseConfigured
        ? rejectOvertimeRequest(id, remarks)
        : Promise.resolve(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['overtime-requests-admin'] }),
  });
}

export function useSchedules() {
  return useQuery<ScheduleEntry[]>({
    queryKey:  ['schedules'],
    queryFn:   isSupabaseConfigured ? getSchedules : async () => mockSchedules(),
    staleTime: 1000 * 60 * 10,
  });
}

export function useCreateSchedule() {
  const qc = useQueryClient();
  return useMutation<ScheduleEntry, Error, CreateScheduleInput>({
    mutationFn: (data) =>
      isSupabaseConfigured
        ? createSchedule(data)
        : Promise.resolve({
            id:                `mock-${Date.now()}`,
            name:              data.name,
            code:              data.code,
            startTime:         data.startTime,
            endTime:           data.endTime,
            breakMinutes:      data.breakMinutes,
            workHours:         8,
            gracePeriodMinutes: data.gracePeriodMinutes,
            isNightShift:      data.isNightShift,
            isFlexible:        data.isFlexible,
            isActive:          true,
            color:             data.color,
            departments:       data.departments,
            workDays:          data.workDays,
          }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schedules'] }),
  });
}

export function useUpdateSchedule() {
  const qc = useQueryClient();
  return useMutation<ScheduleEntry, Error, { id: string } & UpdateScheduleInput>({
    mutationFn: ({ id, ...data }) =>
      isSupabaseConfigured
        ? updateSchedule(id, data)
        : Promise.resolve({
            id,
            name:              data.name,
            code:              data.code,
            startTime:         data.startTime,
            endTime:           data.endTime,
            breakMinutes:      data.breakMinutes,
            workHours:         8,
            gracePeriodMinutes: data.gracePeriodMinutes,
            isNightShift:      data.isNightShift,
            isFlexible:        data.isFlexible,
            isActive:          true,
            color:             data.color,
            departments:       data.departments,
            workDays:          data.workDays,
          }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schedules'] });
      qc.invalidateQueries({ queryKey: ['schedule-assignments'] });
    },
  });
}

export function useToggleScheduleActive() {
  const qc = useQueryClient();
  return useMutation<void, Error, { id: string; isActive: boolean }>({
    mutationFn: ({ id, isActive }) =>
      isSupabaseConfigured
        ? toggleScheduleActive(id, isActive)
        : Promise.resolve(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schedules'] }),
  });
}

export function useDeleteSchedule() {
  const qc = useQueryClient();
  return useMutation<void, Error, { id: string }>({
    mutationFn: ({ id }) => (isSupabaseConfigured ? deleteSchedule(id) : Promise.resolve()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schedules'] }),
  });
}

export function useScheduleAssignments() {
  return useQuery<ScheduleAssignmentEntry[]>({
    queryKey:  ['schedule-assignments'],
    queryFn:   isSupabaseConfigured ? getScheduleAssignments : async () => mockAssignments(),
    staleTime: 1000 * 60 * 10,
  });
}

export function useUpdateScheduleAssignments() {
  const qc = useQueryClient();
  return useMutation<void, Error, { scheduleId: string; employeeIds: string[] }>({
    mutationFn: ({ scheduleId, employeeIds }) =>
      isSupabaseConfigured
        ? updateScheduleAssignments(scheduleId, employeeIds)
        : Promise.resolve(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schedule-assignments'] }),
  });
}

// Re-export types for convenience
export type {
  AttendanceLogEntry,
  OvertimeRequestEntry,
  ScheduleEntry,
  ScheduleAssignmentEntry,
  MonthlyDateMap,
  CreateScheduleInput,
  UpdateScheduleInput,
} from '@/services/attendance';
