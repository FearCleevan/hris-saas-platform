-- ══════════════════════════════════════════════════════════════════
-- Migration: Recruitment
-- Phase 12
-- ══════════════════════════════════════════════════════════════════

-- ── Job Postings ───────────────────────────────────────────────────
CREATE TABLE public.job_postings (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID    NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  department_id   UUID    REFERENCES public.departments(id) ON DELETE SET NULL,
  position_id     UUID    REFERENCES public.positions(id) ON DELETE SET NULL,
  title           TEXT    NOT NULL,
  description     TEXT    NOT NULL,
  requirements    TEXT,
  responsibilities TEXT,
  employment_type TEXT    NOT NULL DEFAULT 'regular'
                          CHECK (employment_type IN ('regular', 'probationary', 'contractual', 'project_based', 'part_time', 'internship')),
  work_setup      TEXT    NOT NULL DEFAULT 'on_site'
                          CHECK (work_setup IN ('on_site', 'remote', 'hybrid')),
  location        TEXT,
  salary_min      NUMERIC(12,2),
  salary_max      NUMERIC(12,2),
  is_salary_visible BOOLEAN NOT NULL DEFAULT false,
  headcount       INT     NOT NULL DEFAULT 1,
  status          TEXT    NOT NULL DEFAULT 'draft'
                          CHECK (status IN ('draft', 'open', 'on_hold', 'closed', 'cancelled')),
  posted_at       DATE,
  closes_at       DATE,
  created_by      UUID    NOT NULL REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_job_postings_updated_at
  BEFORE UPDATE ON public.job_postings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── Applicants ─────────────────────────────────────────────────────
CREATE TABLE public.applicants (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID    NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  job_posting_id  UUID    NOT NULL REFERENCES public.job_postings(id) ON DELETE CASCADE,
  first_name      TEXT    NOT NULL,
  last_name       TEXT    NOT NULL,
  email           TEXT    NOT NULL,
  phone           TEXT,
  current_employer TEXT,
  current_position TEXT,
  years_experience INT,
  expected_salary NUMERIC(12,2),
  resume_url      TEXT,
  cover_letter    TEXT,
  source          TEXT    NOT NULL DEFAULT 'direct'
                          CHECK (source IN ('direct', 'linkedin', 'indeed', 'jobstreet', 'kalibrr', 'referral', 'walk_in', 'other')),
  referrer_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  status          TEXT    NOT NULL DEFAULT 'new'
                          CHECK (status IN ('new', 'screening', 'interview', 'assessment', 'offer', 'hired', 'rejected', 'withdrawn')),
  rejected_reason TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_applicants_updated_at
  BEFORE UPDATE ON public.applicants
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── Interview Schedules ────────────────────────────────────────────
CREATE TABLE public.interviews (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id    UUID    NOT NULL REFERENCES public.applicants(id) ON DELETE CASCADE,
  organization_id UUID    NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  job_posting_id  UUID    NOT NULL REFERENCES public.job_postings(id) ON DELETE CASCADE,
  interview_type  TEXT    NOT NULL DEFAULT 'initial'
                          CHECK (interview_type IN ('initial', 'technical', 'hr', 'final', 'panel')),
  round           INT     NOT NULL DEFAULT 1,
  scheduled_at    TIMESTAMPTZ NOT NULL,
  duration_minutes INT   NOT NULL DEFAULT 60,
  format          TEXT    NOT NULL DEFAULT 'in_person'
                          CHECK (format IN ('in_person', 'video', 'phone')),
  meeting_link    TEXT,
  location        TEXT,
  status          TEXT    NOT NULL DEFAULT 'scheduled'
                          CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show', 'rescheduled')),
  overall_rating  INT     CHECK (overall_rating BETWEEN 1 AND 5),
  recommendation  TEXT    CHECK (recommendation IN ('hire', 'reject', 'next_round', 'hold')),
  notes           TEXT,
  created_by      UUID    NOT NULL REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_interviews_updated_at
  BEFORE UPDATE ON public.interviews
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── Interview Interviewers (many-to-many) ─────────────────────────
CREATE TABLE public.interview_interviewers (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id    UUID    NOT NULL REFERENCES public.interviews(id) ON DELETE CASCADE,
  interviewer_id  UUID    NOT NULL REFERENCES auth.users(id),
  rating          INT     CHECK (rating BETWEEN 1 AND 5),
  feedback        TEXT,
  submitted_at    TIMESTAMPTZ,
  UNIQUE (interview_id, interviewer_id)
);

-- ── Job Offers ─────────────────────────────────────────────────────
CREATE TABLE public.job_offers (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id    UUID          NOT NULL REFERENCES public.applicants(id) ON DELETE CASCADE,
  organization_id UUID          NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  job_posting_id  UUID          NOT NULL REFERENCES public.job_postings(id) ON DELETE CASCADE,
  offered_salary  NUMERIC(12,2) NOT NULL,
  start_date      DATE          NOT NULL,
  offer_letter_url TEXT,
  status          TEXT          NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending', 'accepted', 'negotiating', 'declined', 'withdrawn', 'expired')),
  expires_at      DATE,
  accepted_at     TIMESTAMPTZ,
  declined_at     TIMESTAMPTZ,
  decline_reason  TEXT,
  created_by      UUID          NOT NULL REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_job_offers_updated_at
  BEFORE UPDATE ON public.job_offers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── Recruitment Pipeline Notes ─────────────────────────────────────
CREATE TABLE public.applicant_notes (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id    UUID    NOT NULL REFERENCES public.applicants(id) ON DELETE CASCADE,
  organization_id UUID    NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  note            TEXT    NOT NULL,
  is_private      BOOLEAN NOT NULL DEFAULT false,
  created_by      UUID    NOT NULL REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ────────────────────────────────────────────────────────
CREATE INDEX idx_job_postings_org        ON public.job_postings (organization_id, status);
CREATE INDEX idx_applicants_job          ON public.applicants (job_posting_id, status);
CREATE INDEX idx_applicants_org          ON public.applicants (organization_id, status);
CREATE INDEX idx_interviews_applicant    ON public.interviews (applicant_id);
CREATE INDEX idx_job_offers_applicant    ON public.job_offers (applicant_id);
CREATE INDEX idx_applicant_notes_app     ON public.applicant_notes (applicant_id);

-- ══════════════════════════════════════════════════════════════════
-- RLS Policies
-- ══════════════════════════════════════════════════════════════════

ALTER TABLE public.job_postings           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applicants             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interviews             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_interviewers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_offers             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applicant_notes        ENABLE ROW LEVEL SECURITY;

-- Org-scoped reads
CREATE POLICY "org_select_job_postings"    ON public.job_postings           FOR SELECT TO authenticated USING (organization_id = get_my_org_id());
CREATE POLICY "org_select_applicants"      ON public.applicants             FOR SELECT TO authenticated USING (organization_id = get_my_org_id());
CREATE POLICY "org_select_interviews"      ON public.interviews             FOR SELECT TO authenticated USING (organization_id = get_my_org_id());
CREATE POLICY "org_select_interviewers"    ON public.interview_interviewers FOR SELECT TO authenticated USING (interview_id IN (SELECT id FROM public.interviews WHERE organization_id = get_my_org_id()));
CREATE POLICY "org_select_job_offers"      ON public.job_offers             FOR SELECT TO authenticated USING (organization_id = get_my_org_id());
CREATE POLICY "org_select_applicant_notes" ON public.applicant_notes        FOR SELECT TO authenticated USING (organization_id = get_my_org_id());

-- Admin write access
CREATE POLICY "admin_write_job_postings"    ON public.job_postings           FOR ALL TO authenticated USING (organization_id = get_my_org_id() AND is_admin()) WITH CHECK (organization_id = get_my_org_id());
CREATE POLICY "admin_write_applicants"      ON public.applicants             FOR ALL TO authenticated USING (organization_id = get_my_org_id() AND is_admin()) WITH CHECK (organization_id = get_my_org_id());
CREATE POLICY "admin_write_interviews"      ON public.interviews             FOR ALL TO authenticated USING (organization_id = get_my_org_id() AND is_admin()) WITH CHECK (organization_id = get_my_org_id());
CREATE POLICY "admin_write_interviewers"    ON public.interview_interviewers FOR ALL TO authenticated USING (interview_id IN (SELECT id FROM public.interviews WHERE organization_id = get_my_org_id()) AND is_admin());
CREATE POLICY "admin_write_job_offers"      ON public.job_offers             FOR ALL TO authenticated USING (organization_id = get_my_org_id() AND is_admin()) WITH CHECK (organization_id = get_my_org_id());
CREATE POLICY "admin_write_applicant_notes" ON public.applicant_notes        FOR ALL TO authenticated USING (organization_id = get_my_org_id() AND is_admin()) WITH CHECK (organization_id = get_my_org_id());

-- Interviewers: submit their own feedback
CREATE POLICY "self_update_interview_feedback" ON public.interview_interviewers FOR UPDATE TO authenticated
  USING (interviewer_id = auth.uid())
  WITH CHECK (interviewer_id = auth.uid());

-- Public job postings readable by anonymous (for career page)
CREATE POLICY "public_select_open_jobs" ON public.job_postings FOR SELECT TO anon
  USING (status = 'open');
