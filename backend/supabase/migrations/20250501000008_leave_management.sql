-- ══════════════════════════════════════════════════════════════════
-- Migration: Leave Management
-- Phase 5
-- ══════════════════════════════════════════════════════════════════

-- ── Leave Types ────────────────────────────────────────────────────
CREATE TABLE public.leave_types (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name                TEXT        NOT NULL,
  code                TEXT        NOT NULL,
  description         TEXT,
  is_paid             BOOLEAN     NOT NULL DEFAULT true,
  is_mandatory        BOOLEAN     NOT NULL DEFAULT false,
  requires_document   BOOLEAN     NOT NULL DEFAULT false,
  max_days_per_year   NUMERIC(5,2),
  carry_over_days     NUMERIC(5,2) NOT NULL DEFAULT 0,
  is_active           BOOLEAN     NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, code)
);

CREATE TRIGGER set_leave_types_updated_at
  BEFORE UPDATE ON public.leave_types
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── Leave Policies (per org) ───────────────────────────────────────
CREATE TABLE public.leave_policies (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  leave_type_id       UUID        NOT NULL REFERENCES public.leave_types(id) ON DELETE CASCADE,
  accrual_type        TEXT        NOT NULL DEFAULT 'annual'
                                  CHECK (accrual_type IN ('annual', 'monthly', 'per_pay_period', 'manual')),
  accrual_amount      NUMERIC(5,2) NOT NULL DEFAULT 0,
  min_service_months  INT         NOT NULL DEFAULT 0,
  is_active           BOOLEAN     NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, leave_type_id)
);

-- ── Leave Balances ─────────────────────────────────────────────────
CREATE TABLE public.leave_balances (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id     UUID         NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  organization_id UUID         NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  leave_type_id   UUID         NOT NULL REFERENCES public.leave_types(id) ON DELETE CASCADE,
  year            INT          NOT NULL,
  entitled_days   NUMERIC(5,2) NOT NULL DEFAULT 0,
  used_days       NUMERIC(5,2) NOT NULL DEFAULT 0,
  pending_days    NUMERIC(5,2) NOT NULL DEFAULT 0,
  carried_over    NUMERIC(5,2) NOT NULL DEFAULT 0,
  balance         NUMERIC(5,2) GENERATED ALWAYS AS (entitled_days + carried_over - used_days - pending_days) STORED,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (employee_id, leave_type_id, year)
);

CREATE TRIGGER set_leave_balances_updated_at
  BEFORE UPDATE ON public.leave_balances
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── Leave Requests ─────────────────────────────────────────────────
CREATE TABLE public.leave_requests (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id     UUID        NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  organization_id UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  leave_type_id   UUID        NOT NULL REFERENCES public.leave_types(id) ON DELETE CASCADE,
  start_date      DATE        NOT NULL,
  end_date        DATE        NOT NULL,
  total_days      NUMERIC(5,2) NOT NULL,
  is_half_day     BOOLEAN     NOT NULL DEFAULT false,
  half_day_period TEXT        CHECK (half_day_period IN ('am', 'pm')),
  reason          TEXT        NOT NULL,
  document_url    TEXT,
  status          TEXT        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'withdrawn')),
  approved_by     UUID        REFERENCES auth.users(id),
  approved_at     TIMESTAMPTZ,
  remarks         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_leave_requests_updated_at
  BEFORE UPDATE ON public.leave_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── Leave Approvals (multi-level) ──────────────────────────────────
