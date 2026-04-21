'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Minus, ChevronDown, Users, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Container } from '@/components/layout/Container';
import { AnimateIn } from '@/components/ui/AnimateIn';
import { cn, formatCurrency } from '@/lib/utils';
import pricingData from '@/data/pricing.json';
import faqData from '@/data/faq.json';

/* ─── Types ──────────────────────────────────────────────────────────────── */
type BillingCycle = 'monthly' | 'annual';

/* ─── Feature Comparison Table Data ─────────────────────────────────────── */
const comparisonRows = [
  { feature: 'Employees included', starter: 'Up to 50', professional: 'Up to 500', enterprise: 'Unlimited' },
  { feature: 'Company entities', starter: '1', professional: '3', enterprise: 'Unlimited' },
  { feature: 'Payroll processing', starter: true, professional: true, enterprise: true },
  { feature: 'SSS / PhilHealth / Pag-IBIG', starter: true, professional: true, enterprise: true },
  { feature: 'BIR TRAIN Law computation', starter: true, professional: true, enterprise: true },
  { feature: 'Digital payslips', starter: true, professional: true, enterprise: true },
  { feature: 'Leave management', starter: true, professional: true, enterprise: true },
  { feature: 'Time & attendance', starter: true, professional: true, enterprise: true },
  { feature: 'Basic reports', starter: true, professional: true, enterprise: true },
  { feature: 'Performance management', starter: false, professional: true, enterprise: true },
  { feature: 'Recruitment & onboarding', starter: false, professional: true, enterprise: true },
  { feature: 'Benefits administration', starter: false, professional: true, enterprise: true },
  { feature: 'Mobile app (iOS & Android)', starter: false, professional: true, enterprise: true },
  { feature: 'Advanced analytics', starter: false, professional: true, enterprise: true },
  { feature: 'API access & webhooks', starter: false, professional: true, enterprise: true },
  { feature: 'Accounting integrations', starter: false, professional: true, enterprise: true },
  { feature: 'SSO (Single Sign-On)', starter: false, professional: false, enterprise: true },
  { feature: 'Custom integrations', starter: false, professional: false, enterprise: true },
  { feature: 'Dedicated account manager', starter: false, professional: false, enterprise: true },
  { feature: 'On-premise / private cloud', starter: false, professional: false, enterprise: true },
  { feature: 'SLA guarantee (99.9%)', starter: false, professional: false, enterprise: true },
  { feature: 'Support', starter: 'Email', professional: 'Email + Chat', enterprise: '24/7 Phone + Email' },
];

/* ─── Cell renderer ──────────────────────────────────────────────────────── */
function CompCell({ value }: { value: boolean | string }) {
  if (value === true) return <Check className="h-4 w-4 text-green-500 mx-auto" />;
  if (value === false) return <Minus className="h-4 w-4 text-muted-foreground/30 mx-auto" />;
  return <span className="text-xs text-foreground font-medium block text-center">{value}</span>;
}

