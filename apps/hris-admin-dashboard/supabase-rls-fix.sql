-- ============================================================
-- RLS POLICIES + SECURITY DEFINER FUNCTIONS
-- Safe to re-run: every CREATE POLICY is preceded by DROP IF EXISTS.
-- Paste the entire file into the Supabase SQL Editor and click Run.
-- ============================================================

-- ── 0. Helper functions ───────────────────────────────────────────
-- get_my_org_id: JWT claim first, falls back to user_profiles row.
-- get_my_role:   JWT claim first, falls back to user_roles query.
-- is_admin:      true when role is super_admin or hr_manager.
-- All three are SECURITY DEFINER so they bypass RLS on bootstrap tables.

CREATE OR REPLACE FUNCTION public.get_my_org_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT COALESCE(
    (auth.jwt() ->> 'org_id')::UUID,
    (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid())
  );
$$;

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT COALESCE(
    auth.jwt() ->> 'user_role',
    (
      SELECT r.slug
      FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
        AND ur.organization_id = get_my_org_id()
      LIMIT 1
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT get_my_role() IN ('super_admin', 'hr_manager');
$$;

-- ── 1. create_organization (SECURITY DEFINER) ─────────────────────
-- Atomically inserts org → roles → user_roles → user_profiles.
-- Runs as DB owner so it bypasses RLS on all bootstrap tables.

CREATE OR REPLACE FUNCTION public.create_organization(
  p_name         text,
  p_slug         text,
  p_plan         text,
  p_industry     text,
  p_company_size text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id           uuid;
  v_org_id            uuid;
  v_super_admin_role  uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.organizations (name, slug, plan, industry, company_size)
  VALUES (p_name, p_slug, p_plan, p_industry, p_company_size)
  RETURNING id INTO v_org_id;

  INSERT INTO public.roles (organization_id, name, slug, is_system)
  VALUES
    (v_org_id, 'Super Admin', 'super_admin', true),
    (v_org_id, 'HR Manager',  'hr_manager',  true),
    (v_org_id, 'HR Staff',    'hr_staff',    true),
    (v_org_id, 'Accountant',  'accountant',  true);

  SELECT id INTO v_super_admin_role
  FROM public.roles
  WHERE organization_id = v_org_id AND slug = 'super_admin';

  INSERT INTO public.user_roles (user_id, role_id, organization_id)
  VALUES (v_user_id, v_super_admin_role, v_org_id);

  INSERT INTO public.user_profiles (id, organization_id)
  VALUES (v_user_id, v_org_id)
  ON CONFLICT (id) DO UPDATE SET organization_id = EXCLUDED.organization_id;

  RETURN (
    SELECT json_build_object(
      'id',           o.id,
      'name',         o.name,
      'slug',         o.slug,
      'plan',         o.plan,
      'industry',     o.industry,
      'company_size', o.company_size,
      'logo_url',     o.logo_url
    )
    FROM public.organizations o
    WHERE o.id = v_org_id
  );
END;
$$;

-- ── 2. RLS: organizations ─────────────────────────────────────────

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_members_can_select"          ON public.organizations;
DROP POLICY IF EXISTS "super_admins_can_update_org"     ON public.organizations;

CREATE POLICY "org_members_can_select"
  ON public.organizations FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "super_admins_can_update_org"
  ON public.organizations FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT ur.organization_id
      FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid() AND r.slug = 'super_admin'
    )
  );

-- ── 3. RLS: roles ─────────────────────────────────────────────────

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_members_can_select_roles" ON public.roles;

CREATE POLICY "org_members_can_select_roles"
  ON public.roles FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()
    )
  );

-- ── 4. RLS: user_roles ────────────────────────────────────────────

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_can_select_own_user_roles" ON public.user_roles;

CREATE POLICY "users_can_select_own_user_roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ── 5. RLS: user_profiles ─────────────────────────────────────────

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_can_select_own_profile" ON public.user_profiles;
DROP POLICY IF EXISTS "users_can_insert_own_profile" ON public.user_profiles;
DROP POLICY IF EXISTS "users_can_update_own_profile" ON public.user_profiles;

