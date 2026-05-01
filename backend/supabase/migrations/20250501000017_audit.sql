-- ══════════════════════════════════════════════════════════════════
-- Migration: Audit & Security
-- Phase 14
-- ══════════════════════════════════════════════════════════════════

-- ── Audit Logs ─────────────────────────────────────────────────────
CREATE TABLE public.audit_logs (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID    NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id         UUID    REFERENCES auth.users(id) ON DELETE SET NULL,
  action          TEXT    NOT NULL
                          CHECK (action IN (
                            'create', 'update', 'delete', 'view', 'export',
                            'login', 'logout', 'login_failed',
                            'password_changed', 'role_assigned', 'role_removed',
                            'payroll_run', 'payslip_released',
                            'document_signed', 'document_downloaded',
                            'bulk_import', 'bulk_export',
                            'settings_changed', 'api_key_created', 'api_key_revoked'
                          )),
  resource_type   TEXT    NOT NULL,
  resource_id     UUID,
  old_values      JSONB,
  new_values      JSONB,
  changed_fields  TEXT[],
  ip_address      TEXT,
  user_agent      TEXT,
  session_id      TEXT,
  metadata        JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Generic Table Audit Trigger Function ───────────────────────────
CREATE OR REPLACE FUNCTION public.audit_trigger()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_org_id   UUID;
  v_user_id  UUID := auth.uid();
  v_action   TEXT;
  v_old      JSONB := NULL;
  v_new      JSONB := NULL;
  v_fields   TEXT[] := NULL;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'create';
    v_new    := to_jsonb(NEW);
    v_org_id := (v_new->>'organization_id')::UUID;
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'update';
    v_old    := to_jsonb(OLD);
    v_new    := to_jsonb(NEW);
    v_org_id := (v_new->>'organization_id')::UUID;
    SELECT array_agg(key)
    INTO v_fields
    FROM jsonb_each(v_old) o
    JOIN jsonb_each(v_new) n USING (key)
    WHERE o.value IS DISTINCT FROM n.value
      AND key NOT IN ('updated_at');
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'delete';
    v_old    := to_jsonb(OLD);
    v_org_id := (v_old->>'organization_id')::UUID;
  END IF;

  -- Strip sensitive fields before logging
  v_old := v_old - ARRAY['password', 'pin', 'secret', 'token'];
  v_new := v_new - ARRAY['password', 'pin', 'secret', 'token'];

  INSERT INTO public.audit_logs
    (organization_id, user_id, action, resource_type, resource_id, old_values, new_values, changed_fields)
  VALUES
    (v_org_id, v_user_id, v_action, TG_TABLE_NAME,
     COALESCE((v_new->>'id')::UUID, (v_old->>'id')::UUID),
     v_old, v_new, v_fields);

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ── Attach Audit Triggers to Critical Tables ───────────────────────
CREATE TRIGGER audit_employees
  AFTER INSERT OR UPDATE OR DELETE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

CREATE TRIGGER audit_employee_compensation
  AFTER INSERT OR UPDATE OR DELETE ON public.employee_compensation
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

CREATE TRIGGER audit_payroll_runs
  AFTER INSERT OR UPDATE OR DELETE ON public.payroll_runs
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

CREATE TRIGGER audit_payslips
  AFTER INSERT OR UPDATE OR DELETE ON public.payslips
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

CREATE TRIGGER audit_loans
  AFTER INSERT OR UPDATE OR DELETE ON public.loans
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

CREATE TRIGGER audit_leave_requests
  AFTER INSERT OR UPDATE OR DELETE ON public.leave_requests
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

CREATE TRIGGER audit_expense_claims
  AFTER INSERT OR UPDATE OR DELETE ON public.expense_claims
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

CREATE TRIGGER audit_user_roles
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

CREATE TRIGGER audit_documents
  AFTER INSERT OR UPDATE OR DELETE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

-- ── Login / Security Events ────────────────────────────────────────
CREATE TABLE public.security_events (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID    REFERENCES public.organizations(id) ON DELETE SET NULL,
  user_id         UUID    REFERENCES auth.users(id) ON DELETE SET NULL,
  email           TEXT,
  event_type      TEXT    NOT NULL
                          CHECK (event_type IN (
                            'login_success', 'login_failed', 'logout',
                            'password_reset_requested', 'password_reset_completed',
                            'mfa_enabled', 'mfa_disabled', 'mfa_challenge_failed',
                            'session_expired', 'account_locked', 'account_unlocked',
                            'invite_sent', 'invite_accepted'
                          )),
  ip_address      TEXT,
  user_agent      TEXT,
  metadata        JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── API Keys (for integrations / webhooks) ─────────────────────────
CREATE TABLE public.api_keys (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID    NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name            TEXT    NOT NULL,
  key_hash        TEXT    NOT NULL,
  key_prefix      TEXT    NOT NULL,
  scopes          TEXT[]  NOT NULL DEFAULT '{}',
  last_used_at    TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_by      UUID    NOT NULL REFERENCES auth.users(id),
  revoked_by      UUID    REFERENCES auth.users(id),
  revoked_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Data Retention Policies ────────────────────────────────────────
CREATE TABLE public.data_retention_policies (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID    NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  resource_type   TEXT    NOT NULL,
  retention_days  INT     NOT NULL,
  auto_delete     BOOLEAN NOT NULL DEFAULT false,
  last_run_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, resource_type)
);

CREATE TRIGGER set_data_retention_policies_updated_at
  BEFORE UPDATE ON public.data_retention_policies
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── Indexes ────────────────────────────────────────────────────────
CREATE INDEX idx_audit_logs_org         ON public.audit_logs (organization_id, created_at DESC);
CREATE INDEX idx_audit_logs_user        ON public.audit_logs (user_id, created_at DESC);
CREATE INDEX idx_audit_logs_resource    ON public.audit_logs (resource_type, resource_id);
CREATE INDEX idx_security_events_user   ON public.security_events (user_id, created_at DESC);
CREATE INDEX idx_security_events_org    ON public.security_events (organization_id, created_at DESC);
CREATE INDEX idx_api_keys_org           ON public.api_keys (organization_id, is_active);

-- ══════════════════════════════════════════════════════════════════
-- RLS Policies
-- ══════════════════════════════════════════════════════════════════

ALTER TABLE public.audit_logs              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_events         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_retention_policies ENABLE ROW LEVEL SECURITY;

-- Audit logs: org-scoped, admin-only read (immutable — no UPDATE/DELETE for anyone via RLS)
CREATE POLICY "admin_select_audit_logs"   ON public.audit_logs FOR SELECT TO authenticated
  USING (organization_id = get_my_org_id() AND is_admin());

-- Security events: admin-only read, service_role inserts
CREATE POLICY "admin_select_security_events" ON public.security_events FOR SELECT TO authenticated
  USING (organization_id = get_my_org_id() AND is_admin());

-- API keys: admin manages
CREATE POLICY "admin_select_api_keys"     ON public.api_keys FOR SELECT TO authenticated
  USING (organization_id = get_my_org_id() AND is_admin());
CREATE POLICY "admin_write_api_keys"      ON public.api_keys FOR ALL TO authenticated
  USING (organization_id = get_my_org_id() AND is_admin()) WITH CHECK (organization_id = get_my_org_id());

-- Data retention policies: admin manages
CREATE POLICY "admin_select_retention"    ON public.data_retention_policies FOR SELECT TO authenticated
  USING (organization_id = get_my_org_id() AND is_admin());
CREATE POLICY "admin_write_retention"     ON public.data_retention_policies FOR ALL TO authenticated
  USING (organization_id = get_my_org_id() AND is_admin()) WITH CHECK (organization_id = get_my_org_id());
