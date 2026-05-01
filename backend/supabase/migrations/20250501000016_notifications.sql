-- ══════════════════════════════════════════════════════════════════
-- Migration: Notifications & Email
-- Phase 13
-- ══════════════════════════════════════════════════════════════════

-- ── Notification Templates ─────────────────────────────────────────
CREATE TABLE public.notification_templates (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID    REFERENCES public.organizations(id) ON DELETE CASCADE,
  event_type      TEXT    NOT NULL,
  channel         TEXT    NOT NULL
                          CHECK (channel IN ('in_app', 'email', 'sms')),
  subject         TEXT,
  body            TEXT    NOT NULL,
  is_system       BOOLEAN NOT NULL DEFAULT false,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, event_type, channel)
);

CREATE TRIGGER set_notification_templates_updated_at
  BEFORE UPDATE ON public.notification_templates
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── In-App Notifications ───────────────────────────────────────────
CREATE TABLE public.notifications (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID    NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  recipient_id    UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type      TEXT    NOT NULL,
  title           TEXT    NOT NULL,
  body            TEXT    NOT NULL,
  action_url      TEXT,
  reference_type  TEXT,
  reference_id    UUID,
  is_read         BOOLEAN NOT NULL DEFAULT false,
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Email Queue ────────────────────────────────────────────────────
CREATE TABLE public.email_queue (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID    REFERENCES public.organizations(id) ON DELETE SET NULL,
  recipient_email TEXT    NOT NULL,
  recipient_name  TEXT,
  subject         TEXT    NOT NULL,
  html_body       TEXT    NOT NULL,
  text_body       TEXT,
  reply_to        TEXT,
  template_id     UUID    REFERENCES public.notification_templates(id) ON DELETE SET NULL,
  reference_type  TEXT,
  reference_id    UUID,
  status          TEXT    NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'sending', 'sent', 'failed', 'cancelled')),
  attempts        INT     NOT NULL DEFAULT 0,
  last_attempted_at TIMESTAMPTZ,
  sent_at         TIMESTAMPTZ,
  error_message   TEXT,
  provider_message_id TEXT,
  scheduled_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Notification Preferences ───────────────────────────────────────
CREATE TABLE public.notification_preferences (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID    NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  event_type      TEXT    NOT NULL,
  in_app          BOOLEAN NOT NULL DEFAULT true,
  email           BOOLEAN NOT NULL DEFAULT true,
  sms             BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, organization_id, event_type)
);

CREATE TRIGGER set_notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── Indexes ────────────────────────────────────────────────────────
CREATE INDEX idx_notifications_recipient ON public.notifications (recipient_id, is_read, created_at DESC);
CREATE INDEX idx_notifications_org       ON public.notifications (organization_id, created_at DESC);
CREATE INDEX idx_email_queue_status      ON public.email_queue (status, scheduled_at);
CREATE INDEX idx_notif_prefs_user        ON public.notification_preferences (user_id, organization_id);

-- ── Seed system-level notification event types ─────────────────────
INSERT INTO public.notification_templates
  (organization_id, event_type, channel, subject, body, is_system, is_active)
