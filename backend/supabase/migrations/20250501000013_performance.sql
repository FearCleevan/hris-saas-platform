-- ══════════════════════════════════════════════════════════════════
-- Migration: Performance Reviews
-- Phase 10
-- ══════════════════════════════════════════════════════════════════

-- ── Review Cycles ──────────────────────────────────────────────────
CREATE TABLE public.review_cycles (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID    NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name            TEXT    NOT NULL,
  type            TEXT    NOT NULL
                          CHECK (type IN ('annual', 'semi_annual', 'quarterly', 'probationary', 'ad_hoc')),
  period_start    DATE    NOT NULL,
  period_end      DATE    NOT NULL,
  review_due_date DATE    NOT NULL,
  status          TEXT    NOT NULL DEFAULT 'draft'
                          CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
  instructions    TEXT,
  created_by      UUID    NOT NULL REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_review_cycles_updated_at
  BEFORE UPDATE ON public.review_cycles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── KPI / Competency Templates ─────────────────────────────────────
CREATE TABLE public.review_templates (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID    NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name            TEXT    NOT NULL,
  description     TEXT,
  is_default      BOOLEAN NOT NULL DEFAULT false,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_review_templates_updated_at
  BEFORE UPDATE ON public.review_templates
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── Review Criteria (KPIs / Competencies) ─────────────────────────
CREATE TABLE public.review_criteria (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id     UUID         NOT NULL REFERENCES public.review_templates(id) ON DELETE CASCADE,
  organization_id UUID         NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  category        TEXT         NOT NULL
                               CHECK (category IN ('kpi', 'competency', 'values', 'goals')),
  name            TEXT         NOT NULL,
  description     TEXT,
  weight          NUMERIC(5,2) NOT NULL DEFAULT 0,
  max_score       INT          NOT NULL DEFAULT 5,
  sort_order      INT          NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Employee Reviews ───────────────────────────────────────────────
CREATE TABLE public.employee_reviews (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id        UUID         NOT NULL REFERENCES public.review_cycles(id) ON DELETE CASCADE,
  organization_id UUID         NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  employee_id     UUID         NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  reviewer_id     UUID         NOT NULL REFERENCES auth.users(id),
  template_id     UUID         REFERENCES public.review_templates(id) ON DELETE SET NULL,
  status          TEXT         NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending', 'self_review', 'manager_review', 'calibration', 'completed', 'cancelled')),
  self_score      NUMERIC(4,2),
  manager_score   NUMERIC(4,2),
  final_score     NUMERIC(4,2),
  rating          TEXT
                  CHECK (rating IN ('exceptional', 'exceeds_expectations', 'meets_expectations', 'needs_improvement', 'unsatisfactory')),
  self_submitted_at    TIMESTAMPTZ,
  manager_submitted_at TIMESTAMPTZ,
  completed_at         TIMESTAMPTZ,
  remarks              TEXT,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (cycle_id, employee_id)
);

CREATE TRIGGER set_employee_reviews_updated_at
  BEFORE UPDATE ON public.employee_reviews
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── Review Scores (per criterion) ─────────────────────────────────
CREATE TABLE public.review_scores (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id       UUID         NOT NULL REFERENCES public.employee_reviews(id) ON DELETE CASCADE,
  criteria_id     UUID         NOT NULL REFERENCES public.review_criteria(id) ON DELETE CASCADE,
  organization_id UUID         NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  self_score      NUMERIC(4,2),
  manager_score   NUMERIC(4,2),
  self_comments   TEXT,
  manager_comments TEXT,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (review_id, criteria_id)
);

CREATE TRIGGER set_review_scores_updated_at
  BEFORE UPDATE ON public.review_scores
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── Goals / OKRs ───────────────────────────────────────────────────
CREATE TABLE public.employee_goals (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID         NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  employee_id     UUID         NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  cycle_id        UUID         REFERENCES public.review_cycles(id) ON DELETE SET NULL,
  title           TEXT         NOT NULL,
  description     TEXT,
  target_date     DATE,
  progress        INT          NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  status          TEXT         NOT NULL DEFAULT 'active'
                               CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
  priority        TEXT         NOT NULL DEFAULT 'medium'
                               CHECK (priority IN ('low', 'medium', 'high')),
  created_by      UUID         NOT NULL REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_employee_goals_updated_at
  BEFORE UPDATE ON public.employee_goals
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── Performance Improvement Plans (PIPs) ──────────────────────────
CREATE TABLE public.improvement_plans (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID    NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  employee_id     UUID    NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  review_id       UUID    REFERENCES public.employee_reviews(id) ON DELETE SET NULL,
  title           TEXT    NOT NULL,
  reason          TEXT    NOT NULL,
  objectives      TEXT    NOT NULL,
  support_provided TEXT,
  start_date      DATE    NOT NULL,
  end_date        DATE    NOT NULL,
  status          TEXT    NOT NULL DEFAULT 'active'
                          CHECK (status IN ('draft', 'active', 'completed', 'extended', 'terminated')),
  outcome         TEXT    CHECK (outcome IN ('successful', 'unsuccessful', 'extended')),
  created_by      UUID    NOT NULL REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_improvement_plans_updated_at
  BEFORE UPDATE ON public.improvement_plans
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── Indexes ────────────────────────────────────────────────────────
CREATE INDEX idx_review_cycles_org       ON public.review_cycles (organization_id, status);
CREATE INDEX idx_employee_reviews_cycle  ON public.employee_reviews (cycle_id);
CREATE INDEX idx_employee_reviews_emp    ON public.employee_reviews (employee_id);
CREATE INDEX idx_review_scores_review    ON public.review_scores (review_id);
CREATE INDEX idx_employee_goals_emp      ON public.employee_goals (employee_id, status);
CREATE INDEX idx_improvement_plans_emp   ON public.improvement_plans (employee_id);

-- ══════════════════════════════════════════════════════════════════
-- RLS Policies
-- ══════════════════════════════════════════════════════════════════

ALTER TABLE public.review_cycles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_templates    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_criteria     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_reviews    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_scores       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_goals      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.improvement_plans   ENABLE ROW LEVEL SECURITY;

-- Org-scoped reads
CREATE POLICY "org_select_review_cycles"    ON public.review_cycles     FOR SELECT TO authenticated USING (organization_id = get_my_org_id());
CREATE POLICY "org_select_review_templates" ON public.review_templates  FOR SELECT TO authenticated USING (organization_id = get_my_org_id());
CREATE POLICY "org_select_review_criteria"  ON public.review_criteria   FOR SELECT TO authenticated USING (organization_id = get_my_org_id());
CREATE POLICY "org_select_employee_reviews" ON public.employee_reviews  FOR SELECT TO authenticated USING (organization_id = get_my_org_id());
CREATE POLICY "org_select_review_scores"    ON public.review_scores     FOR SELECT TO authenticated USING (organization_id = get_my_org_id());
CREATE POLICY "org_select_employee_goals"   ON public.employee_goals    FOR SELECT TO authenticated USING (organization_id = get_my_org_id());
CREATE POLICY "org_select_improvement_plans" ON public.improvement_plans FOR SELECT TO authenticated USING (organization_id = get_my_org_id());

-- Admin write access
CREATE POLICY "admin_write_review_cycles"    ON public.review_cycles     FOR ALL TO authenticated USING (organization_id = get_my_org_id() AND is_admin()) WITH CHECK (organization_id = get_my_org_id());
CREATE POLICY "admin_write_review_templates" ON public.review_templates  FOR ALL TO authenticated USING (organization_id = get_my_org_id() AND is_admin()) WITH CHECK (organization_id = get_my_org_id());
CREATE POLICY "admin_write_review_criteria"  ON public.review_criteria   FOR ALL TO authenticated USING (organization_id = get_my_org_id() AND is_admin()) WITH CHECK (organization_id = get_my_org_id());
CREATE POLICY "admin_write_employee_reviews" ON public.employee_reviews  FOR ALL TO authenticated USING (organization_id = get_my_org_id() AND is_admin()) WITH CHECK (organization_id = get_my_org_id());
CREATE POLICY "admin_write_review_scores"    ON public.review_scores     FOR ALL TO authenticated USING (organization_id = get_my_org_id() AND is_admin()) WITH CHECK (organization_id = get_my_org_id());
CREATE POLICY "admin_write_employee_goals"   ON public.employee_goals    FOR ALL TO authenticated USING (organization_id = get_my_org_id() AND is_admin()) WITH CHECK (organization_id = get_my_org_id());
CREATE POLICY "admin_write_improvement_plans" ON public.improvement_plans FOR ALL TO authenticated USING (organization_id = get_my_org_id() AND is_admin()) WITH CHECK (organization_id = get_my_org_id());

-- Employees: view and submit their own review (self-assessment) and goals
CREATE POLICY "self_select_employee_review"  ON public.employee_reviews FOR SELECT TO authenticated
  USING (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));

CREATE POLICY "self_update_employee_review"  ON public.employee_reviews FOR UPDATE TO authenticated
  USING (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()) AND status = 'self_review')
  WITH CHECK (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));

CREATE POLICY "self_select_review_scores"    ON public.review_scores    FOR SELECT TO authenticated
  USING (review_id IN (SELECT id FROM public.employee_reviews WHERE employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())));

CREATE POLICY "self_upsert_review_scores"    ON public.review_scores    FOR INSERT TO authenticated
  WITH CHECK (review_id IN (SELECT id FROM public.employee_reviews WHERE employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()) AND status = 'self_review'));

CREATE POLICY "self_select_employee_goals"   ON public.employee_goals   FOR SELECT TO authenticated
  USING (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));

CREATE POLICY "self_insert_employee_goal"    ON public.employee_goals   FOR INSERT TO authenticated
  WITH CHECK (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));

CREATE POLICY "self_update_employee_goal"    ON public.employee_goals   FOR UPDATE TO authenticated
  USING (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()))
  WITH CHECK (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));

CREATE POLICY "self_select_improvement_plan" ON public.improvement_plans FOR SELECT TO authenticated
  USING (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));