CREATE TABLE public.leave_approvals (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  leave_request_id UUID        NOT NULL REFERENCES public.leave_requests(id) ON DELETE CASCADE,
  organization_id  UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  approver_id      UUID        NOT NULL REFERENCES auth.users(id),
  level            INT         NOT NULL DEFAULT 1,
  status           TEXT        NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending', 'approved', 'rejected')),
  remarks          TEXT,
  acted_at         TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Leave Credits History (audit trail) ───────────────────────────
CREATE TABLE public.leave_credits_history (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id     UUID        NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  organization_id UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  leave_type_id   UUID        NOT NULL REFERENCES public.leave_types(id) ON DELETE CASCADE,
  year            INT         NOT NULL,
  transaction_type TEXT       NOT NULL
                              CHECK (transaction_type IN ('accrual', 'usage', 'adjustment', 'carry_over', 'expiry')),
  days            NUMERIC(5,2) NOT NULL,
  reference_id    UUID,
  notes           TEXT,
  created_by      UUID        REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ────────────────────────────────────────────────────────
CREATE INDEX idx_leave_balances_emp     ON public.leave_balances (employee_id, year);
CREATE INDEX idx_leave_requests_emp     ON public.leave_requests (employee_id);
CREATE INDEX idx_leave_requests_status  ON public.leave_requests (organization_id, status);
CREATE INDEX idx_leave_approvals_req    ON public.leave_approvals (leave_request_id);

-- ── Seed mandatory PH leave types ─────────────────────────────────
-- Note: organization_id is NULL here — use per-org seeding via trigger or setup wizard
-- These are seeded per org via the handle_new_user trigger extension below

-- ══════════════════════════════════════════════════════════════════
-- RLS Policies
-- ══════════════════════════════════════════════════════════════════

ALTER TABLE public.leave_types           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_policies        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_balances        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_approvals       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_credits_history ENABLE ROW LEVEL SECURITY;

-- Org-scoped reads
CREATE POLICY "org_select_leave_types"    ON public.leave_types           FOR SELECT TO authenticated USING (organization_id = get_my_org_id());
CREATE POLICY "org_select_leave_policies" ON public.leave_policies        FOR SELECT TO authenticated USING (organization_id = get_my_org_id());
CREATE POLICY "org_select_leave_balances" ON public.leave_balances        FOR SELECT TO authenticated USING (organization_id = get_my_org_id());
CREATE POLICY "org_select_leave_requests" ON public.leave_requests        FOR SELECT TO authenticated USING (organization_id = get_my_org_id());
CREATE POLICY "org_select_leave_approvals" ON public.leave_approvals      FOR SELECT TO authenticated USING (organization_id = get_my_org_id());
CREATE POLICY "org_select_leave_credits"  ON public.leave_credits_history FOR SELECT TO authenticated USING (organization_id = get_my_org_id());

-- Admin/HR write access
CREATE POLICY "admin_write_leave_types"    ON public.leave_types           FOR ALL TO authenticated USING (organization_id = get_my_org_id() AND is_admin()) WITH CHECK (organization_id = get_my_org_id());
CREATE POLICY "admin_write_leave_policies" ON public.leave_policies        FOR ALL TO authenticated USING (organization_id = get_my_org_id() AND is_admin()) WITH CHECK (organization_id = get_my_org_id());
CREATE POLICY "admin_write_leave_balances" ON public.leave_balances        FOR ALL TO authenticated USING (organization_id = get_my_org_id() AND is_admin()) WITH CHECK (organization_id = get_my_org_id());
CREATE POLICY "admin_write_leave_requests" ON public.leave_requests        FOR ALL TO authenticated USING (organization_id = get_my_org_id() AND is_admin()) WITH CHECK (organization_id = get_my_org_id());
CREATE POLICY "admin_write_leave_approvals" ON public.leave_approvals      FOR ALL TO authenticated USING (organization_id = get_my_org_id() AND is_admin()) WITH CHECK (organization_id = get_my_org_id());
CREATE POLICY "admin_write_leave_credits"  ON public.leave_credits_history FOR ALL TO authenticated USING (organization_id = get_my_org_id() AND is_admin()) WITH CHECK (organization_id = get_my_org_id());

-- Employees: view own balances and requests, submit new requests
CREATE POLICY "self_select_leave_balance"  ON public.leave_balances  FOR SELECT TO authenticated USING (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));
CREATE POLICY "self_select_leave_requests" ON public.leave_requests   FOR SELECT TO authenticated USING (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));
CREATE POLICY "self_insert_leave_request"  ON public.leave_requests   FOR INSERT TO authenticated WITH CHECK (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));
CREATE POLICY "self_update_leave_request"  ON public.leave_requests   FOR UPDATE TO authenticated USING (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()) AND status = 'pending') WITH CHECK (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));
CREATE POLICY "self_select_leave_credits"  ON public.leave_credits_history FOR SELECT TO authenticated USING (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));

-- ── Extend handle_new_user to seed mandatory PH leave types per org ──
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_org_id       UUID;
  v_org_name     TEXT;
  v_role_id      UUID;
  v_sil_id       UUID;
  v_sl_id        UUID;
  v_vl_id        UUID;