CREATE POLICY "users_can_select_own_profile"
  ON public.user_profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "users_can_insert_own_profile"
  ON public.user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "users_can_update_own_profile"
  ON public.user_profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ── 6. RLS: employees ─────────────────────────────────────────────

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_members_can_select_employees" ON public.employees;
DROP POLICY IF EXISTS "admins_can_insert_employees"      ON public.employees;
DROP POLICY IF EXISTS "admins_can_update_employees"      ON public.employees;

CREATE POLICY "org_members_can_select_employees"
  ON public.employees FOR SELECT
  TO authenticated
  USING (organization_id = get_my_org_id());

CREATE POLICY "admins_can_insert_employees"
  ON public.employees FOR INSERT
  TO authenticated
  WITH CHECK (organization_id = get_my_org_id());

CREATE POLICY "admins_can_update_employees"
  ON public.employees FOR UPDATE
  TO authenticated
  USING (organization_id = get_my_org_id())
  WITH CHECK (organization_id = get_my_org_id());

-- ── 7. RLS: employee_employment ───────────────────────────────────

ALTER TABLE public.employee_employment ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_members_can_select_employment" ON public.employee_employment;
DROP POLICY IF EXISTS "admins_can_insert_employment"      ON public.employee_employment;
DROP POLICY IF EXISTS "admins_can_update_employment"      ON public.employee_employment;

CREATE POLICY "org_members_can_select_employment"
  ON public.employee_employment FOR SELECT
  TO authenticated
  USING (organization_id = get_my_org_id());

CREATE POLICY "admins_can_insert_employment"
  ON public.employee_employment FOR INSERT
  TO authenticated
  WITH CHECK (organization_id = get_my_org_id());

CREATE POLICY "admins_can_update_employment"
  ON public.employee_employment FOR UPDATE
  TO authenticated
  USING (organization_id = get_my_org_id())
  WITH CHECK (organization_id = get_my_org_id());

-- ── 8. RLS: employee_compensation ────────────────────────────────

ALTER TABLE public.employee_compensation ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_members_can_select_compensation" ON public.employee_compensation;
DROP POLICY IF EXISTS "admins_can_insert_compensation"      ON public.employee_compensation;
DROP POLICY IF EXISTS "admins_can_update_compensation"      ON public.employee_compensation;

CREATE POLICY "org_members_can_select_compensation"
  ON public.employee_compensation FOR SELECT
  TO authenticated
  USING (organization_id = get_my_org_id());

CREATE POLICY "admins_can_insert_compensation"
  ON public.employee_compensation FOR INSERT
  TO authenticated
  WITH CHECK (organization_id = get_my_org_id());

CREATE POLICY "admins_can_update_compensation"
  ON public.employee_compensation FOR UPDATE
  TO authenticated
  USING (organization_id = get_my_org_id())
  WITH CHECK (organization_id = get_my_org_id());

-- ── 9. RLS: departments ───────────────────────────────────────────

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_members_can_select_departments" ON public.departments;
DROP POLICY IF EXISTS "admins_can_insert_departments"      ON public.departments;

CREATE POLICY "org_members_can_select_departments"
  ON public.departments FOR SELECT
  TO authenticated
  USING (organization_id = get_my_org_id());

CREATE POLICY "admins_can_insert_departments"
  ON public.departments FOR INSERT
  TO authenticated
  WITH CHECK (organization_id = get_my_org_id());

-- ── 10. RLS: positions ────────────────────────────────────────────

ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_members_can_select_positions" ON public.positions;
DROP POLICY IF EXISTS "admins_can_insert_positions"      ON public.positions;

CREATE POLICY "org_members_can_select_positions"
  ON public.positions FOR SELECT
  TO authenticated
  USING (organization_id = get_my_org_id());

CREATE POLICY "admins_can_insert_positions"
  ON public.positions FOR INSERT
  TO authenticated
  WITH CHECK (organization_id = get_my_org_id());

-- ── 11. RLS: employment_types ─────────────────────────────────────

ALTER TABLE public.employment_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_members_can_select_employment_types" ON public.employment_types;

