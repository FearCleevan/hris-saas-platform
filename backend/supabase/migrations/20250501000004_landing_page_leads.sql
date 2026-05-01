-- ══════════════════════════════════════════════════════════════════
-- Migration: Landing Page — Demo Requests, Contact, Newsletter
-- Phase 2 — Leads & marketing capture
-- ══════════════════════════════════════════════════════════════════

-- ── Demo Requests ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.demo_requests (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT        NOT NULL,
  email          TEXT        NOT NULL,
  phone          TEXT,
  company        TEXT        NOT NULL,
  company_size   TEXT,
  industry       TEXT,
  preferred_date DATE,
  status         TEXT        NOT NULL DEFAULT 'new'
                             CHECK (status IN ('new', 'contacted', 'scheduled', 'completed', 'cancelled')),
  notes          TEXT,
  ip_hash        TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_demo_requests_updated_at
  BEFORE UPDATE ON public.demo_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── Contact Messages ──────────────────────────────────────────────
CREATE TABLE public.contact_messages (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL,
  email      TEXT        NOT NULL,
  subject    TEXT        NOT NULL,
  message    TEXT        NOT NULL,
  status     TEXT        NOT NULL DEFAULT 'unread'
                         CHECK (status IN ('unread', 'read', 'replied', 'archived')),
  ip_hash    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Newsletter Subscribers ────────────────────────────────────────
CREATE TABLE public.newsletter_subscribers (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email             TEXT        NOT NULL UNIQUE,
  status            TEXT        NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending', 'active', 'unsubscribed')),
  unsubscribe_token TEXT        NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  subscribed_at     TIMESTAMPTZ,
  unsubscribed_at   TIMESTAMPTZ,
  ip_hash           TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Rate limiting table (per IP per action) ───────────────────────
CREATE TABLE public.rate_limits (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_hash    TEXT        NOT NULL,
  action     TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rate_limits_lookup ON public.rate_limits (ip_hash, action, created_at);

-- Auto-clean entries older than 1 hour (called from Edge Functions)
CREATE OR REPLACE FUNCTION public.clean_rate_limits()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM public.rate_limits WHERE created_at < NOW() - INTERVAL '1 hour';
END;
$$;

-- ── RLS ───────────────────────────────────────────────────────────
ALTER TABLE public.demo_requests        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits          ENABLE ROW LEVEL SECURITY;

-- Public can insert (forms submit anonymously)
CREATE POLICY "public_insert_demo_requests"
  ON public.demo_requests FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "public_insert_contact_messages"
  ON public.contact_messages FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "public_insert_newsletter"
  ON public.newsletter_subscribers FOR INSERT TO anon WITH CHECK (true);

-- Service role (Edge Functions) can do everything
CREATE POLICY "service_all_demo_requests"
  ON public.demo_requests FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_all_contact_messages"
  ON public.contact_messages FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_all_newsletter"
  ON public.newsletter_subscribers FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_all_rate_limits"
  ON public.rate_limits FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Authenticated admins can read all leads
CREATE POLICY "admin_read_demo_requests"
  ON public.demo_requests FOR SELECT TO authenticated USING (true);

CREATE POLICY "admin_read_contact_messages"
  ON public.contact_messages FOR SELECT TO authenticated USING (true);

CREATE POLICY "admin_read_newsletter"
  ON public.newsletter_subscribers FOR SELECT TO authenticated USING (true);
