import type { Metadata } from 'next';
import { Download, FileText, BookOpen, Calculator, Shield } from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = {
  title: 'Resources — PH HR & Payroll Tools',
  description: 'Free downloadable guides, checklists, and tools for Philippine HR compliance — SSS, PhilHealth, Pag-IBIG, BIR TRAIN Law.',
};

const resources = [
  {
    icon: Calculator,
    category: 'Payroll Tools',
    color: '#0038a8',
    bg: 'bg-[#0038a8]/10',
    items: [
      {
        title: '2024 SSS Contribution Table (Excel)',
        desc: 'Complete MSC bracket table with employee and employer shares. Ready-to-use formula.',
        type: 'Excel Template',
        badge: 'Free',
      },
      {
        title: 'PhilHealth 5% Premium Calculator (Excel)',
        desc: 'Compute monthly PhilHealth contributions based on basic salary under Circular 2023-0009.',
        type: 'Excel Template',
        badge: 'Free',
      },
      {
        title: '13th Month Pay Calculator',
        desc: 'Compute pro-rated 13th month pay for resigned, retrenched, and full-year employees.',
        type: 'Excel Template',
        badge: 'Free',
      },
    ],
  },
  {
    icon: FileText,
    category: 'Compliance Checklists',
    color: '#ce1126',
    bg: 'bg-[#ce1126]/10',
    items: [
      {
        title: 'Year-End Payroll Compliance Checklist',
        desc: 'Everything you need to close payroll year-end: BIR Form 2316, alphalist, 13th month, annualization.',
        type: 'PDF Checklist',
        badge: 'Free',
      },
      {
        title: 'New Hire Onboarding HR Checklist',
        desc: 'Complete checklist: government ID enrollment, 201 file, tax status, biometric setup.',
        type: 'PDF Checklist',
        badge: 'Free',
      },
      {
        title: 'Separation Pay Computation Guide',
        desc: 'Compute separation pay under the Labor Code for redundancy, retrenchment, and closure.',
        type: 'PDF Guide',
        badge: 'Free',
      },
    ],
  },
  {
    icon: BookOpen,
    category: 'Guides & E-Books',
    color: '#16a34a',
    bg: 'bg-green-500/10',
    items: [
      {
        title: 'The Complete Philippine Payroll Guide 2024',
        desc: 'A 45-page comprehensive guide: BIR TRAIN Law, SSS, PhilHealth, Pag-IBIG, overtime, 13th month.',
        type: 'E-Book PDF',
        badge: 'Free',
      },
      {
        title: 'PH Labor Code Pocket Guide',
        desc: 'Quick reference for overtime rates, holiday pay, night differential, and service incentive leave.',
        type: 'E-Book PDF',
        badge: 'Free',
      },
      {
        title: 'HRIS Implementation Playbook for PH SMEs',
        desc: 'Step-by-step guide to transitioning from manual payroll to a digital HRIS. Includes migration checklist.',
        type: 'E-Book PDF',
        badge: 'Premium',
      },
    ],
  },
  {
    icon: Shield,
    category: 'Data Privacy & Compliance',
    color: '#7c3aed',
    bg: 'bg-purple-500/10',
    items: [
      {
        title: 'RA 10173 HR Compliance Kit',
        desc: 'NPC-compliant templates: privacy notices, consent forms, data processing agreements for HR departments.',
        type: 'Document Templates',
        badge: 'Free',
      },
      {
        title: 'Employee 201 File Guide',
        desc: 'What to include, what to exclude, retention periods, and proper disposal under the Data Privacy Act.',
        type: 'PDF Guide',
        badge: 'Free',
      },
    ],
  },
];

export default function ResourcesPage() {
  return (
    <div className="pt-16">
      {/* Hero */}
      <div className="bg-linear-to-br from-[#0038a8]/5 to-background border-b border-border">
        <Container className="py-14 text-center">
          <Badge variant="outline" className="mb-4 rounded-full px-3 py-1 border-[#0038a8]/30 text-[#0038a8] dark:text-blue-400">
            Free Resources
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground mb-3">
            Philippine HR & Payroll{' '}
            <span className="text-[#0038a8]">Toolkit</span>
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Free guides, templates, and checklists — written by CPAs and HR practitioners to keep your
            Philippine business compliant.
          </p>
        </Container>
      </div>

      <Container className="py-16">
        <div className="flex flex-col gap-14">
          {resources.map(({ icon: Icon, category, color, bg, items }) => (
            <section key={category}>
              <div className="flex items-center gap-3 mb-6">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
                  <Icon className="h-5 w-5" style={{ color }} />
                </div>
                <h2 className="text-lg font-bold text-foreground">{category}</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {items.map((item) => (
                  <div
                    key={item.title}
                    className="bg-card border border-border rounded-2xl p-6 flex flex-col gap-3 hover:border-[#0038a8]/40 transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs text-muted-foreground border border-border rounded-full px-2 py-0.5">
                        {item.type}
                      </span>
                      <span
                        className={`text-xs font-semibold rounded-full px-2 py-0.5 ${
                          item.badge === 'Free'
                            ? 'bg-green-500/10 text-green-700 dark:text-green-400'
                            : 'bg-[#fcd116]/20 text-amber-700 dark:text-amber-400'
                        }`}
                      >
                        {item.badge}
                      </span>
                    </div>
                    <h3 className="font-bold text-foreground leading-snug group-hover:text-[#0038a8] transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed flex-1">{item.desc}</p>
                    <a
                      href="/contact"
                      className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-[#0038a8] hover:underline"
                    >
                      <Download className="h-4 w-4" />
                      {item.badge === 'Free' ? 'Download Free' : 'Get Access'}
                    </a>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-16 bg-linear-to-br from-[#0038a8]/5 to-[#ce1126]/5 border border-border rounded-2xl p-8 sm:p-10 text-center">
          <h2 className="text-xl font-extrabold text-foreground mb-2">
            Get all premium resources — free with HRISPH
          </h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto text-sm">
            HRISPH subscribers get access to all guides, templates, and a team of compliance specialists.
            Start your 14-day free trial.
          </p>
          <a
            href="/demo"
            className="inline-flex items-center justify-center h-11 px-8 rounded-lg bg-[#0038a8] text-white font-semibold hover:bg-[#002580] transition-colors"
          >
            Start Free Trial
          </a>
        </div>
      </Container>
    </div>
  );
}
