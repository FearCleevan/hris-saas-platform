'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calculator, Shield, Heart, Home, FileText, Clock, Timer,
  Calendar, Users, UserPlus, TrendingUp, Gift, Receipt,
  CreditCard, BarChart3, Smartphone, Building2, GitBranch,
  Search, Plug, Code, CheckCircle2, X, ChevronRight,
} from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { AnimateIn } from '@/components/ui/AnimateIn';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import featuresData from '@/data/features.json';

const iconMap: Record<string, React.ElementType> = {
  Calculator, Shield, Heart, Home, FileText, Clock, Timer,
  Calendar, Users, UserPlus, TrendingUp, Gift, Receipt,
  CreditCard, BarChart3, Smartphone, Building2, GitBranch,
  Search, Plug, Code,
};

const categories = [
  'All',
  'Government Compliance',
  'Payroll & Compensation',
  'Time & Attendance',
  'Employee Management',
  'Reports & Analytics',
  'Enterprise Features',
];

/* ─── Philippine Compliance Detail Data ─────────────────────────────────── */
const complianceModules = [
  {
    id: 'sss',
    label: 'SSS',
    fullName: 'Social Security System',
    law: 'R.A. 11199 (2024 Table)',
    color: 'bg-[#0038a8]',
    lightColor: 'bg-[#0038a8]/10',
    textColor: 'text-[#0038a8] dark:text-blue-400',
    borderColor: 'border-[#0038a8]/30',
    icon: Shield,
    details: [
      '2024 contribution table (14% total rate)',
      'Employer & employee shares auto-split',
      'MPF (Mandatory Provident Fund) included',
      'R3 monthly report generation',
      'Electronic filing format (e-Payment ready)',
      'Retroactive adjustment support',
    ],
    mockValue: { label: 'Employee Share', value: '₱900', sub: 'on ₱20,000 salary' },
  },
  {
    id: 'philhealth',
    label: 'PhilHealth',
    fullName: 'Philippine Health Insurance',
    law: 'Circular 2023-0009 (5% rate)',
    color: 'bg-green-600',
    lightColor: 'bg-green-500/10',
    textColor: 'text-green-700 dark:text-green-400',
    borderColor: 'border-green-500/30',
    icon: Heart,
    details: [
      '5% premium rate effective 2024',
      'Min ₱500 / Max ₱5,000 monthly premium',
      '50/50 employer-employee split',
      'RF-1 contribution report generation',
      'MDR (Member Data Record) updates',
      'Direct remittance tracking',
    ],
    mockValue: { label: 'Employee Share', value: '₱500', sub: 'on ₱20,000 salary' },
  },
  {
    id: 'pagibig',
    label: 'Pag-IBIG',
    fullName: 'Home Development Mutual Fund',
    law: 'HDMF Circular 274',
    color: 'bg-[#ce1126]',
    lightColor: 'bg-[#ce1126]/10',
    textColor: 'text-[#ce1126] dark:text-red-400',
    borderColor: 'border-[#ce1126]/30',
    icon: Home,
    details: [
      '2% rate on max ₱5,000 MBC',
      '1% rate for salary ≤ ₱1,500',
      'Pag-IBIG loan deduction automation',
      'MCRF report generation',
      'Housing loan amortization tracking',
      'MPF (Multi-Purpose Fund) support',
    ],
    mockValue: { label: 'Employee Share', value: '₱100', sub: 'on ₱20,000 salary' },
  },
  {
    id: 'bir',
    label: 'BIR',
    fullName: 'Bureau of Internal Revenue',
    law: 'TRAIN Law (R.A. 10963)',
    color: 'bg-[#fcd116]',
    lightColor: 'bg-[#fcd116]/10',
    textColor: 'text-amber-700 dark:text-yellow-400',
    borderColor: 'border-[#fcd116]/30',
    icon: FileText,
    details: [
      'TRAIN Law withholding tax table (2023+)',
      'Automatic taxable income computation',
      'BIR Form 2316 generation (year-end)',
      'Alphalist (SAWT) submission ready',
      '13th month pay exemption handling',
      'Non-taxable allowance management',
    ],
    mockValue: { label: 'Monthly Tax', value: '₱2,500', sub: 'on ₱20,000 salary' },
  },
];

