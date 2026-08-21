-- ══════════════════════════════════════════════════════════════════
-- Migration: Schedule color/departments/work_days columns
-- Backend Phase B2 (CRUD_FIXES_BACKEND_IMPLEMENTATION.md)
--
-- Fixes: services/attendance.ts's createSchedule/updateSchedule have
-- always let admins pick color/departments/workDays, but public.schedules
-- has no matching columns — every save silently discards them and they
-- revert to arbitrary defaults on next refetch.
--
-- No RLS change needed — admin_write_schedules already covers
-- UPDATE/INSERT on the whole row via FOR ALL. `departments` stores
-- department names (matching the existing frontend
-- ScheduleEntry.departments: string[] shape), not a normalized FK
-- array — consistent with what the UI has always assumed.
-- ══════════════════════════════════════════════════════════════════

ALTER TABLE public.schedules
  ADD COLUMN IF NOT EXISTS color TEXT NOT NULL DEFAULT '#0038a8',
  ADD COLUMN IF NOT EXISTS departments TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS work_days TEXT[] NOT NULL DEFAULT '{Mon,Tue,Wed,Thu,Fri}';