BEGIN
  v_org_name := COALESCE(
    NEW.raw_user_meta_data->>'company_name',
    split_part(NEW.email, '@', 2)
  );

  IF (NEW.raw_user_meta_data->>'invite_token') IS NULL THEN
    INSERT INTO public.organizations (name, slug, plan, industry, company_size)
    VALUES (
      v_org_name,
      lower(regexp_replace(v_org_name, '[^a-zA-Z0-9]', '-', 'g')) || '-' || left(NEW.id::text, 8),
      'trial',
      NEW.raw_user_meta_data->>'industry',
      NEW.raw_user_meta_data->>'company_size'
    )
    RETURNING id INTO v_org_id;

    INSERT INTO public.roles (organization_id, name, slug, is_system) VALUES
      (v_org_id, 'Super Admin', 'super_admin', true),
      (v_org_id, 'HR Manager',  'hr_manager',  true),
      (v_org_id, 'HR Staff',    'hr_staff',    true),
      (v_org_id, 'Accountant',  'accountant',  true);

    SELECT id INTO v_role_id FROM public.roles
      WHERE organization_id = v_org_id AND slug = 'super_admin' LIMIT 1;

    INSERT INTO public.user_roles (user_id, role_id, organization_id)
    VALUES (NEW.id, v_role_id, v_org_id);

    -- Seed mandatory PH leave types
    INSERT INTO public.leave_types (organization_id, name, code, is_paid, is_mandatory, max_days_per_year, carry_over_days) VALUES
      (v_org_id, 'Service Incentive Leave', 'SIL',       true,  true,  5,   5)   RETURNING id INTO v_sil_id;
    INSERT INTO public.leave_types (organization_id, name, code, is_paid, is_mandatory, max_days_per_year, carry_over_days) VALUES
      (v_org_id, 'Sick Leave',              'SL',        true,  false, 15,  0)   RETURNING id INTO v_sl_id;
    INSERT INTO public.leave_types (organization_id, name, code, is_paid, is_mandatory, max_days_per_year, carry_over_days) VALUES
      (v_org_id, 'Vacation Leave',          'VL',        true,  false, 15,  5)   RETURNING id INTO v_vl_id;
    INSERT INTO public.leave_types (organization_id, name, code, is_paid, is_mandatory, requires_document, max_days_per_year) VALUES
      (v_org_id, 'Maternity Leave',         'ML',        true,  true,  true, 105);
    INSERT INTO public.leave_types (organization_id, name, code, is_paid, is_mandatory, max_days_per_year) VALUES
      (v_org_id, 'Paternity Leave',         'PL',        true,  true,  7);
    INSERT INTO public.leave_types (organization_id, name, code, is_paid, is_mandatory, max_days_per_year) VALUES
      (v_org_id, 'Solo Parent Leave',       'SPL',       true,  true,  7);
    INSERT INTO public.leave_types (organization_id, name, code, is_paid, is_mandatory, max_days_per_year) VALUES
      (v_org_id, 'Bereavement Leave',       'BL',        true,  false, 5);
    INSERT INTO public.leave_types (organization_id, name, code, is_paid, is_mandatory, max_days_per_year) VALUES
      (v_org_id, 'Emergency Leave',         'EL',        true,  false, 3);
    INSERT INTO public.leave_types (organization_id, name, code, is_paid, is_mandatory) VALUES
      (v_org_id, 'Unpaid Leave',            'UL',        false, false);

    -- Seed default employment types
    INSERT INTO public.employment_types (organization_id, name, code) VALUES
      (v_org_id, 'Regular',      'regular'),
      (v_org_id, 'Probationary', 'probationary'),
      (v_org_id, 'Contractual',  'contractual'),
      (v_org_id, 'Project-Based','project_based'),
      (v_org_id, 'Part-Time',    'part_time');
  END IF;

  INSERT INTO public.user_profiles (id, organization_id, full_name)
  VALUES (
    NEW.id,
    v_org_id,
    COALESCE(
      TRIM((NEW.raw_user_meta_data->>'first_name') || ' ' || (NEW.raw_user_meta_data->>'last_name')),
      split_part(NEW.email, '@', 1)
    )
  );

  RETURN NEW;
END;
$$;
