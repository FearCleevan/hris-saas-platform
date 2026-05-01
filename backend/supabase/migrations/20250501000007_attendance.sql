-- ══════════════════════════════════════════════════════════════════
-- Migration: Attendance System
-- Phase 4
-- ══════════════════════════════════════════════════════════════════

-- ── Shift Schedules ────────────────────────────────────────────────
CREATE TABLE public.schedules (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name            TEXT        NOT NULL,
  code            TEXT        NOT NULL,
  shift_start     TIME        NOT NULL,
  shift_end       TIME        NOT NULL,
  break_minutes   INT         NOT NULL DEFAULT 60,
  work_hours      NUMERIC(4,2) NOT NULL DEFAULT 8,
  is_night_shift  BOOLEAN     NOT NULL DEFAULT false,
  is_flexible     BOOLEAN     NOT NULL DEFAULT false,
  grace_period_minutes INT    NOT NULL DEFAULT 15,
  is_active       BOOLEAN     NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, code)
);

CREATE TRIGGER set_schedules_updated_at
  BEFORE UPDATE ON public.schedules
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── Employee Schedule Assignments ──────────────────────────────────
CREATE TABLE public.employee_schedules (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id     UUID    NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  organization_id UUID    NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  schedule_id     UUID    NOT NULL REFERENCES public.schedules(id) ON DELETE CASCADE,
  effective_date  DATE    NOT NULL,
  end_date        DATE,
  is_current      BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Philippine Holidays ────────────────────────────────────────────
CREATE TABLE public.holidays (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID    REFERENCES public.organizations(id) ON DELETE CASCADE,
  name            TEXT    NOT NULL,
  date            DATE    NOT NULL,
  type            TEXT    NOT NULL
                          CHECK (type IN ('regular_holiday', 'special_non_working', 'special_working', 'company')),
  is_nationwide   BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, date, type)
);

-- ── Attendance Logs ────────────────────────────────────────────────
CREATE TABLE public.attendance_logs (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id      UUID        NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  organization_id  UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  schedule_id      UUID        REFERENCES public.schedules(id) ON DELETE SET NULL,
  log_date         DATE        NOT NULL,
  time_in          TIMESTAMPTZ,
  time_out         TIMESTAMPTZ,
  break_in         TIMESTAMPTZ,
  break_out        TIMESTAMPTZ,
  hours_worked     NUMERIC(5,2),
  overtime_hours   NUMERIC(5,2) NOT NULL DEFAULT 0,
  late_minutes     INT          NOT NULL DEFAULT 0,
  undertime_minutes INT         NOT NULL DEFAULT 0,
  status           TEXT         NOT NULL DEFAULT 'present'
                                CHECK (status IN ('present', 'absent', 'late', 'half_day', 'on_leave', 'holiday', 'rest_day', 'work_from_home')),
  source           TEXT         NOT NULL DEFAULT 'manual'
                                CHECK (source IN ('biometric', 'mobile', 'web', 'manual')),
  location_lat     NUMERIC(10,7),
  location_lng     NUMERIC(10,7),
  selfie_url       TEXT,
  notes            TEXT,
  is_corrected     BOOLEAN      NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (employee_id, log_date)
);

CREATE TRIGGER set_attendance_logs_updated_at
  BEFORE UPDATE ON public.attendance_logs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── Overtime Requests ──────────────────────────────────────────────
