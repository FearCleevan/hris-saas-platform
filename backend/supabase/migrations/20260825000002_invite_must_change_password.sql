-- ══════════════════════════════════════════════════════════════════
-- Migration: Force invited users to set a password before entering the app
--
-- user_profiles.must_change_password existed but was hardcoded false
-- everywhere it was ever set, and never checked anywhere in the frontend —
-- dead infrastructure. Invited users arrive via a magic link with a live
-- session and no password ever set; if they log out, they have no way
-- back in except another link.
--
-- handle_new_user() now sets must_change_password = true specifically for
-- invited users (detected the same way the org-detection fix does — by
-- the presence of organization_id in invite metadata, which self-signup
-- never sets). Frontend enforcement (ProtectedRoute redirect + a new
-- /set-password page) lands in the same commit as this migration.
-- ══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_org_id       UUID;
  v_org_name     TEXT;
  v_role_id      UUID;
  v_is_invite    BOOLEAN;
BEGIN
  v_org_name := COALESCE(
    NEW.raw_user_meta_data->>'company_name',
    split_part(NEW.email, '@', 2)
  );

  v_is_invite := (NEW.raw_user_meta_data->>'organization_id') IS NOT NULL;

  -- Only create org for brand-new signups (not invitees)
  IF NOT v_is_invite THEN
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

    SELECT id INTO v_role_id
      FROM public.roles
      WHERE organization_id = v_org_id AND slug = 'super_admin'
      LIMIT 1;

    INSERT INTO public.user_roles (user_id, role_id, organization_id)
    VALUES (NEW.id, v_role_id, v_org_id);
  END IF;

  -- Always create a profile. must_change_password = true only for
  -- invited users (they never chose a password, unlike self-signup which
  -- collects one on the SignUpPage form).
  INSERT INTO public.user_profiles (id, organization_id, full_name, must_change_password)
  VALUES (
    NEW.id,
    v_org_id,
    COALESCE(
      TRIM((NEW.raw_user_meta_data->>'first_name') || ' ' || (NEW.raw_user_meta_data->>'last_name')),
      split_part(NEW.email, '@', 1)
    ),
    v_is_invite
  );

  RETURN NEW;
END;
$$;