/* ─── Competitor Comparison Data ────────────────────────────────────────── */
const comparisonFeatures = [
  { feature: 'PH-specific payroll', us: true, competitorA: false, competitorB: 'partial' },
  { feature: 'SSS 2024 auto-compute', us: true, competitorA: false, competitorB: false },
  { feature: 'BIR TRAIN Law (2023+)', us: true, competitorA: false, competitorB: 'partial' },
  { feature: 'PhilHealth 5% rate', us: true, competitorA: false, competitorB: false },
  { feature: 'PH holiday calendar', us: true, competitorA: false, competitorB: false },
  { feature: 'Labor Code OT rates', us: true, competitorA: false, competitorB: 'partial' },
  { feature: 'BIR Form 2316', us: true, competitorA: false, competitorB: false },
  { feature: 'Multi-company support', us: true, competitorA: true, competitorB: true },
  { feature: 'Mobile app (iOS/Android)', us: true, competitorA: 'partial', competitorB: true },
  { feature: 'Employee self-service', us: true, competitorA: true, competitorB: true },
  { feature: 'API & Webhooks', us: true, competitorA: true, competitorB: 'partial' },
  { feature: 'Local PH support team', us: true, competitorA: false, competitorB: false },
];

function ComparisonCell({ value }: { value: boolean | string }) {
  if (value === true) return <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto" />;
  if (value === false) return <X className="h-5 w-5 text-muted-foreground/40 mx-auto" />;
  return (
    <span className="text-xs text-amber-600 dark:text-amber-400 font-medium mx-auto block text-center">
      Partial
    </span>
  );
}

/* ─── Feature Card ───────────────────────────────────────────────────────── */
function FeatureCard({
  feature,
  index,
}: {
  feature: (typeof featuresData)[0];
  index: number;
}) {
  const Icon = iconMap[feature.icon] ?? Shield;
  return (
    <AnimateIn delay={index * 0.05} direction="up">
      <div
        className={cn(
          'group relative flex flex-col gap-3 rounded-xl border border-border bg-card p-5 transition-all duration-300',
          'hover:border-[#0038a8]/40 hover:shadow-lg hover:shadow-[#0038a8]/5',
          feature.highlight && 'border-[#0038a8]/30 bg-[#0038a8]/5 dark:bg-[#0038a8]/10',
        )}
      >
        {feature.highlight && (
          <Badge className="absolute -top-2.5 right-4 bg-[#0038a8] text-white text-[10px] px-2 py-0.5">
            PH Compliance
          </Badge>
        )}
        <div
          className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110',
            feature.highlight
              ? 'bg-[#0038a8]/20 text-[#0038a8] dark:text-blue-400'
              : 'bg-muted text-muted-foreground group-hover:bg-[#0038a8]/10 group-hover:text-[#0038a8]',
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-semibold text-sm text-foreground">{feature.title}</h3>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            {feature.description}
          </p>
        </div>
        <div className="flex items-center gap-1 text-xs font-medium text-[#0038a8] dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
          Learn more <ChevronRight className="h-3 w-3" />
        </div>
      </div>
    </AnimateIn>
  );
}