VALUES
  -- Leave events
  (NULL, 'leave_request_submitted',  'in_app', NULL,                          'Your leave request for {{dates}} has been submitted.',             true, true),
  (NULL, 'leave_request_approved',   'in_app', NULL,                          'Your leave request for {{dates}} has been approved.',              true, true),
  (NULL, 'leave_request_rejected',   'in_app', NULL,                          'Your leave request for {{dates}} was rejected. Reason: {{reason}}.',true, true),
  (NULL, 'leave_request_submitted',  'email',  'Leave Request Received',      'Hi {{name}}, your leave request from {{start}} to {{end}} has been submitted for approval.', true, true),
  (NULL, 'leave_request_approved',   'email',  'Leave Request Approved',      'Hi {{name}}, your leave request from {{start}} to {{end}} has been approved.',               true, true),
  (NULL, 'leave_request_rejected',   'email',  'Leave Request Not Approved',  'Hi {{name}}, your leave request was not approved. Reason: {{reason}}.',                      true, true),
  -- Payroll events
  (NULL, 'payslip_released',         'in_app', NULL,                          'Your payslip for {{period}} is now available.',                    true, true),
  (NULL, 'payslip_released',         'email',  'Your Payslip is Ready',       'Hi {{name}}, your payslip for {{period}} has been released. Log in to view it.',              true, true),
  -- Expense events
  (NULL, 'expense_approved',         'in_app', NULL,                          'Your expense claim "{{title}}" has been approved.',                true, true),
  (NULL, 'expense_rejected',         'in_app', NULL,                          'Your expense claim "{{title}}" was rejected. Reason: {{reason}}.', true, true),
  -- Attendance events
  (NULL, 'overtime_approved',        'in_app', NULL,                          'Your overtime request on {{date}} has been approved.',             true, true),
  (NULL, 'correction_approved',      'in_app', NULL,                          'Your attendance correction for {{date}} has been approved.',       true, true),
  -- Document / e-signature
  (NULL, 'document_signature_request','in_app', NULL,                         'You have a document pending your signature: {{title}}.',           true, true),
  (NULL, 'document_signature_request','email',  'Action Required: Sign Document', 'Hi {{name}}, please sign the document "{{title}}" by {{due_date}}.', true, true),
  -- Recruitment
  (NULL, 'interview_scheduled',      'email',  'Interview Scheduled',         'Hi {{name}}, your interview for {{position}} is scheduled on {{datetime}}.',                  true, true),
  (NULL, 'offer_sent',               'email',  'Job Offer — {{position}}',    'Hi {{name}}, congratulations! Please find your job offer attached.',                          true, true),
  -- Loan
  (NULL, 'loan_approved',            'in_app', NULL,                          'Your loan application of {{amount}} has been approved.',           true, true),
  (NULL, 'loan_disbursed',           'in_app', NULL,                          'Your loan of {{amount}} has been disbursed.',                      true, true),
  -- Performance
  (NULL, 'review_cycle_started',     'in_app', NULL,                          'The {{cycle}} performance review cycle has started. Please complete your self-assessment by {{due_date}}.', true, true),
  (NULL, 'review_cycle_started',     'email',  'Performance Review Started',  'Hi {{name}}, the {{cycle}} performance review has started. Please submit your self-assessment by {{due_date}}.', true, true)
ON CONFLICT (organization_id, event_type, channel) DO NOTHING;

-- ══════════════════════════════════════════════════════════════════
-- RLS Policies
-- ══════════════════════════════════════════════════════════════════

ALTER TABLE public.notification_templates   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_queue             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Notification templates: org-scoped reads + system templates visible to all
CREATE POLICY "org_select_notif_templates"   ON public.notification_templates FOR SELECT TO authenticated
  USING (organization_id = get_my_org_id() OR organization_id IS NULL);
CREATE POLICY "admin_write_notif_templates"  ON public.notification_templates FOR ALL TO authenticated
  USING (organization_id = get_my_org_id() AND is_admin()) WITH CHECK (organization_id = get_my_org_id());

-- In-app notifications: users read/update only their own
CREATE POLICY "self_select_notifications"    ON public.notifications FOR SELECT TO authenticated
  USING (recipient_id = auth.uid());
CREATE POLICY "self_update_notification"     ON public.notifications FOR UPDATE TO authenticated
  USING (recipient_id = auth.uid()) WITH CHECK (recipient_id = auth.uid());
CREATE POLICY "admin_insert_notifications"   ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_my_org_id() AND is_admin());

-- Email queue: admin read, service_role manages delivery
CREATE POLICY "admin_select_email_queue"     ON public.email_queue FOR SELECT TO authenticated
  USING (organization_id = get_my_org_id() AND is_admin());
CREATE POLICY "admin_insert_email_queue"     ON public.email_queue FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_my_org_id() AND is_admin());

-- Notification preferences: users manage their own
CREATE POLICY "self_select_notif_prefs"      ON public.notification_preferences FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "self_upsert_notif_prefs"      ON public.notification_preferences FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND organization_id = get_my_org_id());
CREATE POLICY "self_update_notif_prefs"      ON public.notification_preferences FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
