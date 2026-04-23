# 🇵🇭 HRIS SaaS Platform — Landing Page

> An Enterprise-Grade Human Resource Information System (HRIS) SaaS Landing Page, built for the Philippine market. Fully compliant with Philippine government mandatories (SSS, Pag-IBIG, PhilHealth, BIR) and the Data Privacy Act of 2012 (RA 10173).

![Next.js](https://img.shields.io/badge/Next.js-14+-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.x-38bdf8?style=flat-square&logo=tailwindcss)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Running the App](#running-the-app)
- [Available Pages](#available-pages)
- [Mock Data](#mock-data)
- [Environment Variables](#environment-variables)
- [Contributing](#contributing)
- [License](#license)

---

## 🧭 Overview

This is the **landing page application** for the HRIS SaaS Platform, part of a larger monorepo. It serves as the public-facing marketing site that showcases features, pricing, testimonials, and lead generation forms — all tailored for Philippine businesses.

This app lives at `apps/landing-page/` within the monorepo.

---

## ✨ Features

### 🏠 Core Sections
- **Hero Section** — Animated headline with Philippine-focused messaging, dual CTA buttons, and trust badges (ISO, SSS, BIR compliant)
- **Features Grid** — 20+ HRIS features showcased with interactive tabs, animated Lucide icons, and competitor comparisons
- **Pricing Section** — 3-tier PHP-denominated plans (Starter, Professional, Enterprise) with monthly/annual toggle, per-employee calculator, and FAQ accordion
- **Testimonials** — Customer logos carousel, testimonial cards with Filipino names, animated stats counters, and case studies
- **Demo Request Form** — Modal form with name, company, email, phone, company size, industry, and preferred demo schedule
- **Contact Page** — Contact form, Metro Manila office details, Google Maps embed, and PH support hours

### 🇵🇭 Philippine Compliance Highlights
- SSS (Social Security System) contribution calculations
- Pag-IBIG Fund (HDMF) integration-ready
- PhilHealth premium computations
- BIR withholding tax tables
- Data Privacy Act of 2012 (RA 10173) compliance section
- Cookie consent banner for Philippine data privacy

### 🎨 Design & UX
- Philippine flag-inspired color palette (blue, red, yellow, white)
- Dark / Light mode toggle
- Fully responsive — mobile, tablet, and desktop
- Framer Motion animations throughout
- WCAG 2.1 AA accessibility compliance
- Loading skeleton screens
- Error boundaries and custom 404 / 500 pages

### 📄 Additional Pages
| Page | Path | Description |
|------|------|-------------|
| About | `/about` | Company story, team, and mission |
| Blog | `/blog` | 6 mock posts on Philippine HR topics |
| Resources | `/resources` | Downloadable guides and e-books |
| Privacy Policy | `/privacy-policy` | RA 10173 compliant policy |
| Terms of Service | `/terms-of-service` | Platform terms |
| Careers | `/careers` | Open job positions |

---

## 🛠 Tech Stack

| Category | Technology |
|----------|-----------|
| Framework | Next.js 14+ (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + Module CSS |
| UI Components | Shadcn/UI + Material UI (MUI) |
| Animations | Framer Motion |
| Forms | React Hook Form + Zod |
| Icons | Lucide React |
| Package Manager | pnpm |

---

## 🗂 Project Structure

```
apps/landing-page/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── about/
│   │   ├── blog/
│   │   ├── careers/
│   │   ├── contact/
│   │   ├── privacy-policy/
│   │   ├── resources/
│   │   ├── terms-of-service/
│   │   ├── layout.tsx
│   │   └── page.tsx            # Homepage
│   ├── components/
│   │   ├── layout/             # Navbar, Footer, Container
│   │   ├── sections/           # Hero, Features, Pricing, etc.
│   │   ├── forms/              # Demo & Contact forms
│   │   └── ui/                 # Reusable UI primitives
│   ├── data/                   # Mock JSON data files
│   │   ├── features.json
│   │   ├── pricing.json
│   │   ├── testimonials.json
│   │   ├── faq.json
│   │   └── team.json
│   ├── hooks/                  # Custom React hooks
│   ├── lib/                    # Utilities and helpers
│   └── styles/                 # Global styles and design tokens
├── public/                     # Static assets
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## ⚙️ Installation

### Prerequisites

Make sure you have the following installed:

- **Node.js** v18.17.0 or higher
- **pnpm** v8 or higher

```bash
# Install pnpm globally if not already installed
npm install -g pnpm
```

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/hris-saas-platform.git
cd hris-saas-platform
```

### 2. Install Dependencies (from monorepo root)

```bash
pnpm install
```

This installs all dependencies for all apps in the monorepo, including the landing page.

### 3. Navigate to the Landing Page App

```bash
cd apps/landing-page
```

### 4. Set Up Environment Variables

```bash
cp .env.example .env.local
```

Then fill in the required values (see [Environment Variables](#environment-variables) below).

---

## 🚀 Running the App

### Development Server

From the monorepo root:

```bash
pnpm --filter landing-page dev
```

Or from within `apps/landing-page/`:

```bash
pnpm dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

### Build for Production

```bash
pnpm --filter landing-page build
```

### Start Production Server

```bash
pnpm --filter landing-page start
```

### Lint

```bash
pnpm --filter landing-page lint
```

---

## 📄 Available Pages

| Route | Description |
|-------|-------------|
| `/` | Homepage — Hero, Features, Pricing, Testimonials |
| `/about` | About the company and team |
| `/blog` | HR blog articles (Philippine market) |
| `/resources` | Free guides and downloadable resources |
| `/contact` | Contact form and office information |
| `/privacy-policy` | Data Privacy Act (RA 10173) compliant policy |
| `/terms-of-service` | Platform terms and conditions |
| `/careers` | Open job listings |

---

## 🗃 Mock Data

All demo data is stored in `/src/data/` as JSON files. No backend is required to run the landing page.

| File | Contents |
|------|----------|
| `features.json` | 20+ HRIS feature descriptions |
| `pricing.json` | 3 pricing tiers in PHP (Starter, Professional, Enterprise) |
| `testimonials.json` | 8 mock Philippine company testimonials |
| `faq.json` | 15 frequently asked questions |
| `team.json` | Company team member profiles |

Form submissions (Demo Request, Contact) are currently logged to the browser console and stored as a local JSON export. Backend integration is handled in a separate app (`apps/hris-backend/`).

---

## 🔐 Environment Variables

Create a `.env.local` file in `apps/landing-page/` with the following:

```env
# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=HRIS Platform

# Analytics (optional — placeholders for now)
NEXT_PUBLIC_GA4_MEASUREMENT_ID=G-XXXXXXXXXX
NEXT_PUBLIC_META_PIXEL_ID=XXXXXXXXXXXXXXXX

# Maps (optional)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

> All variables prefixed with `NEXT_PUBLIC_` are exposed to the browser. Never store secrets with this prefix.

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -m "feat: add your feature"`
4. Push to your branch: `git push origin feature/your-feature-name`
5. Open a Pull Request

Please follow the [Conventional Commits](https://www.conventionalcommits.org/) standard for commit messages.

---

## 📦 Monorepo Structure

This landing page is part of a larger HRIS SaaS monorepo:

```
hris-saas-platform/
├── apps/
│   ├── landing-page/          # ← You are here
│   ├── hris-admin-dashboard/  # Admin dashboard (Next.js)
│   └── hris-backend/          # API server (Node.js / NestJS)
├── packages/
│   ├── ui/                    # Shared UI components
│   ├── config/                # Shared configs (ESLint, TypeScript)
│   └── types/                 # Shared TypeScript types
├── pnpm-workspace.yaml
└── package.json
```

---

## 📜 License

This project is licensed under the **MIT License**. See the [LICENSE](../../LICENSE) file for details.

---

## 🙌 Acknowledgements

- Built for the Philippine market with love 🇵🇭
- Compliant with Philippine statutory requirements: SSS, Pag-IBIG, PhilHealth, BIR
- Adheres to the Data Privacy Act of 2012 (Republic Act No. 10173)

---

<p align="center">Made with ❤️ for Philippine businesses</p>