/* ─── Compliance Module Tab ──────────────────────────────────────────────── */
function ComplianceDetail({ module }: { module: (typeof complianceModules)[0] }) {
  const Icon = module.icon;
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start"
    >
      {/* Details */}
      <div className="flex flex-col gap-4">
        <div className={cn('flex items-center gap-3 p-4 rounded-xl border', module.lightColor, module.borderColor)}>
          <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center text-white', module.color)}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className={cn('font-bold text-sm', module.textColor)}>{module.fullName}</p>
            <p className="text-xs text-muted-foreground">{module.law}</p>
          </div>
        </div>
        <ul className="flex flex-col gap-2.5">
          {module.details.map((detail) => (
            <li key={detail} className="flex items-start gap-2.5 text-sm text-foreground">
              <CheckCircle2 className={cn('h-4 w-4 mt-0.5 shrink-0', module.textColor)} />
              {detail}
            </li>
          ))}
        </ul>
      </div>

      {/* Mock computation card */}
      <div className={cn('rounded-xl border p-5 flex flex-col gap-4', module.lightColor, module.borderColor)}>
        <p className="text-sm font-semibold text-foreground">Sample Computation</p>
        <div className="bg-background rounded-lg p-4 flex flex-col gap-3">
          <div className="flex justify-between items-center text-sm border-b border-border pb-2">
            <span className="text-muted-foreground">Monthly Salary</span>
            <span className="font-semibold">₱20,000.00</span>
          </div>
          {module.id === 'bir' && (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Less: SSS</span>
                <span>- ₱900.00</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Less: PhilHealth</span>
                <span>- ₱500.00</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Less: Pag-IBIG</span>
                <span>- ₱100.00</span>
              </div>
              <div className="flex justify-between text-sm border-t border-border pt-2">
                <span className="text-muted-foreground">Taxable Income</span>
                <span className="font-semibold">₱18,500.00</span>
              </div>
            </>
          )}
          <div className={cn('flex justify-between items-center rounded-lg px-3 py-2', module.lightColor)}>
            <span className={cn('font-semibold text-sm', module.textColor)}>
              {module.mockValue.label}
            </span>
            <div className="text-right">
              <p className={cn('text-xl font-extrabold', module.textColor)}>
                {module.mockValue.value}
              </p>
              <p className="text-xs text-muted-foreground">{module.mockValue.sub}</p>
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          ✓ Auto-computed every payroll run. Table updated automatically.
        </p>
      </div>
    </motion.div>
  );
}

