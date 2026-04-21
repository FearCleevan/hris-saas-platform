# HRIS SaaS Platform

Enterprise Human Resource Information System (HRIS) SaaS platform targeting the Philippines market.

## Tech Stack

- **Monorepo**: Turborepo + pnpm workspaces
- **Language**: TypeScript
- **Backend**: Supabase (PostgreSQL + Auth + Edge Functions)
- **Apps**: Next.js (landing), React + Vite (dashboards), React Native (mobile)

## Folder Structure

```
hris-saas-platform/
├── apps/
│   ├── landing-page/              # Next.js marketing site
│   ├── hris-admin-dashboard/      # React + Vite - HR admin panel
│   ├── employee-portal-web/       # React + Vite - Employee self-service
│   ├── employee-portal-mobile/    # React Native - Mobile app
│   └── superadmin-dashboard/      # React + Vite - Platform superadmin
├── packages/
│   ├── ui-components/             # Shared Shadcn + MUI components
│   ├── shared-types/              # Shared TypeScript types
│   ├── shared-utils/              # PH-specific utilities (tax, contributions)
│   └── supabase-client/           # Shared Supabase config + types
└── backend/
    └── supabase/
        ├── migrations/            # Database migrations
        ├── functions/             # Edge Functions
        └── modules/               # Domain modules
```

## Setup Instructions

### Prerequisites

- Node.js >= 20.0.0
- pnpm >= 9.0.0

```bash
npm install -g pnpm
```

### Install Dependencies

```bash
cd hris-saas-platform
pnpm install
```

### Environment Variables

Copy `.env.example` to `.env.local` in each app and fill in Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Development Commands

```bash
# Install all dependencies
pnpm install

# Run all apps in dev mode
pnpm dev

# Build all packages and apps
pnpm build

# Lint all packages
pnpm lint

# Type-check all packages
pnpm type-check

# Run tests
pnpm test

# Format code
pnpm format
```

## Philippine Compliance

The `shared-utils` package includes pre-built calculators for:

- **SSS** - 2024 contribution table (R.A. 11199)
- **PhilHealth** - 5% premium rate (Circular 2023-0009)
- **Pag-IBIG** - HDMF contributions (Circular 274)
- **BIR** - TRAIN Law withholding tax
- **Overtime** - PH Labor Code rates
- **Holidays** - PH regular & special holidays (2024-2025)

## Architecture

Multi-tenant SaaS with row-level security (RLS) in Supabase. Each company (organization) is isolated at the database level.
