# Backend Deployment Guide — Supabase Only

No separate server needed. Everything runs on Supabase.

---

## 1. Create Your Supabase Project

1. Go to https://supabase.com → New Project
2. Name it `hrisph` — choose a region close to PH (Singapore)
3. Save your **database password** — you'll need it once
4. Wait ~2 minutes for provisioning

---

## 2. Get Your Keys

Supabase Dashboard → Settings → API:

| Key | Where to use |
|---|---|
| Project URL | `VITE_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL` |
| `anon` public key | `VITE_SUPABASE_ANON_KEY` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `service_role` key | Backend .env only — never expose to browser |

---

## 3. Configure Supabase Auth

Supabase Dashboard → Authentication → URL Configuration:

```
Site URL:             https://adminhrisph.vercel.app
Redirect URLs (add):  https://hrisph.vercel.app/**
                      https://adminhrisph.vercel.app/**
                      http://localhost:3000/**
                      http://localhost:3001/**
```

---

## 4. Enable the JWT Hook

Supabase Dashboard → Authentication → Hooks:

- **Hook:** `Custom Access Token`
- **Function:** `public.custom_access_token_hook`

This injects `org_id` and `user_role` into every JWT automatically.

---

## 5. Push Migrations

Install Supabase CLI (once):
```bash
npm install -g supabase
```

Link and push:
```bash
cd hris-saas-platform/backend/supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

Your `YOUR_PROJECT_REF` is the string in your Supabase project URL:
`https://YOUR_PROJECT_REF.supabase.co`

---

## 6. Add Env Vars to Vercel

### Landing Page (hrisph.vercel.app)
```
NEXT_PUBLIC_SUPABASE_URL      = https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = your_anon_key
NEXT_PUBLIC_ADMIN_URL         = https://adminhrisph.vercel.app
```

### Admin Dashboard (adminhrisph.vercel.app)
```
VITE_SUPABASE_URL      = https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY = your_anon_key
VITE_LANDING_URL       = https://hrisph.vercel.app
VITE_GEMINI_API_KEY    = your_gemini_key   ← already set
```

---

## 7. Verify the Auth Flow

| Test | Expected result |
|---|---|
| Sign up on landing page | Confirmation email sent → click link → admin `/setup-company` |
| Sign up (email confirm off) | Redirected directly to admin `/setup-company` |
| Sign in on landing page | Redirected to admin dashboard (no re-login) |
| Open admin dashboard directly with active session | Goes straight to dashboard |
| Open admin dashboard with no session | Shows admin login page |
| Sign out from admin | Redirected to landing page `/login` |
| Admin login (no Supabase env vars) | Mock auth with demo accounts |

---

## 8. Local Development

### Without Supabase (default — no setup needed)
The admin dashboard falls back to mock auth automatically when
`VITE_SUPABASE_URL` is not set or is the placeholder value.

Use these demo accounts:
```
admin@hris-demo.ph / Admin@123    (Super Admin)
hr@hris-demo.ph    / HR@123       (HR Manager)
```

### With Supabase locally
```bash
# Terminal 1 — Supabase local stack
cd backend/supabase
supabase start

# Terminal 2 — Admin dashboard
cd apps/hris-admin-dashboard
# Set VITE_SUPABASE_URL=http://127.0.0.1:54321
# Set VITE_SUPABASE_ANON_KEY=<local anon key from `supabase status`>
pnpm dev
```

---

## Phase Progress

| Phase | Status |
|---|---|
| Phase 1 — Foundation & Auth | ✅ Done |
| Phase 2 — Demo Requests & Leads | ⬜ Next |
| Phase 3 — Email Automation | ⬜ Pending |
| Phase 4 — Blog & CMS | ⬜ Pending |
| Phase 5 — Analytics Tracking | ⬜ Pending |
| Phase 6 — Integration & Testing | ⬜ Pending |