/* ─── Main Section ───────────────────────────────────────────────────────── */
export function FeaturesSection() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeCompliance, setActiveCompliance] = useState('sss');

  const filtered =
    activeCategory === 'All'
      ? featuresData
      : featuresData.filter((f) => f.category === activeCategory);

  const activeModule = complianceModules.find((m) => m.id === activeCompliance)!;

  return (
    <section id="features" className="py-20 lg:py-28">
      <Container>
        {/* ── Section header ── */}
        <AnimateIn className="text-center max-w-2xl mx-auto mb-12">
          <Badge variant="outline" className="mb-4 rounded-full px-3 py-1 border-[#0038a8]/30 text-[#0038a8] dark:text-blue-400">
            Everything you need
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground mb-4">
            Built for Philippine HR, <span className="text-[#ce1126]">from the ground up</span>
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            21 powerful modules covering every aspect of HR operations — all pre-wired for
            Philippine government compliance.
          </p>
        </AnimateIn>

        {/* ── Philippine Compliance Highlight ── */}
        <AnimateIn className="mb-20">
          <div className="rounded-2xl border border-[#0038a8]/20 bg-gradient-to-br from-[#0038a8]/5 to-[#ce1126]/5 p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0038a8] text-white shrink-0">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-foreground">
                  🇵🇭 Philippine Government Compliance — Built In
                </h3>
                <p className="text-sm text-muted-foreground">
                  SSS · PhilHealth · Pag-IBIG · BIR — all auto-computed, always up to date
                </p>
              </div>
            </div>

            {/* Compliance tabs */}
            <div className="flex flex-wrap gap-2 mb-6">
              {complianceModules.map((mod) => (
                <button
                  key={mod.id}
                  onClick={() => setActiveCompliance(mod.id)}
                  className={cn(
                    'px-4 py-2 rounded-full text-sm font-semibold border transition-all duration-200',
                    activeCompliance === mod.id
                      ? cn(mod.color, 'text-white border-transparent shadow-md')
                      : cn('border-border bg-background text-muted-foreground hover:border-foreground/30'),
                  )}
                >
                  {mod.label}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <ComplianceDetail key={activeCompliance} module={activeModule} />
            </AnimatePresence>
          </div>
        </AnimateIn>

        {/* ── Feature Grid ── */}
        <AnimateIn className="mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <h3 className="text-2xl font-bold text-foreground">All Features</h3>
            <div className="flex flex-wrap gap-2">
              {categories.slice(0, 5).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                    activeCategory === cat
                      ? 'bg-[#0038a8] text-white border-transparent'
                      : 'border-border text-muted-foreground hover:border-foreground/30 bg-background',
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </AnimateIn>

        <motion.div
          layout
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          <AnimatePresence>
            {filtered.map((feature, i) => (
              <motion.div
                key={feature.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <FeatureCard feature={feature} index={i} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        {/* ── Competitor Comparison ── */}
        <AnimateIn className="mt-20">
          <div className="text-center mb-8">
            <h3 className="text-2xl sm:text-3xl font-extrabold text-foreground mb-2">
              Why choose <span className="text-[#0038a8]">HRISPH</span> over the rest?
            </h3>
            <p className="text-muted-foreground">
              Most HRIS tools are built for the US or global market. We&apos;re built exclusively for
              the Philippines.
            </p>
          </div>

          <div className="rounded-2xl border border-border overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-4 bg-muted/60 border-b border-border">
              <div className="p-4 text-sm font-semibold text-muted-foreground">Feature</div>
              <div className="p-4 text-center">
                <div className="text-sm font-bold text-[#0038a8] dark:text-blue-400">HRISPH</div>
                <div className="text-[10px] text-muted-foreground">Made for PH</div>
              </div>
              <div className="p-4 text-center border-l border-border">
                <div className="text-sm font-semibold text-muted-foreground">Global HRIS A</div>
                <div className="text-[10px] text-muted-foreground">US-based</div>
              </div>
              <div className="p-4 text-center border-l border-border">
                <div className="text-sm font-semibold text-muted-foreground">Global HRIS B</div>
                <div className="text-[10px] text-muted-foreground">SG-based</div>
              </div>
            </div>

            {/* Table rows */}
            {comparisonFeatures.map((row, i) => (
              <div
                key={row.feature}
                className={cn(
                  'grid grid-cols-4 border-b border-border/60 items-center',
                  i % 2 === 0 ? 'bg-background' : 'bg-muted/20',
                )}
              >
                <div className="p-3 sm:p-4 text-sm text-foreground">{row.feature}</div>
                <div className="p-3 sm:p-4 flex justify-center bg-[#0038a8]/5">
                  <ComparisonCell value={row.us} />
                </div>
                <div className="p-3 sm:p-4 flex justify-center border-l border-border">
                  <ComparisonCell value={row.competitorA} />
                </div>
                <div className="p-3 sm:p-4 flex justify-center border-l border-border">
                  <ComparisonCell value={row.competitorB} />
                </div>
              </div>
            ))}

            {/* Table footer CTA */}
            <div className="grid grid-cols-4 bg-[#0038a8]/5 border-t-2 border-[#0038a8]/20">
              <div className="p-4 text-sm font-semibold text-foreground col-span-1">
                Ready to switch?
              </div>
              <div className="p-4 text-center">
                <a
                  href="/signup"
                  className="inline-block bg-[#0038a8] hover:bg-[#002580] text-white text-xs font-semibold px-4 py-2 rounded-full transition-colors"
                >
                  Start Free Trial
                </a>
              </div>
              <div className="p-4" />
              <div className="p-4" />
            </div>
          </div>
        </AnimateIn>
      </Container>
    </section>
  );
}
