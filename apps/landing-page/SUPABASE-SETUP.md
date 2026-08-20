# Supabase Setup Guide — Landing Page

> Reviewed against: `hris-schema.sql` + all migrations in `backend/supabase/migrations/`  
> Last updated: 2026-05-30

---

## Important: Tables Already Exist in Migrations

The three tables the landing page needs (`demo_requests`, `contact_messages`,
`newsletter_subscribers`) are **already defined** in your project's migration
file at:

```
backend/supabase/migrations/20250501000004_landing_page_leads.sql
```

**Do NOT run the CREATE TABLE scripts manually.** Just run the migration file
(Step 1 below). Everything else in this guide is configuration — not schema
creation.

---

## Table of Contents

1. [Run the Migration File](#1-run-the-migration-file)
2. [Actual Table Schemas (for reference)](#2-actual-table-schemas-for-reference)
3. [What the API Routes Insert](#3-what-the-api-routes-insert)
4. [RLS Policy Notes](#4-rls-policy-notes)
5. [Enable Google OAuth](#5-enable-google-oauth)
6. [Environment Variables Checklist](#6-environment-variables-checklist)
7. [How to Verify Everything Works](#7-how-to-verify-everything-works)
8. [Optional: Email Notifications for New Leads](#8-optional-email-notifications-for-new-leads)

---

## 1. Run the Migration File

### Option A — Supabase CLI (recommended)

If you have the Supabase CLI set up, run from the repo root:

```bash
supabase db push
```

This applies all pending migrations in order, including `_004_landing_page_leads.sql`.

### Option B — SQL Editor (manual)

1. Go to **Supabase Dashboard** → your project → **SQL Editor**
2. Click **New query**
3. Open `backend/supabase/migrations/20250501000004_landing_page_leads.sql`
4. Paste the full contents and click **Run**

> Make sure migrations `_001`, `_002`, `_003` have already been applied first
> (they create `organizations`, `auth triggers`, and `seed data` that `_004`
> depends on).

---

## 2. Actual Table Schemas (for reference)

These are the **real** column definitions from your migration and schema files.
The API routes have been written to match these exactly.

### `demo_requests`

```sql
CREATE TABLE public.demo_requests (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT        NOT NULL,   -- full name (first + last combined)
  email          TEXT        NOT NULL,
  phone          TEXT,                   -- nullable
  company        TEXT        NOT NULL,
  company_size   TEXT,                   -- e.g. '11-50'
  industry       TEXT,                   -- e.g. 'Healthcare'
  preferred_date DATE,                   -- nullable
  status         TEXT        NOT NULL DEFAULT 'new'
                             CHECK (status IN ('new','contacted','scheduled','completed','cancelled')),
  notes          TEXT,                   -- preferred_time + message stored here
  ip_hash        TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Note:** There is no `first_name`/`last_name` split, no `preferred_time`
column, and no `message` column. The API route combines these into `name`
and `notes`.

---

### `contact_messages`

```sql
CREATE TABLE public.contact_messages (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL,
  email      TEXT        NOT NULL,
  subject    TEXT        NOT NULL,
  message    TEXT        NOT NULL,
  status     TEXT        NOT NULL DEFAULT 'unread'
                         CHECK (status IN ('unread','read','replied','archived')),
  ip_hash    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Note:** There is no `phone` or `type` column. The API route prepends
`[TYPE]` and `Phone: ...` into the `message` body so no data is lost.

---

### `newsletter_subscribers`

```sql
CREATE TABLE public.newsletter_subscribers (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email             TEXT        NOT NULL UNIQUE,
  status            TEXT        NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending','active','unsubscribed')),
  unsubscribe_token TEXT        NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  subscribed_at     TIMESTAMPTZ,
  unsubscribed_at   TIMESTAMPTZ,
  ip_hash           TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Note:** Uses a `status` enum, not a boolean `active` column. The API route
sets `status = 'active'` and `subscribed_at = NOW()` on insert.

---

### `rate_limits` (also created by `_004`)

```sql
CREATE TABLE public.rate_limits (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_hash    TEXT        NOT NULL,
  action     TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Used for future rate limiting on form submissions (Edge Function). No code
change needed — just needs the table to exist.

---

## 3. What the API Routes Insert

| Route | Table | Columns written |
|---|---|---|
| `POST /api/demo-request` | `demo_requests` | `name`, `email`, `phone`, `company`, `company_size`, `industry`, `preferred_date`, `notes` |
| `POST /api/contact` | `contact_messages` | `name`, `email`, `subject`, `message` (includes type + phone prefix) |
| `POST /api/newsletter` | `newsletter_subscribers` | `email`, `status = 'active'`, `subscribed_at` |

---

## 4. RLS Policy Notes

The migration already includes RLS policies. Here is what they allow:

| Role | `demo_requests` | `contact_messages` | `newsletter_subscribers` |
|---|---|---|---|
| `anon` | INSERT only | INSERT only | INSERT only |
| `authenticated` | SELECT only | SELECT only | SELECT only |
| `service_role` | ALL | ALL | ALL |

**The landing page API routes use the server-side Supabase client** which
runs with service role permissions via the server cookie. This means inserts
go through the `service_role` policy — no issues.

Your team can read all submissions directly in the **Supabase Table Editor**
while logged into any authenticated Supabase account.

> If you want to restrict admin reads to only your own org's users, add a
> separate RLS policy scoped to `auth.uid()` later — not needed for the
> landing page use case.

---

## 5. Enable Google OAuth

### Step 1 — Create OAuth credentials in Google Cloud

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create or select a project
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth 2.0 Client ID**
5. Application type: **Web application**
6. Under **Authorized redirect URIs** add:
   ```
   https://<your-project-ref>.supabase.co/auth/v1/callback
   ```
   Find your project ref in:  
   **Supabase Dashboard → Project Settings → General → Reference ID**
7. Click **Create** — copy the **Client ID** and **Client Secret**

### Step 2 — Enable Google provider in Supabase

1. **Authentication** → **Providers** → find **Google** → toggle **Enabled**
2. Paste **Client ID** and **Client Secret**
3. Click **Save**

### Step 3 — Configure redirect URLs

1. **Authentication** → **URL Configuration**
2. **Site URL** — set to your production domain:
   ```
   https://hrisph.com
   ```
3. **Redirect URLs** — add both:
   ```
   https://hrisph.com/auth/callback
   http://localhost:3000/auth/callback
   ```
4. Click **Save**

---

## 6. Environment Variables Checklist

### `apps/landing-page/.env.local` (local development)

```env
# Supabase project credentials
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>

# Admin dashboard URL (used after login/signup redirect)
NEXT_PUBLIC_ADMIN_URL=https://adminhrisph.vercel.app

# Analytics — only fires after cookie consent is accepted
NEXT_PUBLIC_GA4_ID=G-XXXXXXXXXX
NEXT_PUBLIC_META_PIXEL_ID=XXXXXXXXXX
```

Find `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` at:  
**Supabase Dashboard → Project Settings → API → Project URL / anon public**

### Vercel (production)

Add the same four variables in:  
**Vercel Dashboard → your project → Settings → Environment Variables**

---

## 7. How to Verify Everything Works

### Demo form

1. Run the app locally (`npm run dev`)
2. Click **Get a Demo** anywhere on the page
3. Fill in all required fields and submit
4. Go to **Supabase → Table Editor → demo_requests**
5. A new row should appear with `status = 'new'`
6. Check `notes` column — it should contain the preferred time and message

### Contact form

1. Go to `/contact`
2. Fill in and submit the form
3. Go to **Supabase → Table Editor → contact_messages**
4. A new row should appear with `status = 'unread'`
5. Check the `message` column — it should start with `[INQUIRY_TYPE]` and
   include the phone number if provided

### Newsletter

1. Go to `/blog`
2. Enter an email and click Subscribe
3. Go to **Supabase → Table Editor → newsletter_subscribers**
4. Row should appear with `status = 'active'` and `subscribed_at` set
5. Submit the same email again — should silently succeed, no duplicate row

### Google OAuth

1. Go to `/login`
2. Click **Continue with Google**
3. Complete the Google sign-in flow
4. You should land on the admin dashboard
5. **Supabase → Authentication → Users** — new user should appear

### Auth callback open redirect fix

To verify the security fix is working, paste this in your browser:
```
http://localhost:3000/auth/callback?next=//evil.com
```
You should be redirected to `/` (root), **not** to `evil.com`.

---

## 8. Optional: Email Notifications for New Leads

To get an instant email when someone books a demo or sends a contact message,
set up a **Supabase Database Webhook**:

1. **Supabase Dashboard → Database → Webhooks → Create a new hook**
2. For demo requests:
   - Name: `notify_new_demo_request`
   - Table: `demo_requests` — Event: `INSERT`
3. For contact messages:
   - Name: `notify_new_contact_message`
   - Table: `contact_messages` — Event: `INSERT`
4. Point each webhook to one of:
   - **Resend** — send an email to `hello@hrisph.com`
   - **Make / Zapier** — forward to Slack, Gmail, or HubSpot
   - A custom Next.js API route (`/api/webhooks/new-lead`)

This gives you real-time lead notifications before you build a full admin CRM view.

---

## Summary: What You Need to Do

| # | Action | Where |
|---|---|---|
| 1 | Run migration `_004_landing_page_leads.sql` | Supabase SQL Editor or `supabase db push` |
| 2 | Enable Google OAuth provider | Supabase → Authentication → Providers |
| 3 | Add redirect URLs | Supabase → Authentication → URL Configuration |
| 4 | Set env vars locally | `apps/landing-page/.env.local` |
| 5 | Set env vars in production | Vercel → Environment Variables |
| 6 | (Optional) Set up lead notification webhooks | Supabase → Database → Webhooks |
