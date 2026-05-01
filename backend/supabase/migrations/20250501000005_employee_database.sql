-- ══════════════════════════════════════════════════════════════════
-- Migration: Employee Database
-- Phase 2 — Core employee tables
-- ══════════════════════════════════════════════════════════════════

-- ── Departments ───────────────────────────────────────────────────
CREATE TABLE public.departments (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name            TEXT        NOT NULL,
  code            TEXT        NOT NULL,
  description     TEXT,
  head_id         UUID,        -- FK to employees added after employees table
  parent_id       UUID        REFERENCES public.departments(id) ON DELETE SET NULL,
  is_active       BOOLEAN     NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, code)
);

CREATE TRIGGER set_departments_updated_at
  BEFORE UPDATE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── Positions ─────────────────────────────────────────────────────
CREATE TABLE public.positions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  department_id   UUID        REFERENCES public.departments(id) ON DELETE SET NULL,
  title           TEXT        NOT NULL,
  code            TEXT,
  level           TEXT        CHECK (level IN ('entry', 'junior', 'mid', 'senior', 'lead', 'manager', 'director', 'executive')),
  description     TEXT,
  is_active       BOOLEAN     NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_positions_updated_at
  BEFORE UPDATE ON public.positions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── Employment Types ──────────────────────────────────────────────
CREATE TABLE public.employment_types (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID    NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name            TEXT    NOT NULL,
  code            TEXT    NOT NULL,
  description     TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (organization_id, code)
);

-- ── Employees (personal info) ─────────────────────────────────────
CREATE TABLE public.employees (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id             UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  employee_no         TEXT        NOT NULL,
  first_name          TEXT        NOT NULL,
  middle_name         TEXT,
  last_name           TEXT        NOT NULL,
  suffix              TEXT,
  preferred_name      TEXT,
  gender              TEXT        CHECK (gender IN ('male', 'female', 'non_binary', 'prefer_not_to_say')),
  civil_status        TEXT        CHECK (civil_status IN ('single', 'married', 'widowed', 'separated', 'divorced')),
  date_of_birth       DATE,
  place_of_birth      TEXT,
  nationality         TEXT        NOT NULL DEFAULT 'Filipino',
  religion            TEXT,
  blood_type          TEXT        CHECK (blood_type IN ('A+','A-','B+','B-','AB+','AB-','O+','O-','unknown')),
  -- Contact
  personal_email      TEXT,
  work_email          TEXT,
  mobile_number       TEXT,
  phone_number        TEXT,
  -- Address
  address_line1       TEXT,
  address_line2       TEXT,
  city                TEXT,
  province            TEXT,
  zip_code            TEXT,
  country             TEXT        NOT NULL DEFAULT 'Philippines',
  -- Avatar
  avatar_url          TEXT,
  -- Status
  status              TEXT        NOT NULL DEFAULT 'active'
                                  CHECK (status IN ('active', 'inactive', 'on_leave', 'terminated', 'resigned', 'retired')),
  is_active           BOOLEAN     NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, employee_no)
);

CREATE TRIGGER set_employees_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Add FK for department head now that employees table exists
ALTER TABLE public.departments
  ADD CONSTRAINT fk_department_head
  FOREIGN KEY (head_id) REFERENCES public.employees(id) ON DELETE SET NULL;

