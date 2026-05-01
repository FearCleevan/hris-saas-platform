-- ══════════════════════════════════════════════════════════════════
-- Migration: Row Level Security Policies
-- Phase 1 — Base access control
-- ══════════════════════════════════════════════════════════════════

-- ── Enable RLS on all tables ──────────────────────────────────────
ALTER TABLE public.organizations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invite_tokens   ENABLE ROW LEVEL SECURITY;

-- ── Helper: get current user's org_id from JWT ───────────────────
CREATE OR REPLACE FUNCTION public.get_my_org_id()
RETURNS UUID LANGUAGE sql STABLE AS $$
  SELECT (auth.jwt()->>'org_id')::UUID;
$$;

-- ── Helper: get current user's role from JWT ──────────────────────
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT LANGUAGE sql STABLE AS $$
  SELECT auth.jwt()->>'user_role';
$$;

-- ── Helper: check if user is admin-level ─────────────────────────
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
  SELECT get_my_role() IN ('super_admin', 'hr_manager');
$$;

-- ── organizations ─────────────────────────────────────────────────
-- Members can see their own org; super_admins can update it
CREATE POLICY "org_members_can_view"
  ON public.organizations FOR SELECT
  USING (id = get_my_org_id());

CREATE POLICY "super_admin_can_update"
  ON public.organizations FOR UPDATE
  USING (id = get_my_org_id() AND get_my_role() = 'super_admin');

-- Landing page: anyone can INSERT (handled by trigger, not direct insert)
-- No direct insert policy — org creation happens via handle_new_user trigger

-- ── branches ──────────────────────────────────────────────────────
CREATE POLICY "org_members_view_branches"
  ON public.branches FOR SELECT
  USING (organization_id = get_my_org_id());

CREATE POLICY "admins_manage_branches"
  ON public.branches FOR ALL
  USING (organization_id = get_my_org_id() AND is_admin());

-- ── user_profiles ─────────────────────────────────────────────────
-- Users can always see their own profile
CREATE POLICY "users_view_own_profile"
  ON public.user_profiles FOR SELECT
  USING (id = auth.uid());

-- HR/Admin can see all profiles in their org
CREATE POLICY "org_admins_view_all_profiles"
  ON public.user_profiles FOR SELECT
  USING (organization_id = get_my_org_id() AND is_admin());

-- Users can update their own profile (limited fields — enforced in app layer)
CREATE POLICY "users_update_own_profile"
  ON public.user_profiles FOR UPDATE
  USING (id = auth.uid());

-- Admins can update any profile in org
CREATE POLICY "org_admins_update_profiles"
  ON public.user_profiles FOR UPDATE
  USING (organization_id = get_my_org_id() AND is_admin());

-- ── roles ─────────────────────────────────────────────────────────
CREATE POLICY "org_members_view_roles"
  ON public.roles FOR SELECT
  USING (organization_id = get_my_org_id() OR is_system = true);

CREATE POLICY "super_admin_manage_roles"
  ON public.roles FOR ALL
  USING (organization_id = get_my_org_id() AND get_my_role() = 'super_admin');

-- ── permissions ───────────────────────────────────────────────────
-- Permissions are read-only for all authenticated users
CREATE POLICY "all_authenticated_view_permissions"
  ON public.permissions FOR SELECT
  TO authenticated USING (true);

-- ── role_permissions ──────────────────────────────────────────────
CREATE POLICY "admins_view_role_permissions"
  ON public.role_permissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.roles r
       WHERE r.id = role_id
         AND r.organization_id = get_my_org_id()
    )
  );

CREATE POLICY "super_admin_manage_role_permissions"
  ON public.role_permissions FOR ALL
  USING (
    get_my_role() = 'super_admin' AND
    EXISTS (
      SELECT 1 FROM public.roles r
       WHERE r.id = role_id
         AND r.organization_id = get_my_org_id()
    )
  );

-- ── user_roles ────────────────────────────────────────────────────
CREATE POLICY "org_members_view_user_roles"
  ON public.user_roles FOR SELECT
  USING (organization_id = get_my_org_id());

CREATE POLICY "super_admin_manage_user_roles"
  ON public.user_roles FOR ALL
  USING (organization_id = get_my_org_id() AND get_my_role() = 'super_admin');

-- ── invite_tokens ─────────────────────────────────────────────────
-- Anyone can read a token by value (for accepting invites)
CREATE POLICY "anyone_read_invite_by_token"
  ON public.invite_tokens FOR SELECT
  TO anon, authenticated
  USING (accepted_at IS NULL AND expires_at > NOW());

-- Admins can manage invites in their org
CREATE POLICY "admins_manage_invites"
  ON public.invite_tokens FOR ALL
  USING (organization_id = get_my_org_id() AND is_admin());
