-- ============================================================
-- RLS POLICIES + SECURITY DEFINER FUNCTION
-- Run this entire script in the Supabase SQL Editor once.
-- ============================================================

-- ── 0. Fix helper functions (JWT claims are empty until refresh) ──
-- get_my_org_id: tries JWT first, falls back to user_profiles row.
-- is_admin: tries JWT role first, falls back to user_roles DB query.
-- Both declared SECURITY DEFINER so they can bypass RLS on
-- user_profiles / user_roles during the bootstrap window.

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

-- ── 1. SECURITY DEFINER function ─────────────────────────────
-- Runs as the DB owner, bypassing RLS so it can atomically
-- insert org → roles → user_roles → user_profiles in one go.

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

  -- Insert the organization
  INSERT INTO public.organizations (name, slug, plan, industry, company_size)
  VALUES (p_name, p_slug, p_plan, p_industry, p_company_size)
  RETURNING id INTO v_org_id;

  -- Seed the four system roles
  INSERT INTO public.roles (organization_id, name, slug, is_system)
  VALUES
    (v_org_id, 'Super Admin', 'super_admin', true),
    (v_org_id, 'HR Manager',  'hr_manager',  true),
    (v_org_id, 'HR Staff',    'hr_staff',    true),
    (v_org_id, 'Accountant',  'accountant',  true);

  -- Grab the super_admin role id
  SELECT id INTO v_super_admin_role
  FROM public.roles
  WHERE organization_id = v_org_id AND slug = 'super_admin';

  -- Assign the creator as Super Admin
  INSERT INTO public.user_roles (user_id, role_id, organization_id)
  VALUES (v_user_id, v_super_admin_role, v_org_id);

  -- Point the user profile at this org
  INSERT INTO public.user_profiles (id, organization_id)
  VALUES (v_user_id, v_org_id)
  ON CONFLICT (id) DO UPDATE SET organization_id = EXCLUDED.organization_id;

  -- Return the org row as JSON
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

-- ── 2. RLS: organizations ─────────────────────────────────────

-- Members can read their own orgs
CREATE POLICY "org_members_can_select"
  ON public.organizations FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()
    )
  );

-- Super admins can update their org
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

-- ── 3. RLS: roles ────────────────────────────────────────────

-- Members can read roles in their org
CREATE POLICY "org_members_can_select_roles"
  ON public.roles FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()
    )
  );

-- ── 4. RLS: user_roles ───────────────────────────────────────

-- Users can read their own role assignments
CREATE POLICY "users_can_select_own_user_roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ── 5. RLS: user_profiles ────────────────────────────────────

-- Users can read their own profile
CREATE POLICY "users_can_select_own_profile"
  ON public.user_profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Users can insert their own profile (sign-up flow)
CREATE POLICY "users_can_insert_own_profile"
  ON public.user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Users can update their own profile
CREATE POLICY "users_can_update_own_profile"
  ON public.user_profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());
