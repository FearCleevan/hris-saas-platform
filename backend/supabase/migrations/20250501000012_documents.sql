-- ══════════════════════════════════════════════════════════════════
-- Migration: Documents & E-Signatures
-- Phase 9
-- ══════════════════════════════════════════════════════════════════

-- ── Document Categories ────────────────────────────────────────────
CREATE TABLE public.document_categories (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID    NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name            TEXT    NOT NULL,
  code            TEXT    NOT NULL,
  description     TEXT,
  requires_signature BOOLEAN NOT NULL DEFAULT false,
  retention_years INT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, code)
);

CREATE TRIGGER set_document_categories_updated_at
  BEFORE UPDATE ON public.document_categories
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── Documents ──────────────────────────────────────────────────────
CREATE TABLE public.documents (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID    NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  employee_id     UUID    REFERENCES public.employees(id) ON DELETE SET NULL,
  category_id     UUID    REFERENCES public.document_categories(id) ON DELETE SET NULL,
  title           TEXT    NOT NULL,
  description     TEXT,
  file_name       TEXT    NOT NULL,
  file_path       TEXT    NOT NULL,
  file_size       INT,
  mime_type       TEXT,
  version         INT     NOT NULL DEFAULT 1,
  is_template     BOOLEAN NOT NULL DEFAULT false,
  is_confidential BOOLEAN NOT NULL DEFAULT false,
  expires_at      DATE,
  tags            TEXT[],
  status          TEXT    NOT NULL DEFAULT 'active'
                          CHECK (status IN ('draft', 'active', 'archived', 'expired')),
  uploaded_by     UUID    NOT NULL REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── Document Versions ──────────────────────────────────────────────
CREATE TABLE public.document_versions (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id     UUID    NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  organization_id UUID    NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  version         INT     NOT NULL,
  file_name       TEXT    NOT NULL,
  file_path       TEXT    NOT NULL,
  file_size       INT,
  change_summary  TEXT,
  uploaded_by     UUID    NOT NULL REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Document Access Logs ───────────────────────────────────────────
CREATE TABLE public.document_access_logs (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id     UUID    NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  organization_id UUID    NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  accessed_by     UUID    NOT NULL REFERENCES auth.users(id),
  action          TEXT    NOT NULL
                          CHECK (action IN ('view', 'download', 'print', 'share')),
  ip_address      TEXT,
  accessed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Document Shares (access grants) ───────────────────────────────
CREATE TABLE public.document_shares (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id     UUID    NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  organization_id UUID    NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  shared_with     UUID    NOT NULL REFERENCES auth.users(id),
  permission      TEXT    NOT NULL DEFAULT 'view'
                          CHECK (permission IN ('view', 'download', 'edit')),
  expires_at      TIMESTAMPTZ,
  shared_by       UUID    NOT NULL REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (document_id, shared_with)
);

-- ── E-Signatures ───────────────────────────────────────────────────
CREATE TABLE public.e_signatures (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id     UUID    NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  organization_id UUID    NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  signer_id       UUID    NOT NULL REFERENCES auth.users(id),
  employee_id     UUID    REFERENCES public.employees(id) ON DELETE SET NULL,
  status          TEXT    NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'signed', 'declined', 'expired')),
  signed_at       TIMESTAMPTZ,
  declined_at     TIMESTAMPTZ,
  decline_reason  TEXT,
  signature_data  TEXT,
  ip_address      TEXT,
  signature_order INT     NOT NULL DEFAULT 1,
  due_date        DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_e_signatures_updated_at
  BEFORE UPDATE ON public.e_signatures
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── Indexes ────────────────────────────────────────────────────────
CREATE INDEX idx_documents_org          ON public.documents (organization_id, status);
CREATE INDEX idx_documents_employee     ON public.documents (employee_id);
CREATE INDEX idx_documents_category     ON public.documents (category_id);
CREATE INDEX idx_document_versions_doc  ON public.document_versions (document_id);
CREATE INDEX idx_document_access_doc    ON public.document_access_logs (document_id);
CREATE INDEX idx_e_signatures_signer    ON public.e_signatures (signer_id, status);
CREATE INDEX idx_e_signatures_doc       ON public.e_signatures (document_id);

-- ── Seed default document categories ──────────────────────────────
-- (seeded per-org via handle_new_user — stub for reference)

-- ══════════════════════════════════════════════════════════════════
-- RLS Policies
-- ══════════════════════════════════════════════════════════════════

ALTER TABLE public.document_categories  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_versions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_shares      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.e_signatures         ENABLE ROW LEVEL SECURITY;

-- Org-scoped reads
CREATE POLICY "org_select_doc_categories"  ON public.document_categories  FOR SELECT TO authenticated USING (organization_id = get_my_org_id());
CREATE POLICY "org_select_documents"       ON public.documents            FOR SELECT TO authenticated USING (organization_id = get_my_org_id());
CREATE POLICY "org_select_doc_versions"    ON public.document_versions    FOR SELECT TO authenticated USING (organization_id = get_my_org_id());
CREATE POLICY "org_select_doc_access"      ON public.document_access_logs FOR SELECT TO authenticated USING (organization_id = get_my_org_id());
CREATE POLICY "org_select_doc_shares"      ON public.document_shares      FOR SELECT TO authenticated USING (organization_id = get_my_org_id());
CREATE POLICY "org_select_e_signatures"    ON public.e_signatures         FOR SELECT TO authenticated USING (organization_id = get_my_org_id());

-- Admin write access
CREATE POLICY "admin_write_doc_categories" ON public.document_categories  FOR ALL TO authenticated USING (organization_id = get_my_org_id() AND is_admin()) WITH CHECK (organization_id = get_my_org_id());
CREATE POLICY "admin_write_documents"      ON public.documents            FOR ALL TO authenticated USING (organization_id = get_my_org_id() AND is_admin()) WITH CHECK (organization_id = get_my_org_id());
CREATE POLICY "admin_write_doc_versions"   ON public.document_versions    FOR ALL TO authenticated USING (organization_id = get_my_org_id() AND is_admin()) WITH CHECK (organization_id = get_my_org_id());
CREATE POLICY "admin_write_doc_access"     ON public.document_access_logs FOR ALL TO authenticated USING (organization_id = get_my_org_id() AND is_admin()) WITH CHECK (organization_id = get_my_org_id());
CREATE POLICY "admin_write_doc_shares"     ON public.document_shares      FOR ALL TO authenticated USING (organization_id = get_my_org_id() AND is_admin()) WITH CHECK (organization_id = get_my_org_id());
CREATE POLICY "admin_write_e_signatures"   ON public.e_signatures         FOR ALL TO authenticated USING (organization_id = get_my_org_id() AND is_admin()) WITH CHECK (organization_id = get_my_org_id());

-- Employees: view own documents and documents shared with them; sign their own e-sig requests
CREATE POLICY "self_select_documents"       ON public.documents       FOR SELECT TO authenticated
  USING (
    employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
    OR id IN (SELECT document_id FROM public.document_shares WHERE shared_with = auth.uid())
  );

CREATE POLICY "self_select_e_signatures"    ON public.e_signatures    FOR SELECT TO authenticated
  USING (signer_id = auth.uid());

CREATE POLICY "self_update_e_signature"     ON public.e_signatures    FOR UPDATE TO authenticated
  USING (signer_id = auth.uid() AND status = 'pending')
  WITH CHECK (signer_id = auth.uid());

CREATE POLICY "self_insert_doc_access_log"  ON public.document_access_logs FOR INSERT TO authenticated
  WITH CHECK (accessed_by = auth.uid() AND organization_id = get_my_org_id());
