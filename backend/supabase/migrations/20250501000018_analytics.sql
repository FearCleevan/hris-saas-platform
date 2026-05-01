-- ══════════════════════════════════════════════════════════════════
-- Migration: Analytics & AI
-- Phase 15
-- ══════════════════════════════════════════════════════════════════

-- ── Dashboard Snapshots (pre-aggregated metrics) ───────────────────
CREATE TABLE public.dashboard_snapshots (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID    NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  snapshot_date   DATE    NOT NULL,
  metric_type     TEXT    NOT NULL
                          CHECK (metric_type IN (
                            'headcount', 'turnover', 'attendance_rate',
                            'leave_utilization', 'overtime_hours',
                            'payroll_cost', 'open_positions',
                            'avg_time_to_hire', 'pending_approvals'
                          )),
  value           NUMERIC(14,4) NOT NULL,
  breakdown       JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, snapshot_date, metric_type)
);

-- ── HR Analytics Reports (saved queries / exports) ─────────────────
CREATE TABLE public.saved_reports (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID    NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name            TEXT    NOT NULL,
  description     TEXT,
  report_type     TEXT    NOT NULL
                          CHECK (report_type IN (
                            'headcount', 'turnover', 'attendance',
                            'leave', 'payroll', 'benefits',
                            'performance', 'recruitment', 'custom'
                          )),
  filters         JSONB   NOT NULL DEFAULT '{}',
  columns         TEXT[]  NOT NULL DEFAULT '{}',
  sort_by         TEXT,
  is_scheduled    BOOLEAN NOT NULL DEFAULT false,
  schedule_cron   TEXT,
  last_run_at     TIMESTAMPTZ,
  created_by      UUID    NOT NULL REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_saved_reports_updated_at
  BEFORE UPDATE ON public.saved_reports
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── AI Insights ────────────────────────────────────────────────────
CREATE TABLE public.ai_insights (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID    NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  insight_type    TEXT    NOT NULL
                          CHECK (insight_type IN (
                            'turnover_risk',
                            'attendance_anomaly',
                            'leave_pattern',
                            'payroll_anomaly',
                            'performance_trend',
                            'recruitment_funnel',
                            'overtime_alert',
                            'compliance_risk'
                          )),
  title           TEXT    NOT NULL,
  summary         TEXT    NOT NULL,
  severity        TEXT    NOT NULL DEFAULT 'info'
                          CHECK (severity IN ('info', 'warning', 'critical')),
  reference_type  TEXT,
  reference_id    UUID,
  employee_id     UUID    REFERENCES public.employees(id) ON DELETE CASCADE,
  data_payload    JSONB,
  is_dismissed    BOOLEAN NOT NULL DEFAULT false,
  dismissed_by    UUID    REFERENCES auth.users(id),
  dismissed_at    TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ,
  generated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── AI Chat History (HR Assistant) ────────────────────────────────
CREATE TABLE public.ai_chat_sessions (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID    NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id         UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_ai_chat_sessions_updated_at
  BEFORE UPDATE ON public.ai_chat_sessions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE public.ai_chat_messages (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID    NOT NULL REFERENCES public.ai_chat_sessions(id) ON DELETE CASCADE,
  organization_id UUID    NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role            TEXT    NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content         TEXT    NOT NULL,
  tokens_used     INT,
  model           TEXT,
  metadata        JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Turnover Tracking ──────────────────────────────────────────────
CREATE TABLE public.turnover_records (
  id                  UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID    NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  employee_id         UUID    NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  department_id       UUID    REFERENCES public.departments(id) ON DELETE SET NULL,
  position_id         UUID    REFERENCES public.positions(id) ON DELETE SET NULL,
  separation_type     TEXT    NOT NULL
                              CHECK (separation_type IN (
                                'resignation', 'termination', 'retirement',
                                'redundancy', 'end_of_contract', 'death', 'abandonment'
                              )),
  separation_date     DATE    NOT NULL,
  tenure_months       INT,
  last_salary         NUMERIC(12,2),
  exit_interview_done BOOLEAN NOT NULL DEFAULT false,
  rehire_eligible     BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Workforce Planning ─────────────────────────────────────────────
CREATE TABLE public.workforce_plans (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID    NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  department_id   UUID    REFERENCES public.departments(id) ON DELETE SET NULL,
  plan_year       INT     NOT NULL,
  current_headcount INT   NOT NULL DEFAULT 0,
  target_headcount  INT   NOT NULL DEFAULT 0,
  planned_hires     INT   NOT NULL DEFAULT 0,
  planned_exits     INT   NOT NULL DEFAULT 0,
  budget_allocation NUMERIC(14,2),
  notes           TEXT,
  status          TEXT    NOT NULL DEFAULT 'draft'
                          CHECK (status IN ('draft', 'approved', 'active', 'closed')),
  created_by      UUID    NOT NULL REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, department_id, plan_year)
);

CREATE TRIGGER set_workforce_plans_updated_at
  BEFORE UPDATE ON public.workforce_plans
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── Indexes ────────────────────────────────────────────────────────
CREATE INDEX idx_dashboard_snapshots_org  ON public.dashboard_snapshots (organization_id, snapshot_date DESC);
CREATE INDEX idx_saved_reports_org        ON public.saved_reports (organization_id);
CREATE INDEX idx_ai_insights_org          ON public.ai_insights (organization_id, insight_type, generated_at DESC);
CREATE INDEX idx_ai_insights_emp          ON public.ai_insights (employee_id);
CREATE INDEX idx_ai_chat_sessions_user    ON public.ai_chat_sessions (user_id, organization_id);
CREATE INDEX idx_ai_chat_messages_session ON public.ai_chat_messages (session_id, created_at);
CREATE INDEX idx_turnover_records_org     ON public.turnover_records (organization_id, separation_date DESC);
CREATE INDEX idx_workforce_plans_org      ON public.workforce_plans (organization_id, plan_year);

-- ══════════════════════════════════════════════════════════════════
-- Materialized View: Monthly Headcount
-- ══════════════════════════════════════════════════════════════════
CREATE MATERIALIZED VIEW public.mv_monthly_headcount AS
SELECT
  e.organization_id,
  date_trunc('month', ee.date_hired)::DATE AS month,
  COUNT(*)                                 AS headcount,
  COUNT(*) FILTER (WHERE e.status = 'active')     AS active,
  COUNT(*) FILTER (WHERE e.status = 'inactive')   AS inactive,
  COUNT(*) FILTER (WHERE e.status = 'resigned')   AS resigned,
  COUNT(*) FILTER (WHERE e.status = 'terminated') AS terminated
FROM public.employees e
JOIN public.employee_employment ee ON ee.employee_id = e.id AND ee.is_current = true
GROUP BY e.organization_id, date_trunc('month', ee.date_hired);

CREATE UNIQUE INDEX idx_mv_headcount ON public.mv_monthly_headcount (organization_id, month);

-- ══════════════════════════════════════════════════════════════════
-- RLS Policies
-- ══════════════════════════════════════════════════════════════════

ALTER TABLE public.dashboard_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_reports       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_insights         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_chat_sessions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_chat_messages    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turnover_records    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workforce_plans     ENABLE ROW LEVEL SECURITY;

-- Dashboard snapshots: admin reads
CREATE POLICY "admin_select_snapshots"    ON public.dashboard_snapshots FOR SELECT TO authenticated USING (organization_id = get_my_org_id() AND is_admin());
CREATE POLICY "admin_write_snapshots"     ON public.dashboard_snapshots FOR ALL    TO authenticated USING (organization_id = get_my_org_id() AND is_admin()) WITH CHECK (organization_id = get_my_org_id());

-- Saved reports: org-scoped read, admin write
CREATE POLICY "org_select_saved_reports"  ON public.saved_reports FOR SELECT TO authenticated USING (organization_id = get_my_org_id());
CREATE POLICY "admin_write_saved_reports" ON public.saved_reports FOR ALL    TO authenticated USING (organization_id = get_my_org_id() AND is_admin()) WITH CHECK (organization_id = get_my_org_id());

-- AI insights: admin reads and dismisses
CREATE POLICY "admin_select_ai_insights"  ON public.ai_insights FOR SELECT TO authenticated USING (organization_id = get_my_org_id() AND is_admin());
CREATE POLICY "admin_write_ai_insights"   ON public.ai_insights FOR ALL    TO authenticated USING (organization_id = get_my_org_id() AND is_admin()) WITH CHECK (organization_id = get_my_org_id());

-- AI chat: users own their sessions
CREATE POLICY "self_select_chat_sessions" ON public.ai_chat_sessions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "self_insert_chat_session"  ON public.ai_chat_sessions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND organization_id = get_my_org_id());
CREATE POLICY "self_select_chat_messages" ON public.ai_chat_messages FOR SELECT TO authenticated USING (session_id IN (SELECT id FROM public.ai_chat_sessions WHERE user_id = auth.uid()));
CREATE POLICY "self_insert_chat_message"  ON public.ai_chat_messages FOR INSERT TO authenticated WITH CHECK (session_id IN (SELECT id FROM public.ai_chat_sessions WHERE user_id = auth.uid()));

-- Turnover records: admin only
CREATE POLICY "admin_select_turnover"     ON public.turnover_records FOR SELECT TO authenticated USING (organization_id = get_my_org_id() AND is_admin());
CREATE POLICY "admin_write_turnover"      ON public.turnover_records FOR ALL    TO authenticated USING (organization_id = get_my_org_id() AND is_admin()) WITH CHECK (organization_id = get_my_org_id());

-- Workforce plans: admin only
CREATE POLICY "admin_select_workforce"    ON public.workforce_plans FOR SELECT TO authenticated USING (organization_id = get_my_org_id() AND is_admin());
CREATE POLICY "admin_write_workforce"     ON public.workforce_plans FOR ALL    TO authenticated USING (organization_id = get_my_org_id() AND is_admin()) WITH CHECK (organization_id = get_my_org_id());