CREATE POLICY "org_members_can_select_employment_types"
  ON public.employment_types FOR SELECT
  TO authenticated
  USING (organization_id = get_my_org_id());

-- ── 12. RLS: employee_government_ids ─────────────────────────────

ALTER TABLE public.employee_government_ids ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_members_can_select_gov_ids" ON public.employee_government_ids;
DROP POLICY IF EXISTS "admins_can_insert_gov_ids"      ON public.employee_government_ids;
DROP POLICY IF EXISTS "admins_can_update_gov_ids"      ON public.employee_government_ids;

CREATE POLICY "org_members_can_select_gov_ids"
  ON public.employee_government_ids FOR SELECT
  TO authenticated
  USING (organization_id = get_my_org_id());

CREATE POLICY "admins_can_insert_gov_ids"
  ON public.employee_government_ids FOR INSERT
  TO authenticated
  WITH CHECK (organization_id = get_my_org_id());

CREATE POLICY "admins_can_update_gov_ids"
  ON public.employee_government_ids FOR UPDATE
  TO authenticated
  USING (organization_id = get_my_org_id())
  WITH CHECK (organization_id = get_my_org_id());

-- ── 13. RLS: employee_bank_accounts ──────────────────────────────

ALTER TABLE public.employee_bank_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_members_can_select_bank_accounts" ON public.employee_bank_accounts;
DROP POLICY IF EXISTS "admins_can_insert_bank_accounts"      ON public.employee_bank_accounts;
DROP POLICY IF EXISTS "admins_can_update_bank_accounts"      ON public.employee_bank_accounts;

CREATE POLICY "org_members_can_select_bank_accounts"
  ON public.employee_bank_accounts FOR SELECT
  TO authenticated
  USING (organization_id = get_my_org_id());

CREATE POLICY "admins_can_insert_bank_accounts"
  ON public.employee_bank_accounts FOR INSERT
  TO authenticated
  WITH CHECK (organization_id = get_my_org_id());

CREATE POLICY "admins_can_update_bank_accounts"
  ON public.employee_bank_accounts FOR UPDATE
  TO authenticated
  USING (organization_id = get_my_org_id())
  WITH CHECK (organization_id = get_my_org_id());

-- ── 14. RLS: employee_emergency_contacts ─────────────────────────

ALTER TABLE public.employee_emergency_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_members_can_select_emergency_contacts" ON public.employee_emergency_contacts;
DROP POLICY IF EXISTS "admins_can_insert_emergency_contacts"      ON public.employee_emergency_contacts;
DROP POLICY IF EXISTS "admins_can_update_emergency_contacts"      ON public.employee_emergency_contacts;

CREATE POLICY "org_members_can_select_emergency_contacts"
  ON public.employee_emergency_contacts FOR SELECT
  TO authenticated
  USING (organization_id = get_my_org_id());

CREATE POLICY "admins_can_insert_emergency_contacts"
  ON public.employee_emergency_contacts FOR INSERT
  TO authenticated
  WITH CHECK (organization_id = get_my_org_id());

CREATE POLICY "admins_can_update_emergency_contacts"
  ON public.employee_emergency_contacts FOR UPDATE
  TO authenticated
  USING (organization_id = get_my_org_id())
  WITH CHECK (organization_id = get_my_org_id());

-- ── 15. RLS: employee_beneficiaries ──────────────────────────────

ALTER TABLE public.employee_beneficiaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_members_can_select_beneficiaries" ON public.employee_beneficiaries;
DROP POLICY IF EXISTS "admins_can_insert_beneficiaries"      ON public.employee_beneficiaries;

CREATE POLICY "org_members_can_select_beneficiaries"
  ON public.employee_beneficiaries FOR SELECT
  TO authenticated
  USING (organization_id = get_my_org_id());

CREATE POLICY "admins_can_insert_beneficiaries"
  ON public.employee_beneficiaries FOR INSERT
  TO authenticated
  WITH CHECK (organization_id = get_my_org_id());

-- ── AFTER RUNNING: fix any employees missing is_active ────────────
-- Run this separately if you added employees before this fix:
--
--   UPDATE public.employees SET is_active = true WHERE is_active IS NULL OR is_active = false;
