-- ══════════════════════════════════════════════════════════════════
-- Migration: Compliance Reports
-- Phase 11 — BIR, SSS, PhilHealth, Pag-IBIG
-- ══════════════════════════════════════════════════════════════════

-- ── Compliance Report Runs ─────────────────────────────────────────
CREATE TABLE public.compliance_reports (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID    NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  report_type     TEXT    NOT NULL
                          CHECK (report_type IN (
                            'bir_alphalist',   -- BIR 1604-C / Alphalist of Employees
                            'bir_2316',        -- Certificate of Compensation Payment / Tax Withheld
                            'bir_1601c',       -- Monthly Remittance Return of Income Taxes Withheld
                            'bir_1604cf',      -- Annual Information Return
                            'sss_r3',          -- SSS Contribution Collection List
                            'sss_r1a',         -- SSS Employment Report
                            'sss_salary_loan', -- SSS Salary Loan Report
                            'philhealth_rf1',  -- PhilHealth RF-1 Contribution List
                            'pagibig_mpl',     -- Pag-IBIG MPL Report
                            'pagibig_monthly', -- Pag-IBIG Monthly Remittance (MCRF)
                            'dole_employment_report' -- DOLE 5-in-1 Employment Report
                          )),
  period_type     TEXT    NOT NULL DEFAULT 'monthly'
                          CHECK (period_type IN ('monthly', 'quarterly', 'annual')),
  period_year     INT     NOT NULL,
  period_month    INT     CHECK (period_month BETWEEN 1 AND 12),
  period_quarter  INT     CHECK (period_quarter BETWEEN 1 AND 4),
  status          TEXT    NOT NULL DEFAULT 'draft'
                          CHECK (status IN ('draft', 'generated', 'submitted', 'accepted', 'rejected')),
  generated_at    TIMESTAMPTZ,
  submitted_at    TIMESTAMPTZ,
  file_path       TEXT,
  submission_ref  TEXT,
  notes           TEXT,
  generated_by    UUID    NOT NULL REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_compliance_reports_updated_at
  BEFORE UPDATE ON public.compliance_reports
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── BIR Alphalist Records ──────────────────────────────────────────
CREATE TABLE public.bir_alphalist_records (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id       UUID          NOT NULL REFERENCES public.compliance_reports(id) ON DELETE CASCADE,
  organization_id UUID          NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  employee_id     UUID          NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  tin             TEXT,
  last_name       TEXT          NOT NULL,
  first_name      TEXT          NOT NULL,
  middle_name     TEXT,
  classification  TEXT          NOT NULL DEFAULT 'MWE'
                                CHECK (classification IN ('MWE', 'NMW', 'P', 'HF', 'S')),
  gross_compensation   NUMERIC(14,2) NOT NULL DEFAULT 0,
  non_taxable_comp     NUMERIC(14,2) NOT NULL DEFAULT 0,
  taxable_comp         NUMERIC(14,2) NOT NULL DEFAULT 0,
  tax_withheld         NUMERIC(14,2) NOT NULL DEFAULT 0,
  -- De minimis and exclusions
  thirteenth_month     NUMERIC(14,2) NOT NULL DEFAULT 0,
  other_benefits       NUMERIC(14,2) NOT NULL DEFAULT 0,
  sss_contribution     NUMERIC(14,2) NOT NULL DEFAULT 0,
  philhealth_contrib   NUMERIC(14,2) NOT NULL DEFAULT 0,
  pagibig_contrib      NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── SSS Contribution Records ───────────────────────────────────────
CREATE TABLE public.sss_records (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id       UUID          NOT NULL REFERENCES public.compliance_reports(id) ON DELETE CASCADE,
  organization_id UUID          NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  employee_id     UUID          NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  sss_no          TEXT,
  period_year     INT           NOT NULL,
  period_month    INT           NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  monthly_salary_credit NUMERIC(10,2) NOT NULL DEFAULT 0,
  ee_contribution NUMERIC(10,2) NOT NULL DEFAULT 0,
  er_contribution NUMERIC(10,2) NOT NULL DEFAULT 0,
  ec_contribution NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_contribution NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_mpe          BOOLEAN       NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (report_id, employee_id)
);

-- ── PhilHealth Contribution Records ───────────────────────────────
CREATE TABLE public.philhealth_records (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id       UUID          NOT NULL REFERENCES public.compliance_reports(id) ON DELETE CASCADE,
  organization_id UUID          NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  employee_id     UUID          NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  philhealth_no   TEXT,
  period_year     INT           NOT NULL,
  period_month    INT           NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  basic_salary    NUMERIC(10,2) NOT NULL DEFAULT 0,
  ee_contribution NUMERIC(10,2) NOT NULL DEFAULT 0,
  er_contribution NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (report_id, employee_id)
);

-- ── Pag-IBIG Contribution Records ─────────────────────────────────
CREATE TABLE public.pagibig_records (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id       UUID          NOT NULL REFERENCES public.compliance_reports(id) ON DELETE CASCADE,
  organization_id UUID          NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  employee_id     UUID          NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  pagibig_no      TEXT,
  period_year     INT           NOT NULL,
  period_month    INT           NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  monthly_compensation NUMERIC(10,2) NOT NULL DEFAULT 0,
  ee_contribution NUMERIC(10,2) NOT NULL DEFAULT 0,
  er_contribution NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (report_id, employee_id)
);

-- ── Compliance Remittances (payment records) ───────────────────────
CREATE TABLE public.compliance_remittances (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id       UUID          NOT NULL REFERENCES public.compliance_reports(id) ON DELETE CASCADE,
  organization_id UUID          NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  agency          TEXT          NOT NULL
                                CHECK (agency IN ('bir', 'sss', 'philhealth', 'pagibig')),
  amount          NUMERIC(14,2) NOT NULL,
  payment_date    DATE,
  reference_no    TEXT,
  channel         TEXT          CHECK (channel IN ('online', 'bank', 'cash', 'gcash', 'paymaya')),
  status          TEXT          NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending', 'paid', 'failed')),
  receipt_url     TEXT,
  created_by      UUID          NOT NULL REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_compliance_remittances_updated_at
  BEFORE UPDATE ON public.compliance_remittances
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── Compliance Deadlines Tracker ───────────────────────────────────
CREATE TABLE public.compliance_deadlines (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID    NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  agency          TEXT    NOT NULL
                          CHECK (agency IN ('bir', 'sss', 'philhealth', 'pagibig', 'dole')),
  report_type     TEXT    NOT NULL,
  period_year     INT     NOT NULL,
  period_month    INT     CHECK (period_month BETWEEN 1 AND 12),
  period_quarter  INT     CHECK (period_quarter BETWEEN 1 AND 4),
  due_date        DATE    NOT NULL,
  status          TEXT    NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'filed', 'overdue', 'waived')),
  filed_at        TIMESTAMPTZ,
  report_id       UUID    REFERENCES public.compliance_reports(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_compliance_deadlines_updated_at
  BEFORE UPDATE ON public.compliance_deadlines
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── Indexes ────────────────────────────────────────────────────────
CREATE INDEX idx_compliance_reports_org    ON public.compliance_reports (organization_id, report_type, period_year);
CREATE INDEX idx_bir_alphalist_report      ON public.bir_alphalist_records (report_id);
CREATE INDEX idx_sss_records_report        ON public.sss_records (report_id);
CREATE INDEX idx_philhealth_records_report ON public.philhealth_records (report_id);
CREATE INDEX idx_pagibig_records_report    ON public.pagibig_records (report_id);
CREATE INDEX idx_compliance_deadlines_org  ON public.compliance_deadlines (organization_id, due_date);
CREATE INDEX idx_compliance_remittances    ON public.compliance_remittances (organization_id, agency);

-- ══════════════════════════════════════════════════════════════════
-- RLS Policies
-- ══════════════════════════════════════════════════════════════════

ALTER TABLE public.compliance_reports      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bir_alphalist_records   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sss_records             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.philhealth_records      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagibig_records         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_remittances  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_deadlines    ENABLE ROW LEVEL SECURITY;

-- Org-scoped reads (HR/Accounting only — no employee self-access to compliance data)
CREATE POLICY "org_select_compliance_reports"    ON public.compliance_reports    FOR SELECT TO authenticated USING (organization_id = get_my_org_id());
CREATE POLICY "org_select_bir_alphalist"         ON public.bir_alphalist_records FOR SELECT TO authenticated USING (organization_id = get_my_org_id());
CREATE POLICY "org_select_sss_records"           ON public.sss_records           FOR SELECT TO authenticated USING (organization_id = get_my_org_id());
CREATE POLICY "org_select_philhealth_records"    ON public.philhealth_records    FOR SELECT TO authenticated USING (organization_id = get_my_org_id());
CREATE POLICY "org_select_pagibig_records"       ON public.pagibig_records       FOR SELECT TO authenticated USING (organization_id = get_my_org_id());
CREATE POLICY "org_select_compliance_remittances" ON public.compliance_remittances FOR SELECT TO authenticated USING (organization_id = get_my_org_id());
CREATE POLICY "org_select_compliance_deadlines"  ON public.compliance_deadlines  FOR SELECT TO authenticated USING (organization_id = get_my_org_id());

-- Admin write access
CREATE POLICY "admin_write_compliance_reports"    ON public.compliance_reports    FOR ALL TO authenticated USING (organization_id = get_my_org_id() AND is_admin()) WITH CHECK (organization_id = get_my_org_id());
CREATE POLICY "admin_write_bir_alphalist"         ON public.bir_alphalist_records FOR ALL TO authenticated USING (organization_id = get_my_org_id() AND is_admin()) WITH CHECK (organization_id = get_my_org_id());
CREATE POLICY "admin_write_sss_records"           ON public.sss_records           FOR ALL TO authenticated USING (organization_id = get_my_org_id() AND is_admin()) WITH CHECK (organization_id = get_my_org_id());
CREATE POLICY "admin_write_philhealth_records"    ON public.philhealth_records    FOR ALL TO authenticated USING (organization_id = get_my_org_id() AND is_admin()) WITH CHECK (organization_id = get_my_org_id());
CREATE POLICY "admin_write_pagibig_records"       ON public.pagibig_records       FOR ALL TO authenticated USING (organization_id = get_my_org_id() AND is_admin()) WITH CHECK (organization_id = get_my_org_id());
CREATE POLICY "admin_write_compliance_remittances" ON public.compliance_remittances FOR ALL TO authenticated USING (organization_id = get_my_org_id() AND is_admin()) WITH CHECK (organization_id = get_my_org_id());
CREATE POLICY "admin_write_compliance_deadlines"  ON public.compliance_deadlines  FOR ALL TO authenticated USING (organization_id = get_my_org_id() AND is_admin()) WITH CHECK (organization_id = get_my_org_id());