CREATE TABLE public.overtime_requests (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id     UUID        NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  organization_id UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  request_date    DATE        NOT NULL,
  ot_start        TIMESTAMPTZ NOT NULL,
  ot_end          TIMESTAMPTZ NOT NULL,
  ot_hours        NUMERIC(4,2),
  ot_type         TEXT        NOT NULL DEFAULT 'regular'
                              CHECK (ot_type IN ('regular', 'rest_day', 'regular_holiday', 'special_non_working', 'night_differential')),
  reason          TEXT        NOT NULL,
  status          TEXT        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  approved_by     UUID        REFERENCES auth.users(id),
  approved_at     TIMESTAMPTZ,
  remarks         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_overtime_requests_updated_at
  BEFORE UPDATE ON public.overtime_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── Attendance Corrections ─────────────────────────────────────────
CREATE TABLE public.attendance_corrections (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_log_id UUID        NOT NULL REFERENCES public.attendance_logs(id) ON DELETE CASCADE,
  employee_id       UUID        NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  organization_id   UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  correction_type   TEXT        NOT NULL
                                CHECK (correction_type IN ('time_in', 'time_out', 'break_in', 'break_out', 'status', 'hours')),
  original_value    TEXT,
  corrected_value   TEXT        NOT NULL,
  reason            TEXT        NOT NULL,
  status            TEXT        NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by       UUID        REFERENCES auth.users(id),
  approved_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_attendance_corrections_updated_at
  BEFORE UPDATE ON public.attendance_corrections
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── Indexes ────────────────────────────────────────────────────────
CREATE INDEX idx_attendance_logs_emp_date   ON public.attendance_logs (employee_id, log_date);
CREATE INDEX idx_attendance_logs_org_date   ON public.attendance_logs (organization_id, log_date);
CREATE INDEX idx_overtime_requests_emp      ON public.overtime_requests (employee_id);
CREATE INDEX idx_employee_schedules_emp     ON public.employee_schedules (employee_id);
CREATE INDEX idx_holidays_date              ON public.holidays (date);

-- ── Seed PH Holidays 2025 ─────────────────────────────────────────
INSERT INTO public.holidays (name, date, type, is_nationwide) VALUES
  ('New Year''s Day',                      '2025-01-01', 'regular_holiday',      true),
  ('Chinese New Year',                     '2025-01-29', 'special_non_working',  true),
  ('People Power Anniversary',             '2025-02-25', 'special_non_working',  true),
  ('Maundy Thursday',                      '2025-04-17', 'regular_holiday',      true),
  ('Good Friday',                          '2025-04-18', 'regular_holiday',      true),
  ('Black Saturday',                       '2025-04-19', 'special_non_working',  true),
  ('Araw ng Kagitingan',                   '2025-04-09', 'regular_holiday',      true),
  ('Labor Day',                            '2025-05-01', 'regular_holiday',      true),
  ('Independence Day',                     '2025-06-12', 'regular_holiday',      true),
  ('Eid''l Fitr',                          '2025-03-31', 'regular_holiday',      true),
  ('Eid''l Adha',                          '2025-06-07', 'regular_holiday',      true),
  ('Ninoy Aquino Day',                     '2025-08-21', 'special_non_working',  true),
  ('National Heroes Day',                  '2025-08-25', 'regular_holiday',      true),
  ('All Saints'' Day',                     '2025-11-01', 'special_non_working',  true),
  ('All Souls'' Day',                      '2025-11-02', 'special_non_working',  true),
  ('Bonifacio Day',                        '2025-11-30', 'regular_holiday',      true),
  ('Feast of the Immaculate Conception',   '2025-12-08', 'special_non_working',  true),
  ('Christmas Eve',                        '2025-12-24', 'special_non_working',  true),
  ('Christmas Day',                        '2025-12-25', 'regular_holiday',      true),
  ('Rizal Day',                            '2025-12-30', 'regular_holiday',      true),
  ('New Year''s Eve',                      '2025-12-31', 'special_non_working',  true)
ON CONFLICT (organization_id, date, type) DO NOTHING;

-- ══════════════════════════════════════════════════════════════════
-- RLS Policies
-- ══════════════════════════════════════════════════════════════════

ALTER TABLE public.schedules               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_schedules      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holidays                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_logs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.overtime_requests       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_corrections  ENABLE ROW LEVEL SECURITY;

-- Org-scoped reads
CREATE POLICY "org_select_schedules"          ON public.schedules          FOR SELECT TO authenticated USING (organization_id = get_my_org_id());
CREATE POLICY "org_select_emp_schedules"      ON public.employee_schedules FOR SELECT TO authenticated USING (organization_id = get_my_org_id());
CREATE POLICY "org_select_holidays"           ON public.holidays           FOR SELECT TO authenticated USING (organization_id = get_my_org_id() OR organization_id IS NULL);
CREATE POLICY "org_select_attendance"         ON public.attendance_logs    FOR SELECT TO authenticated USING (organization_id = get_my_org_id());
CREATE POLICY "org_select_overtime"           ON public.overtime_requests  FOR SELECT TO authenticated USING (organization_id = get_my_org_id());
CREATE POLICY "org_select_corrections"        ON public.attendance_corrections FOR SELECT TO authenticated USING (organization_id = get_my_org_id());

-- Admin/HR write access
CREATE POLICY "admin_write_schedules"         ON public.schedules          FOR ALL TO authenticated USING (organization_id = get_my_org_id() AND is_admin()) WITH CHECK (organization_id = get_my_org_id());
CREATE POLICY "admin_write_emp_schedules"     ON public.employee_schedules FOR ALL TO authenticated USING (organization_id = get_my_org_id() AND is_admin()) WITH CHECK (organization_id = get_my_org_id());
CREATE POLICY "admin_write_holidays"          ON public.holidays           FOR ALL TO authenticated USING (organization_id = get_my_org_id() AND is_admin()) WITH CHECK (organization_id = get_my_org_id());
CREATE POLICY "admin_write_attendance"        ON public.attendance_logs    FOR ALL TO authenticated USING (organization_id = get_my_org_id() AND is_admin()) WITH CHECK (organization_id = get_my_org_id());
CREATE POLICY "admin_write_overtime"          ON public.overtime_requests  FOR ALL TO authenticated USING (organization_id = get_my_org_id() AND is_admin()) WITH CHECK (organization_id = get_my_org_id());
CREATE POLICY "admin_write_corrections"       ON public.attendance_corrections FOR ALL TO authenticated USING (organization_id = get_my_org_id() AND is_admin()) WITH CHECK (organization_id = get_my_org_id());

-- Employees can view and insert their own records
CREATE POLICY "self_select_attendance"        ON public.attendance_logs    FOR SELECT TO authenticated USING (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));
CREATE POLICY "self_insert_attendance"        ON public.attendance_logs    FOR INSERT TO authenticated WITH CHECK (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));
CREATE POLICY "self_select_overtime"          ON public.overtime_requests  FOR SELECT TO authenticated USING (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));
CREATE POLICY "self_insert_overtime"          ON public.overtime_requests  FOR INSERT TO authenticated WITH CHECK (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));
CREATE POLICY "self_insert_corrections"       ON public.attendance_corrections FOR INSERT TO authenticated WITH CHECK (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));
