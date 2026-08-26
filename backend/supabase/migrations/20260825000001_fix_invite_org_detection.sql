-- ══════════════════════════════════════════════════════════════════
-- Migration: Fix handle_new_user() misdetecting every invited user as
-- a fresh self-signup
--
-- Root cause: handle_new_user() (20250501000001_organizations_and_auth.sql)
-- checked `NEW.raw_user_meta_data->>'invite_token'` to decide whether a new
-- auth.users row is a fresh signup (create a new org) or an invited user
-- (skip org creation, setup_invited_user assigns the real org/role
-- afterward). But the invite flow never sets a key called 'invite_token' —
-- invite-member/index.ts passes 'role_slug'/'organization_id'/'invited_by'
-- instead. So this check was always true for invited users too, meaning
-- EVERY invited user — since this trigger was written — has had a brand
-- new organization auto-created for them (named after their email's
-- domain, e.g. "gmail.com"), with them incorrectly made super_admin of
-- that phantom org, before setup_invited_user ever got a chance to run.
--
-- Fix: detect invites by the metadata key the invite flow actually sets
-- (organization_id — confirmed self-signup's metadata, in SignUpPage.tsx,
-- never sets this key: only first_name/last_name/full_name/company_name/
-- company_size, so there's no collision risk).
-- ══════════════════════════════════════════════════════════════════

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
  IF (NEW.raw_user_meta_data->>'organization_id') IS NULL THEN
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

  -- Always create a profile. For invited users v_org_id stays NULL here —
  -- setup_invited_user() (called from AuthCallbackPage right after this
  -- trigger fires) assigns the real organization_id via UPDATE.
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
