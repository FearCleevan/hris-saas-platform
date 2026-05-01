-- ══════════════════════════════════════════════════════════════════
-- Migration: Payroll Engine
-- Phase 6 — Philippine-compliant payroll
-- Sources: BIR TRAIN Law, SSS 2024, PhilHealth 2024, HDMF 2024
-- ══════════════════════════════════════════════════════════════════

-- ── Payroll Periods ────────────────────────────────────────────────
CREATE TABLE public.payroll_periods (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name            TEXT        NOT NULL,
  frequency       TEXT        NOT NULL DEFAULT 'semi_monthly'
                              CHECK (frequency IN ('weekly', 'bi_weekly', 'semi_monthly', 'monthly')),
  period_start    DATE        NOT NULL,
  period_end      DATE        NOT NULL,
  pay_date        DATE        NOT NULL,
  status          TEXT        NOT NULL DEFAULT 'open'
                              CHECK (status IN ('open', 'processing', 'for_approval', 'approved', 'released', 'closed')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_payroll_periods_updated_at
  BEFORE UPDATE ON public.payroll_periods
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── Payroll Runs ───────────────────────────────────────────────────
CREATE TABLE public.payroll_runs (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  payroll_period_id UUID        NOT NULL REFERENCES public.payroll_periods(id) ON DELETE CASCADE,
  status            TEXT        NOT NULL DEFAULT 'draft'
                                CHECK (status IN ('draft', 'computed', 'reviewed', 'approved', 'released')),
  total_employees   INT         NOT NULL DEFAULT 0,
  total_gross_pay   NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_deductions  NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_net_pay     NUMERIC(14,2) NOT NULL DEFAULT 0,
  computed_at       TIMESTAMPTZ,
  computed_by       UUID        REFERENCES auth.users(id),
  approved_at       TIMESTAMPTZ,
  approved_by       UUID        REFERENCES auth.users(id),
  released_at       TIMESTAMPTZ,
  released_by       UUID        REFERENCES auth.users(id),
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_payroll_runs_updated_at
  BEFORE UPDATE ON public.payroll_runs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── Payslips (per employee per run) ───────────────────────────────
CREATE TABLE public.payslips (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID          NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  payroll_run_id      UUID          NOT NULL REFERENCES public.payroll_runs(id) ON DELETE CASCADE,
  employee_id         UUID          NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  payroll_period_id   UUID          NOT NULL REFERENCES public.payroll_periods(id) ON DELETE CASCADE,
  -- Earnings
  basic_pay           NUMERIC(12,2) NOT NULL DEFAULT 0,
  overtime_pay        NUMERIC(12,2) NOT NULL DEFAULT 0,
  holiday_pay         NUMERIC(12,2) NOT NULL DEFAULT 0,
  night_diff_pay      NUMERIC(12,2) NOT NULL DEFAULT 0,
  allowances          NUMERIC(12,2) NOT NULL DEFAULT 0,
  other_earnings      NUMERIC(12,2) NOT NULL DEFAULT 0,
  gross_pay           NUMERIC(12,2) NOT NULL DEFAULT 0,
  -- Government deductions
  sss_ee              NUMERIC(10,2) NOT NULL DEFAULT 0,
  philhealth_ee       NUMERIC(10,2) NOT NULL DEFAULT 0,
  pagibig_ee          NUMERIC(10,2) NOT NULL DEFAULT 0,
  withholding_tax     NUMERIC(10,2) NOT NULL DEFAULT 0,
  -- Employer share (for reporting)
  sss_er              NUMERIC(10,2) NOT NULL DEFAULT 0,
  philhealth_er       NUMERIC(10,2) NOT NULL DEFAULT 0,
  pagibig_er          NUMERIC(10,2) NOT NULL DEFAULT 0,
  -- Other deductions
  loan_deductions     NUMERIC(10,2) NOT NULL DEFAULT 0,
  late_deductions     NUMERIC(10,2) NOT NULL DEFAULT 0,
  absent_deductions   NUMERIC(10,2) NOT NULL DEFAULT 0,
  other_deductions    NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_deductions    NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_pay             NUMERIC(12,2) NOT NULL DEFAULT 0,
  -- Meta
  days_worked         NUMERIC(5,2)  NOT NULL DEFAULT 0,
  hours_worked        NUMERIC(7,2)  NOT NULL DEFAULT 0,
  status              TEXT          NOT NULL DEFAULT 'draft'
                                    CHECK (status IN ('draft', 'approved', 'released', 'disputed')),
  pdf_url             TEXT,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE (payroll_run_id, employee_id)
);

CREATE TRIGGER set_payslips_updated_at
  BEFORE UPDATE ON public.payslips
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── Payroll Line Items (earnings & deductions detail) ─────────────
CREATE TABLE public.payroll_items (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  payslip_id      UUID          NOT NULL REFERENCES public.payslips(id) ON DELETE CASCADE,
  organization_id UUID          NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  type            TEXT          NOT NULL CHECK (type IN ('earning', 'deduction')),
  category        TEXT          NOT NULL,
  description     TEXT          NOT NULL,
  amount          NUMERIC(12,2) NOT NULL DEFAULT 0,
  is_taxable      BOOLEAN       NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ── Salary Adjustments ─────────────────────────────────────────────
CREATE TABLE public.salary_adjustments (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id     UUID          NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  organization_id UUID          NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  payroll_run_id  UUID          REFERENCES public.payroll_runs(id) ON DELETE SET NULL,
  type            TEXT          NOT NULL CHECK (type IN ('bonus', 'allowance', 'deduction', 'reimbursement', 'adjustment')),
  description     TEXT          NOT NULL,
  amount          NUMERIC(12,2) NOT NULL,
  is_taxable      BOOLEAN       NOT NULL DEFAULT true,
  effective_date  DATE          NOT NULL,
  status          TEXT          NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending', 'approved', 'applied', 'cancelled')),
  approved_by     UUID          REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_salary_adjustments_updated_at
  BEFORE UPDATE ON public.salary_adjustments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── Loans ──────────────────────────────────────────────────────────
CREATE TABLE public.loans (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id      UUID          NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  organization_id  UUID          NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  loan_type        TEXT          NOT NULL
                                 CHECK (loan_type IN ('sss_salary', 'sss_calamity', 'pagibig_mpl', 'pagibig_calamity', 'pagibig_housing', 'company', 'emergency')),
  principal        NUMERIC(12,2) NOT NULL,
  interest_rate    NUMERIC(6,4)  NOT NULL DEFAULT 0,
  term_months      INT           NOT NULL,
  monthly_amort    NUMERIC(10,2) NOT NULL,
  outstanding_balance NUMERIC(12,2) NOT NULL,
  loan_date        DATE          NOT NULL,
  first_deduction_date DATE,
  status           TEXT          NOT NULL DEFAULT 'active'
                                 CHECK (status IN ('pending', 'active', 'paid', 'cancelled', 'defaulted')),
  approved_by      UUID          REFERENCES auth.users(id),
  notes            TEXT,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_loans_updated_at
  BEFORE UPDATE ON public.loans
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── Loan Amortization Schedule ─────────────────────────────────────
CREATE TABLE public.loan_amortization (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id         UUID          NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
  organization_id UUID          NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  period_number   INT           NOT NULL,
  due_date        DATE          NOT NULL,
  amount_due      NUMERIC(10,2) NOT NULL,
  amount_paid     NUMERIC(10,2) NOT NULL DEFAULT 0,
  balance_after   NUMERIC(12,2) NOT NULL DEFAULT 0,
  status          TEXT          NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending', 'paid', 'partial', 'missed')),
  payslip_id      UUID          REFERENCES public.payslips(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ── 13th Month Pay ─────────────────────────────────────────────────
CREATE TABLE public.thirteenth_month_pay (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id     UUID          NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  organization_id UUID          NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  year            INT           NOT NULL,
  total_basic_pay NUMERIC(14,2) NOT NULL DEFAULT 0,
  months_worked   NUMERIC(4,2)  NOT NULL DEFAULT 12,
  amount          NUMERIC(12,2) NOT NULL DEFAULT 0,
  status          TEXT          NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending', 'approved', 'released')),
  payslip_id      UUID          REFERENCES public.payslips(id) ON DELETE SET NULL,
  released_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE (employee_id, year)
);

CREATE TRIGGER set_13th_month_updated_at
  BEFORE UPDATE ON public.thirteenth_month_pay
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── Payroll Dispute ────────────────────────────────────────────────
CREATE TABLE public.payroll_disputes (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  payslip_id      UUID        NOT NULL REFERENCES public.payslips(id) ON DELETE CASCADE,
  employee_id     UUID        NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  organization_id UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  reason          TEXT        NOT NULL,
  status          TEXT        NOT NULL DEFAULT 'open'
                              CHECK (status IN ('open', 'under_review', 'resolved', 'rejected')),
  resolution      TEXT,
  resolved_by     UUID        REFERENCES auth.users(id),
  resolved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_payroll_disputes_updated_at
  BEFORE UPDATE ON public.payroll_disputes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── Indexes ────────────────────────────────────────────────────────
CREATE INDEX idx_payslips_run        ON public.payslips (payroll_run_id);
CREATE INDEX idx_payslips_emp        ON public.payslips (employee_id);
CREATE INDEX idx_payroll_items_slip  ON public.payroll_items (payslip_id);
CREATE INDEX idx_loans_emp           ON public.loans (employee_id, status);
CREATE INDEX idx_loan_amort_loan     ON public.loan_amortization (loan_id);

-- ══════════════════════════════════════════════════════════════════
-- Philippine Tax & Contribution Calculation Functions
-- Sources:
--   SSS: Republic Act 11199, 2024 contribution schedule
--   PhilHealth: PhilHealth Circular 2023-0014 (5% rate, split 50/50)
--   Pag-IBIG: HDMF Circular 274 (2% rate, max ₱100/month EE)
--   BIR: TRAIN Law (RA 10963), annualized withholding tax table
-- ══════════════════════════════════════════════════════════════════

-- ── SSS Contribution Calculator (2024) ────────────────────────────
CREATE OR REPLACE FUNCTION public.compute_sss(monthly_basic NUMERIC)
RETURNS TABLE (ee NUMERIC, er NUMERIC, total NUMERIC)
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  msc NUMERIC; -- Monthly Salary Credit
BEGIN
  -- SSS 2024: MSC range ₱4,000 – ₱30,000, step ₱500
  -- EE rate: 4.5%, ER rate: 9.5%, total: 14%
  msc := LEAST(GREATEST(ROUND(monthly_basic / 500.0) * 500, 4000), 30000);
  RETURN QUERY SELECT
    ROUND(msc * 0.045, 2) AS ee,
    ROUND(msc * 0.095, 2) AS er,
    ROUND(msc * 0.14,  2) AS total;
END;
$$;

-- ── PhilHealth Contribution Calculator (2024) ──────────────────────
CREATE OR REPLACE FUNCTION public.compute_philhealth(monthly_basic NUMERIC)
RETURNS TABLE (ee NUMERIC, er NUMERIC, total NUMERIC)
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  v_total NUMERIC;
BEGIN
  -- PhilHealth 2024: 5% of basic salary, split 50/50
  -- Floor: ₱10,000/mo → ₱500 total (₱250 each)
  -- Ceiling: ₱100,000/mo → ₱5,000 total (₱2,500 each)
  v_total := ROUND(LEAST(GREATEST(monthly_basic, 10000), 100000) * 0.05, 2);
  RETURN QUERY SELECT
    ROUND(v_total / 2, 2) AS ee,
    ROUND(v_total / 2, 2) AS er,
    v_total               AS total;
END;
$$;

-- ── Pag-IBIG / HDMF Contribution Calculator ────────────────────────
CREATE OR REPLACE FUNCTION public.compute_pagibig(monthly_basic NUMERIC)
RETURNS TABLE (ee NUMERIC, er NUMERIC, total NUMERIC)
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  v_ee NUMERIC;
  v_er NUMERIC;
BEGIN
  -- HDMF Circular 274: 2% EE if basic > ₱1,500, else 1%
  -- EE max contribution: ₱100/month
  -- ER: 2% (no cap)
  IF monthly_basic > 1500 THEN
    v_ee := LEAST(ROUND(monthly_basic * 0.02, 2), 100);
  ELSE
    v_ee := LEAST(ROUND(monthly_basic * 0.01, 2), 100);
  END IF;
  v_er := ROUND(LEAST(monthly_basic, 5000) * 0.02, 2);
  RETURN QUERY SELECT v_ee, v_er, v_ee + v_er;
END;
$$;

-- ── BIR Withholding Tax — Annualized Method (TRAIN Law) ────────────
-- Uses the revised withholding tax table effective Jan 1, 2023
CREATE OR REPLACE FUNCTION public.compute_withholding_tax(
  taxable_compensation_ytd NUMERIC,  -- Year-to-date taxable compensation
  periods_in_year          INT       -- 12 monthly, 24 semi-monthly, 26 bi-weekly, 52 weekly
)
RETURNS NUMERIC
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  annual_comp NUMERIC;
  annual_tax  NUMERIC;
  period_tax  NUMERIC;
BEGIN
  -- Annualize the compensation
  annual_comp := taxable_compensation_ytd / (12.0 / (12.0 / periods_in_year)) * periods_in_year;

  -- TRAIN Law tax table (annual):
  -- ₱0 – ₱250,000         : 0%
  -- ₱250,001 – ₱400,000   : 15% of excess over ₱250,000
  -- ₱400,001 – ₱800,000   : ₱22,500 + 20% of excess over ₱400,000
  -- ₱800,001 – ₱2,000,000 : ₱102,500 + 25% of excess over ₱800,000
  -- ₱2,000,001 – ₱8,000,000: ₱402,500 + 30% of excess over ₱2,000,000
  -- Over ₱8,000,000        : ₱2,202,500 + 35% of excess over ₱8,000,000

  IF annual_comp <= 250000 THEN
    annual_tax := 0;
  ELSIF annual_comp <= 400000 THEN
    annual_tax := (annual_comp - 250000) * 0.15;
  ELSIF annual_comp <= 800000 THEN
    annual_tax := 22500 + (annual_comp - 400000) * 0.20;
  ELSIF annual_comp <= 2000000 THEN
    annual_tax := 102500 + (annual_comp - 800000) * 0.25;
  ELSIF annual_comp <= 8000000 THEN
    annual_tax := 402500 + (annual_comp - 2000000) * 0.30;
  ELSE
    annual_tax := 2202500 + (annual_comp - 8000000) * 0.35;
  END IF;

  -- De-annualize back to period tax
  period_tax := ROUND(annual_tax / periods_in_year, 2);
  RETURN GREATEST(period_tax, 0);
END;
$$;

-- ══════════════════════════════════════════════════════════════════
-- RLS Policies
-- ══════════════════════════════════════════════════════════════════

ALTER TABLE public.payroll_periods       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_runs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payslips              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_adjustments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_amortization     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thirteenth_month_pay  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_disputes      ENABLE ROW LEVEL SECURITY;

-- Org-scoped reads
CREATE POLICY "org_select_payroll_periods"  ON public.payroll_periods      FOR SELECT TO authenticated USING (organization_id = get_my_org_id());
CREATE POLICY "org_select_payroll_runs"     ON public.payroll_runs         FOR SELECT TO authenticated USING (organization_id = get_my_org_id());
CREATE POLICY "org_select_payslips"         ON public.payslips             FOR SELECT TO authenticated USING (organization_id = get_my_org_id());
CREATE POLICY "org_select_payroll_items"    ON public.payroll_items        FOR SELECT TO authenticated USING (organization_id = get_my_org_id());
CREATE POLICY "org_select_adjustments"      ON public.salary_adjustments   FOR SELECT TO authenticated USING (organization_id = get_my_org_id());
CREATE POLICY "org_select_loans"            ON public.loans                FOR SELECT TO authenticated USING (organization_id = get_my_org_id());
CREATE POLICY "org_select_loan_amort"       ON public.loan_amortization    FOR SELECT TO authenticated USING (organization_id = get_my_org_id());
CREATE POLICY "org_select_13th"             ON public.thirteenth_month_pay FOR SELECT TO authenticated USING (organization_id = get_my_org_id());
CREATE POLICY "org_select_disputes"         ON public.payroll_disputes     FOR SELECT TO authenticated USING (organization_id = get_my_org_id());

-- Admin/Accountant write access
CREATE POLICY "admin_write_payroll_periods" ON public.payroll_periods      FOR ALL TO authenticated USING (organization_id = get_my_org_id() AND is_admin()) WITH CHECK (organization_id = get_my_org_id());
CREATE POLICY "admin_write_payroll_runs"    ON public.payroll_runs         FOR ALL TO authenticated USING (organization_id = get_my_org_id() AND is_admin()) WITH CHECK (organization_id = get_my_org_id());
CREATE POLICY "admin_write_payslips"        ON public.payslips             FOR ALL TO authenticated USING (organization_id = get_my_org_id() AND is_admin()) WITH CHECK (organization_id = get_my_org_id());
CREATE POLICY "admin_write_payroll_items"   ON public.payroll_items        FOR ALL TO authenticated USING (organization_id = get_my_org_id() AND is_admin()) WITH CHECK (organization_id = get_my_org_id());
CREATE POLICY "admin_write_adjustments"     ON public.salary_adjustments   FOR ALL TO authenticated USING (organization_id = get_my_org_id() AND is_admin()) WITH CHECK (organization_id = get_my_org_id());
CREATE POLICY "admin_write_loans"           ON public.loans                FOR ALL TO authenticated USING (organization_id = get_my_org_id() AND is_admin()) WITH CHECK (organization_id = get_my_org_id());
CREATE POLICY "admin_write_loan_amort"      ON public.loan_amortization    FOR ALL TO authenticated USING (organization_id = get_my_org_id() AND is_admin()) WITH CHECK (organization_id = get_my_org_id());
CREATE POLICY "admin_write_13th"            ON public.thirteenth_month_pay FOR ALL TO authenticated USING (organization_id = get_my_org_id() AND is_admin()) WITH CHECK (organization_id = get_my_org_id());
CREATE POLICY "admin_write_disputes"        ON public.payroll_disputes     FOR ALL TO authenticated USING (organization_id = get_my_org_id() AND is_admin()) WITH CHECK (organization_id = get_my_org_id());

-- Employees can view own payslips and file disputes
CREATE POLICY "self_select_payslip"    ON public.payslips          FOR SELECT TO authenticated USING (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));
CREATE POLICY "self_select_loans"      ON public.loans             FOR SELECT TO authenticated USING (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));
CREATE POLICY "self_select_13th"       ON public.thirteenth_month_pay FOR SELECT TO authenticated USING (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));
CREATE POLICY "self_insert_dispute"    ON public.payroll_disputes   FOR INSERT TO authenticated WITH CHECK (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));
CREATE POLICY "self_select_dispute"    ON public.payroll_disputes   FOR SELECT TO authenticated USING (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));
