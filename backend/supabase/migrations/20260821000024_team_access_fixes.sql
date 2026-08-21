-- ══════════════════════════════════════════════════════════════════
-- Migration: Team & Access fixes
-- Backend Phase B1 (CRUD_FIXES_BACKEND_IMPLEMENTATION.md)
--
-- Fixes:
-- 1. SettingsPage.tsx's "Deactivate member" toggles only local React
--    state — no service function exists, so user_profiles.is_active
--    (already read by get_team_members) is never actually written.
-- 2. changeUserRole() queries roles WHERE organization_id IS NULL,
--    but handle_new_user() always seeds roles with a real org_id —
--    the lookup returns 0 rows and always throws 'Role not found'.
-- 3. That same role change was a non-atomic delete-then-insert from
--    the client; moving it into a single SECURITY DEFINER function
--    makes it atomic for free.
-- ══════════════════════════════════════════════════════════════════

-- ── deactivate_member / reactivate_member ──────────────────────────
CREATE OR REPLACE FUNCTION public.deactivate_member(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID := get_my_org_id();
  v_target_org_id UUID;
  v_role_slug TEXT;
  v_remaining_super_admins INT;
BEGIN
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'No organization context for current user';
  END IF;

  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can deactivate members';
  END IF;

  SELECT organization_id INTO v_target_org_id
    FROM public.user_profiles
    WHERE id = p_user_id;

  IF v_target_org_id IS NULL OR v_target_org_id != v_org_id THEN
    RAISE EXCEPTION 'User not found in your organization';
  END IF;

  -- Don't allow locking the org out of super_admin access entirely.
  SELECT r.slug INTO v_role_slug
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = p_user_id AND ur.organization_id = v_org_id
    LIMIT 1;

  IF v_role_slug = 'super_admin' THEN
    SELECT count(*) INTO v_remaining_super_admins
      FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      JOIN public.user_profiles up ON up.id = ur.user_id
      WHERE ur.organization_id = v_org_id
        AND r.slug = 'super_admin'
        AND up.is_active = true
        AND up.id != p_user_id;

    IF v_remaining_super_admins = 0 THEN
      RAISE EXCEPTION 'Cannot deactivate the last active super admin in the organization';
    END IF;
  END IF;

  UPDATE public.user_profiles
  SET is_active = false
  WHERE id = p_user_id AND organization_id = v_org_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reactivate_member(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID := get_my_org_id();
  v_target_org_id UUID;
BEGIN
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'No organization context for current user';
  END IF;

  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can reactivate members';
  END IF;

  SELECT organization_id INTO v_target_org_id
    FROM public.user_profiles
    WHERE id = p_user_id;

  IF v_target_org_id IS NULL OR v_target_org_id != v_org_id THEN
    RAISE EXCEPTION 'User not found in your organization';
  END IF;

  UPDATE public.user_profiles
  SET is_active = true
  WHERE id = p_user_id AND organization_id = v_org_id;
END;
$$;

-- ── change_user_role ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.change_user_role(p_user_id UUID, p_new_role_slug TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID := get_my_org_id();
  v_target_org_id UUID;
  v_new_role_id UUID;
BEGIN
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'No organization context for current user';
  END IF;

  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can change member roles';
  END IF;

  SELECT organization_id INTO v_target_org_id
    FROM public.user_profiles
    WHERE id = p_user_id;

  IF v_target_org_id IS NULL OR v_target_org_id != v_org_id THEN
    RAISE EXCEPTION 'User not found in your organization';
  END IF;

  SELECT id INTO v_new_role_id
    FROM public.roles
    WHERE organization_id = v_org_id AND slug = p_new_role_slug;

  IF v_new_role_id IS NULL THEN
    RAISE EXCEPTION 'Role "%" does not exist for your organization', p_new_role_slug;
  END IF;

  DELETE FROM public.user_roles
    WHERE user_id = p_user_id AND organization_id = v_org_id;

  INSERT INTO public.user_roles (user_id, role_id, organization_id)
    VALUES (p_user_id, v_new_role_id, v_org_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.deactivate_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reactivate_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.change_user_role(UUID, TEXT) TO authenticated;
