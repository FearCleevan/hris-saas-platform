-- ══════════════════════════════════════════════════════════════════
-- Migration: Organizations, Auth Profiles, Roles & Permissions
-- Phase 1 — Multi-tenant foundation
-- ══════════════════════════════════════════════════════════════════

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_net";

-- ── Organizations (tenants) ────────────────────────────────────────
CREATE TABLE public.organizations (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT        NOT NULL,
  slug          TEXT        NOT NULL UNIQUE,
  plan          TEXT        NOT NULL DEFAULT 'trial'
                            CHECK (plan IN ('trial', 'starter', 'pro', 'enterprise')),
  industry      TEXT,
  company_size  TEXT,
  trial_ends_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '14 days',
  is_active     BOOLEAN     NOT NULL DEFAULT true,
  settings      JSONB       NOT NULL DEFAULT '{}',
  logo_url      TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Branches (per organization) ───────────────────────────────────
CREATE TABLE public.branches (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID    NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name            TEXT    NOT NULL,
  code            TEXT    NOT NULL,
  address         JSONB,
  is_head_office  BOOLEAN NOT NULL DEFAULT false,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, code)
);

-- ── User Profiles (extends auth.users 1:1) ────────────────────────
CREATE TABLE public.user_profiles (
  id                  UUID    PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id     UUID    REFERENCES public.organizations(id) ON DELETE SET NULL,
  employee_id         TEXT,
  full_name           TEXT    NOT NULL DEFAULT '',
  avatar_url          TEXT,
  phone               TEXT,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  must_change_password BOOLEAN NOT NULL DEFAULT false,
  last_login_at       TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Roles ─────────────────────────────────────────────────────────
CREATE TABLE public.roles (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID    REFERENCES public.organizations(id) ON DELETE CASCADE,
  name            TEXT    NOT NULL,
  slug            TEXT    NOT NULL,
  description     TEXT,
  is_system       BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, slug)
);

-- ── Permissions ───────────────────────────────────────────────────
CREATE TABLE public.permissions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module      TEXT NOT NULL,
  action      TEXT NOT NULL,
  description TEXT,
  UNIQUE (module, action)
);

-- ── Role → Permission mapping ─────────────────────────────────────
CREATE TABLE public.role_permissions (
  role_id       UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- ── User → Role mapping ───────────────────────────────────────────
CREATE TABLE public.user_roles (
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id         UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id, organization_id)
);

-- ── Invite Tokens (for inviting new HR users) ─────────────────────
CREATE TABLE public.invite_tokens (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT        NOT NULL,
  organization_id UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role_id         UUID        REFERENCES public.roles(id),
  token           TEXT        NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days',
  accepted_at     TIMESTAMPTZ,
  created_by      UUID        REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Helper: auto-update updated_at ────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── Trigger: create user_profile on signup ────────────────────────
-- Also creates an organization for new signups (from landing page)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_org_id       UUID;
  v_org_name     TEXT;
  v_role_id      UUID;
BEGIN
  -- Extract metadata passed during signUp()
  v_org_name := COALESCE(
    NEW.raw_user_meta_data->>'company_name',
    split_part(NEW.email, '@', 2)
  );

  -- Only create org for brand-new signups (not invitees)
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

    -- Seed system roles for this new org
    INSERT INTO public.roles (organization_id, name, slug, is_system) VALUES
      (v_org_id, 'Super Admin', 'super_admin', true),
      (v_org_id, 'HR Manager',  'hr_manager',  true),
      (v_org_id, 'HR Staff',    'hr_staff',    true),
      (v_org_id, 'Accountant',  'accountant',  true);

    -- Give the first user the super_admin role
    SELECT id INTO v_role_id
      FROM public.roles
      WHERE organization_id = v_org_id AND slug = 'super_admin'
      LIMIT 1;

    INSERT INTO public.user_roles (user_id, role_id, organization_id)
    VALUES (NEW.id, v_role_id, v_org_id);
  END IF;

  -- Always create a profile
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

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── Custom JWT claims (org_id + role) ─────────────────────────────
-- Called by Supabase Auth hook to inject claims into the JWT
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  claims        JSONB;
  v_user_role   TEXT;
  v_org_id      UUID;
BEGIN
  claims := event->'claims';

  -- Get the user's primary role and org
  SELECT r.slug, ur.organization_id
    INTO v_user_role, v_org_id
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
   WHERE ur.user_id = (event->>'user_id')::UUID
   LIMIT 1;

  IF v_user_role IS NOT NULL THEN
    claims := jsonb_set(claims, '{user_role}', to_jsonb(v_user_role));
    claims := jsonb_set(claims, '{org_id}',    to_jsonb(v_org_id::text));
  END IF;

  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

-- Grant required permissions for the hook function
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;