-- ── Employee Employment (position, dept, dates) ───────────────────
CREATE TABLE public.employee_employment (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id        UUID        NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  organization_id    UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id          UUID        REFERENCES public.branches(id) ON DELETE SET NULL,
  department_id      UUID        REFERENCES public.departments(id) ON DELETE SET NULL,
  position_id        UUID        REFERENCES public.positions(id) ON DELETE SET NULL,
  employment_type_id UUID        REFERENCES public.employment_types(id) ON DELETE SET NULL,
  direct_manager_id  UUID        REFERENCES public.employees(id) ON DELETE SET NULL,
  date_hired         DATE        NOT NULL,
  date_regularized   DATE,
  date_separated     DATE,
  separation_reason  TEXT,
  work_arrangement   TEXT        NOT NULL DEFAULT 'on_site'
                                 CHECK (work_arrangement IN ('on_site', 'remote', 'hybrid')),
  work_schedule      TEXT,
  is_current         BOOLEAN     NOT NULL DEFAULT true,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_employee_employment_updated_at
  BEFORE UPDATE ON public.employee_employment
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── Employee Compensation ─────────────────────────────────────────
CREATE TABLE public.employee_compensation (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id     UUID        NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  organization_id UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  rate_type       TEXT        NOT NULL DEFAULT 'monthly'
                              CHECK (rate_type IN ('monthly', 'daily', 'hourly')),
  basic_salary    NUMERIC(12,2) NOT NULL DEFAULT 0,
  hourly_rate     NUMERIC(10,4),
  daily_rate      NUMERIC(10,2),
  currency        TEXT        NOT NULL DEFAULT 'PHP',
  effective_date  DATE        NOT NULL,
  end_date        DATE,
  is_current      BOOLEAN     NOT NULL DEFAULT true,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_employee_compensation_updated_at
  BEFORE UPDATE ON public.employee_compensation
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── Employee Government IDs ───────────────────────────────────────
CREATE TABLE public.employee_government_ids (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id     UUID    NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  organization_id UUID    NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  sss_number      TEXT,
  tin_number      TEXT,
  pagibig_number  TEXT,
  philhealth_number TEXT,
  umid_number     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (employee_id)
);

CREATE TRIGGER set_employee_gov_ids_updated_at
  BEFORE UPDATE ON public.employee_government_ids
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── Employee Bank Accounts ────────────────────────────────────────
CREATE TABLE public.employee_bank_accounts (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id     UUID    NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  organization_id UUID    NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  bank_name       TEXT    NOT NULL,
  account_name    TEXT    NOT NULL,
  account_number  TEXT    NOT NULL,
  account_type    TEXT    NOT NULL DEFAULT 'savings'
                          CHECK (account_type IN ('savings', 'checking', 'payroll')),
  is_primary      BOOLEAN NOT NULL DEFAULT false,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_employee_bank_updated_at
  BEFORE UPDATE ON public.employee_bank_accounts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── Emergency Contacts ────────────────────────────────────────────
CREATE TABLE public.employee_emergency_contacts (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id     UUID    NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  organization_id UUID    NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name            TEXT    NOT NULL,
  relationship    TEXT    NOT NULL,
  mobile_number   TEXT    NOT NULL,
  phone_number    TEXT,
  address         TEXT,
  is_primary      BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Dependents ────────────────────────────────────────────────────
CREATE TABLE public.employee_dependents (
  id              UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id     UUID  NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  organization_id UUID  NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  first_name      TEXT  NOT NULL,
  last_name       TEXT  NOT NULL,
  relationship    TEXT  NOT NULL
                        CHECK (relationship IN ('spouse','child','parent','sibling','other')),
  date_of_birth   DATE,
  is_dependent_for_tax BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Beneficiaries ─────────────────────────────────────────────────
CREATE TABLE public.employee_beneficiaries (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id     UUID         NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  organization_id UUID         NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name            TEXT         NOT NULL,
  relationship    TEXT         NOT NULL,
  share_percent   NUMERIC(5,2) CHECK (share_percent BETWEEN 0 AND 100),
  date_of_birth   DATE,
  contact_number  TEXT,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Indexes for common lookups ────────────────────────────────────
CREATE INDEX idx_employees_org      ON public.employees (organization_id);
CREATE INDEX idx_employees_status   ON public.employees (organization_id, status);
CREATE INDEX idx_employment_emp     ON public.employee_employment (employee_id);
CREATE INDEX idx_compensation_emp   ON public.employee_compensation (employee_id);

-- ══════════════════════════════════════════════════════════════════
-- RLS Policies
-- ══════════════════════════════════════════════════════════════════

ALTER TABLE public.departments              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.positions                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employment_types         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_employment      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_compensation    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_government_ids  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_bank_accounts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_dependents      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_beneficiaries   ENABLE ROW LEVEL SECURITY;

-- Authenticated users see only their org's data
CREATE POLICY "org_select_departments"   ON public.departments   FOR SELECT TO authenticated USING (organization_id = get_my_org_id());
CREATE POLICY "org_select_positions"     ON public.positions      FOR SELECT TO authenticated USING (organization_id = get_my_org_id());
CREATE POLICY "org_select_emp_types"     ON public.employment_types FOR SELECT TO authenticated USING (organization_id = get_my_org_id());
CREATE POLICY "org_select_employees"     ON public.employees      FOR SELECT TO authenticated USING (organization_id = get_my_org_id());
CREATE POLICY "org_select_employment"    ON public.employee_employment FOR SELECT TO authenticated USING (organization_id = get_my_org_id());
CREATE POLICY "org_select_compensation"  ON public.employee_compensation FOR SELECT TO authenticated USING (organization_id = get_my_org_id());
CREATE POLICY "org_select_gov_ids"       ON public.employee_government_ids FOR SELECT TO authenticated USING (organization_id = get_my_org_id());
CREATE POLICY "org_select_bank"          ON public.employee_bank_accounts FOR SELECT TO authenticated USING (organization_id = get_my_org_id());
CREATE POLICY "org_select_emergency"     ON public.employee_emergency_contacts FOR SELECT TO authenticated USING (organization_id = get_my_org_id());
CREATE POLICY "org_select_dependents"    ON public.employee_dependents FOR SELECT TO authenticated USING (organization_id = get_my_org_id());
CREATE POLICY "org_select_beneficiaries" ON public.employee_beneficiaries FOR SELECT TO authenticated USING (organization_id = get_my_org_id());

-- Admins and HR can insert/update/delete
CREATE POLICY "admin_write_departments"   ON public.departments   FOR ALL TO authenticated USING (organization_id = get_my_org_id() AND is_admin()) WITH CHECK (organization_id = get_my_org_id());
CREATE POLICY "admin_write_positions"     ON public.positions      FOR ALL TO authenticated USING (organization_id = get_my_org_id() AND is_admin()) WITH CHECK (organization_id = get_my_org_id());
CREATE POLICY "admin_write_emp_types"     ON public.employment_types FOR ALL TO authenticated USING (organization_id = get_my_org_id() AND is_admin()) WITH CHECK (organization_id = get_my_org_id());
CREATE POLICY "admin_write_employees"     ON public.employees      FOR ALL TO authenticated USING (organization_id = get_my_org_id() AND is_admin()) WITH CHECK (organization_id = get_my_org_id());
CREATE POLICY "admin_write_employment"    ON public.employee_employment FOR ALL TO authenticated USING (organization_id = get_my_org_id() AND is_admin()) WITH CHECK (organization_id = get_my_org_id());
CREATE POLICY "admin_write_compensation"  ON public.employee_compensation FOR ALL TO authenticated USING (organization_id = get_my_org_id() AND is_admin()) WITH CHECK (organization_id = get_my_org_id());
CREATE POLICY "admin_write_gov_ids"       ON public.employee_government_ids FOR ALL TO authenticated USING (organization_id = get_my_org_id() AND is_admin()) WITH CHECK (organization_id = get_my_org_id());
CREATE POLICY "admin_write_bank"          ON public.employee_bank_accounts FOR ALL TO authenticated USING (organization_id = get_my_org_id() AND is_admin()) WITH CHECK (organization_id = get_my_org_id());
CREATE POLICY "admin_write_emergency"     ON public.employee_emergency_contacts FOR ALL TO authenticated USING (organization_id = get_my_org_id() AND is_admin()) WITH CHECK (organization_id = get_my_org_id());
CREATE POLICY "admin_write_dependents"    ON public.employee_dependents FOR ALL TO authenticated USING (organization_id = get_my_org_id() AND is_admin()) WITH CHECK (organization_id = get_my_org_id());
CREATE POLICY "admin_write_beneficiaries" ON public.employee_beneficiaries FOR ALL TO authenticated USING (organization_id = get_my_org_id() AND is_admin()) WITH CHECK (organization_id = get_my_org_id());

-- Employees can view and update their own records
CREATE POLICY "self_select_employee"     ON public.employees      FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "self_update_employee"     ON public.employees      FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "self_select_gov_ids"      ON public.employee_government_ids FOR SELECT TO authenticated USING (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));
CREATE POLICY "self_select_bank"         ON public.employee_bank_accounts  FOR SELECT TO authenticated USING (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));
CREATE POLICY "self_select_emergency"    ON public.employee_emergency_contacts FOR SELECT TO authenticated USING (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));
CREATE POLICY "self_select_dependents"   ON public.employee_dependents     FOR SELECT TO authenticated USING (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));
CREATE POLICY "self_select_beneficiaries" ON public.employee_beneficiaries FOR SELECT TO authenticated USING (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));

-- ── Seed default employment types ─────────────────────────────────
-- (Inserted per-org via trigger or manually — skipped here as org_id is required)
