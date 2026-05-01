-- ══════════════════════════════════════════════════════════════════
-- Migration: Benefits & Loans
-- Phase 7
-- ══════════════════════════════════════════════════════════════════

-- ── Benefit Plans ──────────────────────────────────────────────────
CREATE TABLE public.benefits (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name            TEXT        NOT NULL,
  type            TEXT        NOT NULL
                              CHECK (type IN ('hmo', 'life_insurance', 'accident_insurance', 'dental', 'optical', 'allowance', 'other')),
  description     TEXT,
  provider        TEXT,
  coverage_amount NUMERIC(12,2),
  premium_ee      NUMERIC(10,2) NOT NULL DEFAULT 0,
  premium_er      NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_active       BOOLEAN     NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_benefits_updated_at
  BEFORE UPDATE ON public.benefits
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── HMO Plans ─────────────────────────────────────────────────────
CREATE TABLE public.hmo_plans (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  benefit_id      UUID          NOT NULL REFERENCES public.benefits(id) ON DELETE CASCADE,
  organization_id UUID          NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  plan_name       TEXT          NOT NULL,
  provider        TEXT          NOT NULL,
  mbl             NUMERIC(12,2) NOT NULL DEFAULT 0,
  room_board      TEXT,
  coverage_type   TEXT          NOT NULL DEFAULT 'individual'
                                CHECK (coverage_type IN ('individual', 'family')),
  dependents_allowed INT        NOT NULL DEFAULT 0,
  is_active       BOOLEAN       NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_hmo_plans_updated_at
  BEFORE UPDATE ON public.hmo_plans
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── Employee Benefits (enrollments) ───────────────────────────────
CREATE TABLE public.employee_benefits (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id     UUID        NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  organization_id UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  benefit_id      UUID        NOT NULL REFERENCES public.benefits(id) ON DELETE CASCADE,
  hmo_plan_id     UUID        REFERENCES public.hmo_plans(id) ON DELETE SET NULL,
  effective_date  DATE        NOT NULL,
  end_date        DATE,
  status          TEXT        NOT NULL DEFAULT 'active'
                              CHECK (status IN ('active', 'inactive', 'pending', 'cancelled')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (employee_id, benefit_id)
);

CREATE TRIGGER set_employee_benefits_updated_at
  BEFORE UPDATE ON public.employee_benefits
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── HMO Dependents ─────────────────────────────────────────────────
CREATE TABLE public.hmo_dependents (
  id                    UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_benefit_id   UUID    NOT NULL REFERENCES public.employee_benefits(id) ON DELETE CASCADE,
  employee_id           UUID    NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  organization_id       UUID    NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  first_name            TEXT    NOT NULL,
  last_name             TEXT    NOT NULL,
  relationship          TEXT    NOT NULL
                                CHECK (relationship IN ('spouse', 'child', 'parent')),
  date_of_birth         DATE,
  is_active             BOOLEAN NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Loan Applications ──────────────────────────────────────────────
CREATE TABLE public.loan_applications (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id      UUID          NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  organization_id  UUID          NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  loan_type        TEXT          NOT NULL
                                 CHECK (loan_type IN ('sss_salary', 'sss_calamity', 'pagibig_mpl', 'pagibig_calamity', 'pagibig_housing', 'company', 'emergency')),
  amount_requested NUMERIC(12,2) NOT NULL,
  term_months      INT           NOT NULL,
  purpose          TEXT          NOT NULL,
  status           TEXT          NOT NULL DEFAULT 'pending'
                                 CHECK (status IN ('pending', 'under_review', 'approved', 'rejected', 'disbursed', 'cancelled')),
  reviewed_by      UUID          REFERENCES auth.users(id),
  reviewed_at      TIMESTAMPTZ,
  approved_by      UUID          REFERENCES auth.users(id),
  approved_at      TIMESTAMPTZ,
  loan_id          UUID          REFERENCES public.loans(id) ON DELETE SET NULL,
  remarks          TEXT,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_loan_applications_updated_at
  BEFORE UPDATE ON public.loan_applications
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── Indexes ────────────────────────────────────────────────────────
CREATE INDEX idx_employee_benefits_emp  ON public.employee_benefits (employee_id);
CREATE INDEX idx_hmo_dependents_emp     ON public.hmo_dependents (employee_id);
CREATE INDEX idx_loan_applications_emp  ON public.loan_applications (employee_id, status);

-- ══════════════════════════════════════════════════════════════════
-- RLS Policies
-- ══════════════════════════════════════════════════════════════════

ALTER TABLE public.benefits           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hmo_plans          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_benefits  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hmo_dependents     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_applications  ENABLE ROW LEVEL SECURITY;

-- Org-scoped reads
CREATE POLICY "org_select_benefits"          ON public.benefits          FOR SELECT TO authenticated USING (organization_id = get_my_org_id());
CREATE POLICY "org_select_hmo_plans"         ON public.hmo_plans         FOR SELECT TO authenticated USING (organization_id = get_my_org_id());
CREATE POLICY "org_select_emp_benefits"      ON public.employee_benefits  FOR SELECT TO authenticated USING (organization_id = get_my_org_id());
CREATE POLICY "org_select_hmo_dependents"    ON public.hmo_dependents     FOR SELECT TO authenticated USING (organization_id = get_my_org_id());
CREATE POLICY "org_select_loan_applications" ON public.loan_applications  FOR SELECT TO authenticated USING (organization_id = get_my_org_id());

-- Admin write access
CREATE POLICY "admin_write_benefits"          ON public.benefits          FOR ALL TO authenticated USING (organization_id = get_my_org_id() AND is_admin()) WITH CHECK (organization_id = get_my_org_id());
CREATE POLICY "admin_write_hmo_plans"         ON public.hmo_plans         FOR ALL TO authenticated USING (organization_id = get_my_org_id() AND is_admin()) WITH CHECK (organization_id = get_my_org_id());
CREATE POLICY "admin_write_emp_benefits"      ON public.employee_benefits  FOR ALL TO authenticated USING (organization_id = get_my_org_id() AND is_admin()) WITH CHECK (organization_id = get_my_org_id());
CREATE POLICY "admin_write_hmo_dependents"    ON public.hmo_dependents     FOR ALL TO authenticated USING (organization_id = get_my_org_id() AND is_admin()) WITH CHECK (organization_id = get_my_org_id());
CREATE POLICY "admin_write_loan_applications" ON public.loan_applications  FOR ALL TO authenticated USING (organization_id = get_my_org_id() AND is_admin()) WITH CHECK (organization_id = get_my_org_id());

-- Employees: view own benefits and submit loan applications
CREATE POLICY "self_select_emp_benefits"      ON public.employee_benefits  FOR SELECT TO authenticated USING (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));
CREATE POLICY "self_select_hmo_dependents"    ON public.hmo_dependents     FOR SELECT TO authenticated USING (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));
CREATE POLICY "self_select_loan_applications" ON public.loan_applications  FOR SELECT TO authenticated USING (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));
CREATE POLICY "self_insert_loan_application"  ON public.loan_applications  FOR INSERT TO authenticated WITH CHECK (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));