/* ─── Pricing Calculator ─────────────────────────────────────────────────── */
function PricingCalculator() {
  const [employees, setEmployees] = useState(25);
  const [billing, setBilling] = useState<BillingCycle>('monthly');

  const tier = pricingData.tiers.find((t) =>
    employees >= t.minEmployees && (t.maxEmployees === null || employees <= t.maxEmployees),
  ) ?? pricingData.tiers[pricingData.tiers.length - 1]!;

  const pricePerEmp =
    billing === 'annual' ? tier.annualPricePerEmployee : tier.monthlyPricePerEmployee;

  const totalMonthly = pricePerEmp !== null ? pricePerEmp * employees : null;
  const annualTotal = totalMonthly !== null ? totalMonthly * 12 : null;

  return (
    <div className="rounded-2xl border border-[#0038a8]/20 bg-gradient-to-br from-[#0038a8]/5 to-[#ce1126]/5 p-6 sm:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-[#0038a8] flex items-center justify-center">
          <Calculator className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="font-bold text-foreground">Per-Employee Pricing Calculator</h3>
          <p className="text-sm text-muted-foreground">Estimate your monthly cost</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Inputs */}
        <div className="flex flex-col gap-5">
          <div>
            <label className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
              <Users className="h-4 w-4" /> Number of Employees
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={600}
                value={employees}
                onChange={(e) => setEmployees(Number(e.target.value))}
                className="flex-1 accent-[#0038a8]"
              />
              <span className="w-16 text-center font-bold text-lg text-foreground bg-background border border-border rounded-lg py-1">
                {employees}
              </span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>1</span><span>100</span><span>300</span><span>600+</span>
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-foreground mb-2 block">Billing Cycle</label>
            <div className="flex rounded-xl border border-border overflow-hidden">
              {(['monthly', 'annual'] as BillingCycle[]).map((cycle) => (
                <button
                  key={cycle}
                  onClick={() => setBilling(cycle)}
                  className={cn(
                    'flex-1 py-2 text-sm font-medium capitalize transition-all',
                    billing === cycle
                      ? 'bg-[#0038a8] text-white'
                      : 'bg-background text-muted-foreground hover:bg-muted',
                  )}
                >
                  {cycle} {cycle === 'annual' && <span className="text-xs opacity-80">(-20%)</span>}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 rounded-xl bg-background border border-border text-sm">
            <div className={cn(
              'px-2.5 py-1 rounded-full text-xs font-bold text-white',
              tier.id === 'starter' ? 'bg-slate-500' : tier.id === 'professional' ? 'bg-[#0038a8]' : 'bg-[#ce1126]'
            )}>
              {tier.name}
            </div>
            <span className="text-muted-foreground">plan selected based on employee count</span>
          </div>
        </div>

        {/* Result */}
        <div className="flex flex-col gap-3">
          <div className="rounded-xl bg-background border border-border p-5 flex flex-col gap-3">
            {totalMonthly !== null ? (
              <>
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-muted-foreground">Monthly total</span>
                  <span className="text-3xl font-extrabold text-foreground">
                    {formatCurrency(totalMonthly)}
                  </span>
                </div>
                <div className="flex justify-between text-sm border-t border-border pt-3">
                  <span className="text-muted-foreground">Per employee / month</span>
                  <span className="font-semibold">{formatCurrency(pricePerEmp!)}</span>
                </div>
                {billing === 'annual' && annualTotal !== null && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Annual total (billed yearly)</span>
                    <span className="font-semibold text-green-600">{formatCurrency(annualTotal)}</span>
                  </div>
                )}
                {billing === 'annual' && totalMonthly !== null && (
                  <div className="rounded-lg bg-green-500/10 text-green-700 dark:text-green-400 text-xs font-medium px-3 py-2">
                    💰 You save {formatCurrency(Math.round(totalMonthly * 12 * 0.25))} per year vs monthly billing
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-4">
                <p className="font-semibold text-foreground mb-1">Enterprise Pricing</p>
                <p className="text-sm text-muted-foreground">
                  Custom pricing for 500+ employees
                </p>
              </div>
            )}
          </div>
          <Button
            className="w-full bg-[#0038a8] hover:bg-[#002580] text-white font-semibold"
            asChild
          >
            <a href={tier.id === 'enterprise' ? '#demo' : '/signup'}>
              {tier.id === 'enterprise' ? 'Contact Sales' : `Start Free Trial — ${pricingData.trialDays} days`}
            </a>
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            No credit card required. Cancel anytime.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── Pricing Card ───────────────────────────────────────────────────────── */
function PricingCard({
  tier,
  billing,
  index,
}: {
  tier: (typeof pricingData.tiers)[0];
  billing: BillingCycle;
  index: number;
}) {
  const price = billing === 'annual' ? tier.annualPricePerEmployee : tier.monthlyPricePerEmployee;

  return (
    <AnimateIn delay={index * 0.1} direction="up">
      <div
        className={cn(
          'relative flex flex-col rounded-2xl border p-6 h-full transition-all duration-300',
          tier.popular
            ? 'border-[#0038a8] shadow-xl shadow-[#0038a8]/15 scale-[1.02]'
            : 'border-border hover:border-[#0038a8]/40 hover:shadow-lg',
        )}
      >
        {tier.popular && (
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
            <Badge className="bg-[#0038a8] text-white px-4 py-1 text-xs font-bold shadow-lg">
              ⭐ Most Popular
            </Badge>
          </div>
        )}

        {/* Tier header */}
        <div className="mb-5">
          <h3 className="text-lg font-bold text-foreground">{tier.name}</h3>
          <p className="text-sm text-muted-foreground mt-0.5">{tier.tagline}</p>
        </div>

        {/* Price */}
        <div className="mb-6">
          {price !== null ? (
            <div className="flex items-baseline gap-1">
              <span className="text-3xl sm:text-4xl font-extrabold text-foreground">
                ₱{price.toLocaleString()}
              </span>
              <span className="text-muted-foreground text-sm">/employee/mo</span>
            </div>
          ) : (
            <div className="text-3xl font-extrabold text-foreground">Custom</div>
          )}
          {billing === 'annual' && price !== null && (
            <p className="text-xs text-green-600 dark:text-green-400 mt-1 font-medium">
              Save 20% vs monthly billing
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            {tier.minEmployees}
            {tier.maxEmployees ? `–${tier.maxEmployees}` : '+'} employees
          </p>
        </div>

        {/* CTA */}
        <Button
          className={cn(
            'w-full font-semibold mb-6',
            tier.popular
              ? 'bg-[#0038a8] hover:bg-[#002580] text-white shadow-md'
              : 'variant-outline border-2',
          )}
          variant={tier.popular ? 'default' : 'outline'}
          asChild
        >
          <a href={tier.id === 'enterprise' ? '#demo' : '/signup'}>{tier.cta}</a>
        </Button>

        {/* Features */}
        <ul className="flex flex-col gap-2.5 flex-1">
          {tier.features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm">
              <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
              <span className="text-foreground">{f}</span>
            </li>
          ))}
          {tier.notIncluded.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm">
              <X className="h-4 w-4 text-muted-foreground/40 shrink-0 mt-0.5" />
              <span className="text-muted-foreground line-through">{f}</span>
            </li>
          ))}
        </ul>
      </div>
    </AnimateIn>
  );
}

/* ─── Main Section ───────────────────────────────────────────────────────── */
export function PricingSection() {
  const [billing, setBilling] = useState<BillingCycle>('monthly');
  const [showFullTable, setShowFullTable] = useState(false);

  const visibleRows = showFullTable ? comparisonRows : comparisonRows.slice(0, 10);

  return (
    <section id="pricing" className="py-20 lg:py-28 bg-muted/20">
      <Container>
        {/* ── Header ── */}
        <AnimateIn className="text-center max-w-2xl mx-auto mb-10">
          <Badge variant="outline" className="mb-4 rounded-full px-3 py-1 border-[#0038a8]/30 text-[#0038a8] dark:text-blue-400">
            Transparent pricing
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground mb-4">
            Simple, <span className="text-[#ce1126]">per-employee</span> pricing
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            No setup fees. No hidden charges. Pay only for what you use — in Philippine Peso.
          </p>
        </AnimateIn>

        {/* ── Billing toggle ── */}
        <AnimateIn className="flex justify-center mb-10">
          <div className="inline-flex items-center gap-3 bg-background border border-border rounded-2xl p-1.5 shadow-sm">
            <button
              onClick={() => setBilling('monthly')}
              className={cn(
                'px-5 py-2 rounded-xl text-sm font-semibold transition-all',
                billing === 'monthly'
                  ? 'bg-[#0038a8] text-white shadow-md'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling('annual')}
              className={cn(
                'px-5 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2',
                billing === 'annual'
                  ? 'bg-[#0038a8] text-white shadow-md'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Annual
              <span className={cn(
                'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                billing === 'annual' ? 'bg-white/20' : 'bg-green-500/15 text-green-600 dark:text-green-400',
              )}>
                -20%
              </span>
            </button>
          </div>
        </AnimateIn>

        {/* ── Pricing cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <AnimatePresence mode="wait">
            {pricingData.tiers.map((tier, i) => (
              <motion.div
                key={`${tier.id}-${billing}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: i * 0.05 }}
                className="h-full"
              >
                <PricingCard tier={tier} billing={billing} index={i} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* ── Notes strip ── */}
        <AnimateIn className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground mb-16">
          {pricingData.notes.map((note) => (
            <span key={note} className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />
              {note}
            </span>
          ))}
        </AnimateIn>

        {/* ── Calculator ── */}
        <AnimateIn className="mb-20">
          <PricingCalculator />
        </AnimateIn>

        {/* ── Feature comparison table ── */}
        <AnimateIn className="mb-20">
          <h3 className="text-2xl font-bold text-foreground text-center mb-6">
            Full feature comparison
          </h3>

          <div className="rounded-2xl border border-border overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-4 bg-muted/60 border-b border-border sticky top-0">
              <div className="p-4 text-sm font-semibold text-muted-foreground">Feature</div>
              {pricingData.tiers.map((t) => (
                <div key={t.id} className={cn('p-4 text-center border-l border-border', t.popular && 'bg-[#0038a8]/5')}>
                  <p className={cn('font-bold text-sm', t.popular ? 'text-[#0038a8] dark:text-blue-400' : 'text-foreground')}>
                    {t.name}
                  </p>
                  {t.popular && <p className="text-[10px] text-[#0038a8]/70">Most Popular</p>}
                </div>
              ))}
            </div>

            {/* Rows */}
            {visibleRows.map((row, i) => (
              <div
                key={row.feature}
                className={cn('grid grid-cols-4 border-b border-border/60 items-center', i % 2 === 0 ? 'bg-background' : 'bg-muted/20')}
              >
                <div className="p-3 sm:p-4 text-sm text-foreground">{row.feature}</div>
                <div className="p-3 sm:p-4 flex justify-center">
                  <CompCell value={row.starter} />
                </div>
                <div className="p-3 sm:p-4 flex justify-center border-l border-border bg-[#0038a8]/3">
                  <CompCell value={row.professional} />
                </div>
                <div className="p-3 sm:p-4 flex justify-center border-l border-border">
                  <CompCell value={row.enterprise} />
                </div>
              </div>
            ))}

            {/* Show more toggle */}
            {comparisonRows.length > 10 && (
              <button
                onClick={() => setShowFullTable((v) => !v)}
                className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-[#0038a8] dark:text-blue-400 hover:bg-muted/40 transition-colors border-t border-border"
              >
                {showFullTable ? 'Show less' : `Show all ${comparisonRows.length} features`}
                <ChevronDown className={cn('h-4 w-4 transition-transform', showFullTable && 'rotate-180')} />
              </button>
            )}
          </div>
        </AnimateIn>

        {/* ── FAQ ── */}
        <AnimateIn>
          <div className="max-w-3xl mx-auto">
            <h3 className="text-2xl font-bold text-foreground text-center mb-8">
              Frequently asked questions
            </h3>
            <Accordion type="single" collapsible className="flex flex-col gap-2">
              {faqData.map((faq) => (
                <AccordionItem
                  key={faq.id}
                  value={`faq-${faq.id}`}
                  className="border border-border rounded-xl px-5 data-[state=open]:border-[#0038a8]/30"
                >
                  <AccordionTrigger className="text-sm font-semibold text-left hover:no-underline py-4">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>

            <div className="mt-10 text-center p-6 rounded-2xl border border-border bg-card">
              <p className="font-semibold text-foreground mb-1">Still have questions?</p>
              <p className="text-sm text-muted-foreground mb-4">
                Our team is available Mon–Fri, 8AM–6PM PHT
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-3">
                <Button variant="outline" asChild>
                  <a href="mailto:hello@hrisph.com">✉️ Email Us</a>
                </Button>
                <Button className="bg-[#0038a8] hover:bg-[#002580] text-white" asChild>
                  <a href="#demo">📅 Book a Demo</a>
                </Button>
              </div>
            </div>
          </div>
        </AnimateIn>
      </Container>
    </section>
  );
}
