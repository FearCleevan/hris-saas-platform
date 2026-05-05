-- ══════════════════════════════════════════════════════════════════
-- Migration: Invite acceptance RPC + Team member query helpers
-- ══════════════════════════════════════════════════════════════════

-- ── 1. setup_invited_user ─────────────────────────────────────────
-- Called by AuthCallbackPage after an invited user first signs in.
-- Assigns them to the right org & role, then marks the invite accepted.
-- SECURITY DEFINER so the new user (no row in user_roles yet) can execute it.

CREATE OR REPLACE FUNCTION public.setup_invited_user(
  p_role_slug       TEXT,
  p_organization_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_role_id UUID;
  v_email   TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Resolve role within the target organization (roles are org-scoped)
  SELECT id INTO v_role_id
  FROM public.roles
  WHERE slug = p_role_slug
    AND organization_id = p_organization_id;

  IF v_role_id IS NULL THEN
    RAISE EXCEPTION 'Role not found: %', p_role_slug;
  END IF;

  -- Attach profile to the organization
  UPDATE public.user_profiles
  SET organization_id = p_organization_id,
      updated_at      = NOW()
  WHERE id = v_user_id;

  -- Assign the role (ignore if already assigned)
  INSERT INTO public.user_roles (user_id, role_id, organization_id)
  VALUES (v_user_id, v_role_id, p_organization_id)
  ON CONFLICT (user_id, role_id, organization_id) DO NOTHING;

  -- Mark the matching invite token as accepted
  SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;
  UPDATE public.invite_tokens
  SET accepted_at = NOW()
  WHERE email            = v_email
    AND organization_id  = p_organization_id
    AND accepted_at IS NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.setup_invited_user(TEXT, UUID) TO authenticated;

-- ── 2. get_team_members ───────────────────────────────────────────
-- Returns all users who have a role in the given organization.
-- Joins auth.users for email (requires SECURITY DEFINER).

CREATE OR REPLACE FUNCTION public.get_team_members(p_organization_id UUID)
RETURNS TABLE (
  user_id         UUID,
  full_name       TEXT,
  email           TEXT,
  avatar_url      TEXT,
  role_slug       TEXT,
  role_name       TEXT,
  is_active       BOOLEAN,
  last_login_at   TIMESTAMPTZ,
  joined_at       TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Caller must be a member of this org
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles AS chk
    WHERE chk.user_id = auth.uid() AND chk.organization_id = p_organization_id
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    ur.user_id::UUID,
    COALESCE(up.full_name, au.email, '')::TEXT  AS full_name,
    au.email::TEXT,
    up.avatar_url::TEXT,
    r.slug::TEXT                                AS role_slug,
    r.name::TEXT                                AS role_name,
    COALESCE(up.is_active, true)::BOOLEAN       AS is_active,
    up.last_login_at::TIMESTAMPTZ,
    COALESCE(up.created_at, au.created_at)::TIMESTAMPTZ AS joined_at
  FROM public.user_roles ur
  JOIN auth.users        au ON au.id = ur.user_id
  LEFT JOIN public.user_profiles up ON up.id   = ur.user_id
  JOIN public.roles       r  ON r.id  = ur.role_id
  WHERE ur.organization_id = p_organization_id
  ORDER BY COALESCE(up.created_at, au.created_at) ASC NULLS LAST;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_team_members(UUID) TO authenticated;

-- ── 3. get_pending_invites ────────────────────────────────────────
-- Returns pending (not-yet-accepted, not-expired) invitations for an org.

CREATE OR REPLACE FUNCTION public.get_pending_invites(p_organization_id UUID)
RETURNS TABLE (
  id              UUID,
  email           TEXT,
  role_slug       TEXT,
  role_name       TEXT,
  sent_at         TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Caller must be a member of this org
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND organization_id = p_organization_id
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    it.id,
    it.email,
    r.slug AS role_slug,
    r.name AS role_name,
    it.created_at AS sent_at,
    it.expires_at
  FROM public.invite_tokens it
  LEFT JOIN public.roles r ON r.id = it.role_id
  WHERE it.organization_id = p_organization_id
    AND it.accepted_at IS NULL
    AND it.expires_at  > NOW()
  ORDER BY it.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_pending_invites(UUID) TO authenticated;

-- ── 4. revoke_invite ──────────────────────────────────────────────
-- Deletes a pending invite token. Only super_admins of that org may call it.

CREATE OR REPLACE FUNCTION public.revoke_invite(p_invite_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
BEGIN
  -- Get the invite's org
  SELECT organization_id INTO v_org_id
  FROM public.invite_tokens WHERE id = p_invite_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Invite not found';
  END IF;

  -- Caller must be super_admin in that org
  IF NOT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id        = auth.uid()
      AND ur.organization_id = v_org_id
      AND r.slug             = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Only Super Admins can revoke invitations';
  END IF;

  DELETE FROM public.invite_tokens WHERE id = p_invite_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.revoke_invite(UUID) TO authenticated;
