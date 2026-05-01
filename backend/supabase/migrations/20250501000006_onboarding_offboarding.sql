-- ══════════════════════════════════════════════════════════════════
-- Migration: Onboarding & Offboarding
-- Phase 3
-- ══════════════════════════════════════════════════════════════════

-- ── Onboarding Workflow Templates ─────────────────────────────────
CREATE TABLE public.onboarding_workflows (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name            TEXT        NOT NULL,
  description     TEXT,
  department_id   UUID        REFERENCES public.departments(id) ON DELETE SET NULL,
  position_id     UUID        REFERENCES public.positions(id) ON DELETE SET NULL,
  is_default      BOOLEAN     NOT NULL DEFAULT false,
  is_active       BOOLEAN     NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_onboarding_workflows_updated_at
  BEFORE UPDATE ON public.onboarding_workflows
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── Onboarding Task Templates ──────────────────────────────────────
CREATE TABLE public.onboarding_tasks (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id     UUID    NOT NULL REFERENCES public.onboarding_workflows(id) ON DELETE CASCADE,
  organization_id UUID    NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title           TEXT    NOT NULL,
  description     TEXT,
  category        TEXT    NOT NULL DEFAULT 'general'
                          CHECK (category IN ('documents', 'it_setup', 'orientation', 'training', 'compliance', 'general')),
  assigned_to_role TEXT,
  due_days_after_hire INT NOT NULL DEFAULT 1,
  is_required     BOOLEAN NOT NULL DEFAULT true,
  sort_order      INT     NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Onboarding Progress (per employee) ────────────────────────────
CREATE TABLE public.onboarding_progress (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id     UUID        NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  organization_id UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  workflow_id     UUID        NOT NULL REFERENCES public.onboarding_workflows(id) ON DELETE CASCADE,
  task_id         UUID        NOT NULL REFERENCES public.onboarding_tasks(id) ON DELETE CASCADE,
  status          TEXT        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
  due_date        DATE,
  completed_at    TIMESTAMPTZ,
  completed_by    UUID        REFERENCES auth.users(id),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (employee_id, task_id)
);

CREATE TRIGGER set_onboarding_progress_updated_at
  BEFORE UPDATE ON public.onboarding_progress
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── Offboarding Checklists ─────────────────────────────────────────
CREATE TABLE public.offboarding_checklists (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID    NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name            TEXT    NOT NULL,
  description     TEXT,
  is_default      BOOLEAN NOT NULL DEFAULT false,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_offboarding_checklists_updated_at
  BEFORE UPDATE ON public.offboarding_checklists
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── Clearance Items (IT, HR, Finance, Admin) ───────────────────────
CREATE TABLE public.clearance_items (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id    UUID    NOT NULL REFERENCES public.offboarding_checklists(id) ON DELETE CASCADE,
  organization_id UUID    NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title           TEXT    NOT NULL,
  description     TEXT,
  department      TEXT    NOT NULL DEFAULT 'hr'
                          CHECK (department IN ('hr', 'it', 'finance', 'admin', 'operations', 'general')),
  is_required     BOOLEAN NOT NULL DEFAULT true,
  sort_order      INT     NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Offboarding Records (per employee) ────────────────────────────
CREATE TABLE public.offboarding_records (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id       UUID        NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  organization_id   UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  checklist_id      UUID        REFERENCES public.offboarding_checklists(id) ON DELETE SET NULL,
  separation_type   TEXT        NOT NULL
                                CHECK (separation_type IN ('resignation', 'termination', 'retirement', 'end_of_contract', 'redundancy', 'death')),
  last_day_of_work  DATE        NOT NULL,
  clearance_status  TEXT        NOT NULL DEFAULT 'pending'
                                CHECK (clearance_status IN ('pending', 'in_progress', 'cleared', 'held')),
  final_pay_status  TEXT        NOT NULL DEFAULT 'pending'
                                CHECK (final_pay_status IN ('pending', 'computed', 'approved', 'released')),
  final_pay_amount  NUMERIC(12,2),
  final_pay_date    DATE,
  notes             TEXT,
  initiated_by      UUID        REFERENCES auth.users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_offboarding_records_updated_at
  BEFORE UPDATE ON public.offboarding_records
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── Clearance Progress (per employee per item) ─────────────────────
CREATE TABLE public.clearance_progress (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  offboarding_id      UUID        NOT NULL REFERENCES public.offboarding_records(id) ON DELETE CASCADE,
  clearance_item_id   UUID        NOT NULL REFERENCES public.clearance_items(id) ON DELETE CASCADE,
  organization_id     UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  status              TEXT        NOT NULL DEFAULT 'pending'
                                  CHECK (status IN ('pending', 'cleared', 'held')),
  cleared_by          UUID        REFERENCES auth.users(id),
  cleared_at          TIMESTAMPTZ,
  remarks             TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (offboarding_id, clearance_item_id)
);

CREATE TRIGGER set_clearance_progress_updated_at
  BEFORE UPDATE ON public.clearance_progress
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── Exit Interviews ────────────────────────────────────────────────
CREATE TABLE public.exit_interviews (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id       UUID        NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  offboarding_id    UUID        NOT NULL REFERENCES public.offboarding_records(id) ON DELETE CASCADE,
  organization_id   UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  scheduled_at      TIMESTAMPTZ,
  conducted_at      TIMESTAMPTZ,
  conducted_by      UUID        REFERENCES auth.users(id),
  primary_reason    TEXT,
  would_recommend   BOOLEAN,
  satisfaction_score INT        CHECK (satisfaction_score BETWEEN 1 AND 10),
  feedback          TEXT,
  is_confidential   BOOLEAN     NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_exit_interviews_updated_at
  BEFORE UPDATE ON public.exit_interviews
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── Indexes ────────────────────────────────────────────────────────
CREATE INDEX idx_onboarding_progress_emp  ON public.onboarding_progress (employee_id);
CREATE INDEX idx_offboarding_records_emp  ON public.offboarding_records (employee_id);
CREATE INDEX idx_clearance_progress_off   ON public.clearance_progress (offboarding_id);

-- ══════════════════════════════════════════════════════════════════
-- RLS Policies
-- ══════════════════════════════════════════════════════════════════

ALTER TABLE public.onboarding_workflows    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_tasks        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_progress     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offboarding_checklists  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clearance_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offboarding_records     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clearance_progress      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exit_interviews         ENABLE ROW LEVEL SECURITY;

-- Org-scoped read for authenticated users
CREATE POLICY "org_select_onboarding_workflows"   ON public.onboarding_workflows   FOR SELECT TO authenticated USING (organization_id = get_my_org_id());
CREATE POLICY "org_select_onboarding_tasks"       ON public.onboarding_tasks       FOR SELECT TO authenticated USING (organization_id = get_my_org_id());
CREATE POLICY "org_select_onboarding_progress"    ON public.onboarding_progress    FOR SELECT TO authenticated USING (organization_id = get_my_org_id());
CREATE POLICY "org_select_offboarding_checklists" ON public.offboarding_checklists FOR SELECT TO authenticated USING (organization_id = get_my_org_id());
CREATE POLICY "org_select_clearance_items"        ON public.clearance_items        FOR SELECT TO authenticated USING (organization_id = get_my_org_id());
CREATE POLICY "org_select_offboarding_records"    ON public.offboarding_records    FOR SELECT TO authenticated USING (organization_id = get_my_org_id());
CREATE POLICY "org_select_clearance_progress"     ON public.clearance_progress     FOR SELECT TO authenticated USING (organization_id = get_my_org_id());
CREATE POLICY "org_select_exit_interviews"        ON public.exit_interviews        FOR SELECT TO authenticated USING (organization_id = get_my_org_id());

-- Admins/HR write access
CREATE POLICY "admin_write_onboarding_workflows"   ON public.onboarding_workflows   FOR ALL TO authenticated USING (organization_id = get_my_org_id() AND is_admin()) WITH CHECK (organization_id = get_my_org_id());
CREATE POLICY "admin_write_onboarding_tasks"       ON public.onboarding_tasks       FOR ALL TO authenticated USING (organization_id = get_my_org_id() AND is_admin()) WITH CHECK (organization_id = get_my_org_id());
CREATE POLICY "admin_write_onboarding_progress"    ON public.onboarding_progress    FOR ALL TO authenticated USING (organization_id = get_my_org_id() AND is_admin()) WITH CHECK (organization_id = get_my_org_id());
CREATE POLICY "admin_write_offboarding_checklists" ON public.offboarding_checklists FOR ALL TO authenticated USING (organization_id = get_my_org_id() AND is_admin()) WITH CHECK (organization_id = get_my_org_id());
CREATE POLICY "admin_write_clearance_items"        ON public.clearance_items        FOR ALL TO authenticated USING (organization_id = get_my_org_id() AND is_admin()) WITH CHECK (organization_id = get_my_org_id());
CREATE POLICY "admin_write_offboarding_records"    ON public.offboarding_records    FOR ALL TO authenticated USING (organization_id = get_my_org_id() AND is_admin()) WITH CHECK (organization_id = get_my_org_id());
CREATE POLICY "admin_write_clearance_progress"     ON public.clearance_progress     FOR ALL TO authenticated USING (organization_id = get_my_org_id() AND is_admin()) WITH CHECK (organization_id = get_my_org_id());
CREATE POLICY "admin_write_exit_interviews"        ON public.exit_interviews        FOR ALL TO authenticated USING (organization_id = get_my_org_id() AND is_admin()) WITH CHECK (organization_id = get_my_org_id());
