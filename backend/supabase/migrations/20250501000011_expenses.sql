-- ══════════════════════════════════════════════════════════════════
-- Migration: Expenses
-- Phase 8
-- ══════════════════════════════════════════════════════════════════

-- ── Expense Categories ─────────────────────────────────────────────
CREATE TABLE public.expense_categories (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID    NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name            TEXT    NOT NULL,
  code            TEXT    NOT NULL,
  description     TEXT,
  requires_receipt BOOLEAN NOT NULL DEFAULT true,
  max_amount      NUMERIC(10,2),
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, code)
);

CREATE TRIGGER set_expense_categories_updated_at
  BEFORE UPDATE ON public.expense_categories
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── Expense Claims ─────────────────────────────────────────────────
CREATE TABLE public.expense_claims (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id     UUID          NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  organization_id UUID          NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  category_id     UUID          REFERENCES public.expense_categories(id) ON DELETE SET NULL,
  title           TEXT          NOT NULL,
  description     TEXT,
  amount          NUMERIC(12,2) NOT NULL,
  currency        TEXT          NOT NULL DEFAULT 'PHP',
  expense_date    DATE          NOT NULL,
  status          TEXT          NOT NULL DEFAULT 'draft'
                                CHECK (status IN ('draft', 'submitted', 'under_review', 'approved', 'rejected', 'reimbursed', 'cancelled')),
  submitted_at    TIMESTAMPTZ,
  approved_by     UUID          REFERENCES auth.users(id),
  approved_at     TIMESTAMPTZ,
  reimbursed_at   TIMESTAMPTZ,
  remarks         TEXT,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_expense_claims_updated_at
  BEFORE UPDATE ON public.expense_claims
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── Receipts (attached to claims) ─────────────────────────────────
CREATE TABLE public.receipts (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id        UUID    NOT NULL REFERENCES public.expense_claims(id) ON DELETE CASCADE,
  organization_id UUID    NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  file_name       TEXT    NOT NULL,
  file_url        TEXT    NOT NULL,
  file_size       INT,
  mime_type       TEXT,
  uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Expense Approvals (multi-level) ───────────────────────────────
CREATE TABLE public.expense_approvals (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id        UUID        NOT NULL REFERENCES public.expense_claims(id) ON DELETE CASCADE,
  organization_id UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  approver_id     UUID        NOT NULL REFERENCES auth.users(id),
  level           INT         NOT NULL DEFAULT 1,
  status          TEXT        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'approved', 'rejected')),
  remarks         TEXT,
  acted_at        TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Reimbursements ─────────────────────────────────────────────────
CREATE TABLE public.reimbursements (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id        UUID          NOT NULL REFERENCES public.expense_claims(id) ON DELETE CASCADE,
  employee_id     UUID          NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  organization_id UUID          NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  amount          NUMERIC(12,2) NOT NULL,
  payment_method  TEXT          NOT NULL DEFAULT 'bank_transfer'
                                CHECK (payment_method IN ('bank_transfer', 'cash', 'payroll_inclusion')),
  reference_no    TEXT,
  paid_at         TIMESTAMPTZ,
  payslip_id      UUID          REFERENCES public.payslips(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ── Indexes ────────────────────────────────────────────────────────
CREATE INDEX idx_expense_claims_emp     ON public.expense_claims (employee_id, status);
CREATE INDEX idx_expense_claims_org     ON public.expense_claims (organization_id, status);
CREATE INDEX idx_receipts_claim         ON public.receipts (claim_id);
CREATE INDEX idx_reimbursements_emp     ON public.reimbursements (employee_id);

-- ══════════════════════════════════════════════════════════════════
-- RLS Policies
-- ══════════════════════════════════════════════════════════════════

ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_claims     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_approvals  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reimbursements     ENABLE ROW LEVEL SECURITY;

-- Org-scoped reads
CREATE POLICY "org_select_expense_categories" ON public.expense_categories FOR SELECT TO authenticated USING (organization_id = get_my_org_id());
CREATE POLICY "org_select_expense_claims"     ON public.expense_claims     FOR SELECT TO authenticated USING (organization_id = get_my_org_id());
CREATE POLICY "org_select_receipts"           ON public.receipts           FOR SELECT TO authenticated USING (organization_id = get_my_org_id());
CREATE POLICY "org_select_expense_approvals"  ON public.expense_approvals  FOR SELECT TO authenticated USING (organization_id = get_my_org_id());
CREATE POLICY "org_select_reimbursements"     ON public.reimbursements     FOR SELECT TO authenticated USING (organization_id = get_my_org_id());

-- Admin write access
CREATE POLICY "admin_write_expense_categories" ON public.expense_categories FOR ALL TO authenticated USING (organization_id = get_my_org_id() AND is_admin()) WITH CHECK (organization_id = get_my_org_id());
CREATE POLICY "admin_write_expense_claims"     ON public.expense_claims     FOR ALL TO authenticated USING (organization_id = get_my_org_id() AND is_admin()) WITH CHECK (organization_id = get_my_org_id());
CREATE POLICY "admin_write_receipts"           ON public.receipts           FOR ALL TO authenticated USING (organization_id = get_my_org_id() AND is_admin()) WITH CHECK (organization_id = get_my_org_id());
CREATE POLICY "admin_write_expense_approvals"  ON public.expense_approvals  FOR ALL TO authenticated USING (organization_id = get_my_org_id() AND is_admin()) WITH CHECK (organization_id = get_my_org_id());
CREATE POLICY "admin_write_reimbursements"     ON public.reimbursements     FOR ALL TO authenticated USING (organization_id = get_my_org_id() AND is_admin()) WITH CHECK (organization_id = get_my_org_id());

-- Employees: manage own claims and receipts
CREATE POLICY "self_select_expense_claims"  ON public.expense_claims FOR SELECT TO authenticated USING (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));
CREATE POLICY "self_insert_expense_claim"   ON public.expense_claims FOR INSERT TO authenticated WITH CHECK (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));
CREATE POLICY "self_update_expense_claim"   ON public.expense_claims FOR UPDATE TO authenticated USING (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()) AND status IN ('draft', 'submitted')) WITH CHECK (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));
CREATE POLICY "self_select_receipts"        ON public.receipts       FOR SELECT TO authenticated USING (claim_id IN (SELECT id FROM public.expense_claims WHERE employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())));
CREATE POLICY "self_insert_receipt"         ON public.receipts       FOR INSERT TO authenticated WITH CHECK (claim_id IN (SELECT id FROM public.expense_claims WHERE employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())));
CREATE POLICY "self_select_reimbursements"  ON public.reimbursements FOR SELECT TO authenticated USING (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));
