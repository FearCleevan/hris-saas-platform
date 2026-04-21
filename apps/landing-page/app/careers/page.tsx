import type { Metadata } from 'next';
import { MapPin, Clock, ArrowRight, Briefcase } from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = {
  title: 'Careers — Join the HRISPH Team',
  description: 'Join the team building the Philippines\' most trusted HR and payroll platform. Open roles in engineering, product, compliance, and sales.',
};

const openings = [
  {
    id: 1,
    title: 'Senior Full-Stack Engineer',
    department: 'Engineering',
    location: 'Makati City (Hybrid)',
    type: 'Full-time',
    level: 'Senior',
    color: '#0038a8',
    desc: 'Build and scale our payroll computation engine and employee self-service portal. TypeScript, Next.js, Supabase, and PostgreSQL stack.',
    requirements: [
      '5+ years full-stack experience (TypeScript/React/Node.js)',
      'Experience with PostgreSQL and relational database design',
      'Understanding of Philippine payroll or HR compliance is a plus',
      'Prior experience in SaaS or fintech preferred',
    ],
  },
  {
    id: 2,
    title: 'HR Compliance Specialist',
    department: 'Compliance',
    location: 'Makati City (On-site)',
    type: 'Full-time',
    level: 'Mid-level',
    color: '#fcd116',
    desc: 'Monitor and implement updates from BIR, SSS, PhilHealth, Pag-IBIG, and DOLE into our computation engine. Work closely with engineering to ensure accuracy.',
    requirements: [
      'CPA or RCHEd professional license preferred',
      'Minimum 3 years in Philippine payroll or tax compliance',
      'In-depth knowledge of BIR TRAIN Law, SSS, PhilHealth, and Pag-IBIG regulations',
      'Experience with BIR eFPS/eBIRForms and government online portals',
    ],
  },
  {
    id: 3,
    title: 'Enterprise Account Executive',
    department: 'Sales',
    location: 'Makati City (Hybrid)',
    type: 'Full-time',
    level: 'Senior',
    color: '#ce1126',
    desc: 'Drive enterprise deals with 500+ employee companies in the Philippines. Own the full sales cycle from outbound prospecting to contract close.',
    requirements: [
      '4+ years B2B enterprise software sales experience in the Philippines',
      'Track record of ₱5M+ ARR quota attainment',
      'Experience selling HRIS, payroll, or ERP solutions preferred',
      'Strong network in Philippine enterprise HR or finance departments',
    ],
  },
  {
    id: 4,
    title: 'Product Manager — Payroll',
    department: 'Product',
    location: 'Makati City (Hybrid)',
    type: 'Full-time',
    level: 'Mid-Senior',
    color: '#16a34a',
    desc: 'Own the payroll and government compliance product area. Define the roadmap, work with compliance specialists, and ship features that save Philippine HR teams hours every pay cycle.',
    requirements: [
      '3+ years product management experience in SaaS or fintech',
      'Ability to translate complex compliance requirements into user-friendly features',
      'Experience working with engineering and design teams in an agile environment',
      'Bonus: prior exposure to Philippine payroll, BIR, SSS, or HR software',
    ],
  },
  {
    id: 5,
    title: 'Customer Success Manager',
    department: 'Customer Success',
    location: 'Makati City (Hybrid)',
    type: 'Full-time',
    level: 'Mid-level',
    color: '#7c3aed',
    desc: 'Own post-sales relationships with 30-50 SME and mid-market accounts. Drive adoption, health scores, renewals, and expansion.',
    requirements: [
      '2+ years in customer success, account management, or HR consulting',
      'Strong understanding of Philippine payroll compliance is a major advantage',
      'Excellent communication in English and Filipino',
      'Data-driven mindset — comfortable with churn analysis and NPS metrics',
    ],
  },
];

const perks = [
  { emoji: '💰', title: 'Competitive Salary', desc: 'Market-rate compensation benchmarked against Philippine tech industry standards.' },
  { emoji: '🏥', title: 'HMO from Day 1', desc: 'Full HMO coverage for you and up to 2 dependents, starting on your first day.' },
  { emoji: '🏖️', title: '20 Days Leave', desc: '15 vacation days + 5 sick days annually, in addition to all Philippine regular holidays.' },
  { emoji: '📈', title: 'Equity', desc: 'Stock options for all full-time employees. You build it, you own a piece of it.' },
  { emoji: '🎓', title: 'Learning Budget', desc: '₱30,000 annual budget for courses, certifications, and professional development.' },
  { emoji: '🏠', title: 'Hybrid Work', desc: 'Flexible remote arrangement — most roles are 3 days in Makati, 2 days remote.' },
];

export default function CareersPage() {
  return (
    <div className="pt-16">
      {/* Hero */}
      <div className="bg-linear-to-br from-[#0038a8]/5 via-background to-[#ce1126]/5 border-b border-border">
        <Container className="py-16 text-center max-w-3xl">
          <Badge variant="outline" className="mb-4 rounded-full px-3 py-1 border-[#0038a8]/30 text-[#0038a8] dark:text-blue-400">
            We&apos;re Hiring
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground mb-4">
            Build the future of{' '}
            <span className="text-[#0038a8]">Philippine HR</span>
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Join a team of engineers, compliance specialists, and product builders on a mission to make
            payroll compliance effortless for every business in the Philippines.
          </p>
          <div className="flex flex-wrap justify-center gap-4 mt-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-[#0038a8]" /> Makati City, Metro Manila</span>
            <span className="flex items-center gap-1.5"><Briefcase className="h-4 w-4 text-[#0038a8]" /> {openings.length} open roles</span>
          </div>
        </Container>
      </div>

      <Container className="py-16">
        {/* Open Roles */}
        <div className="mb-16">
          <p className="text-xs font-bold uppercase tracking-widest text-[#0038a8] mb-6">Open Positions</p>
          <div className="flex flex-col gap-4">
            {openings.map((job) => (
              <div
                key={job.id}
                className="bg-card border border-border rounded-2xl overflow-hidden hover:border-[#0038a8]/40 transition-colors group"
              >
                <div className="h-1 w-full" style={{ backgroundColor: job.color }} />
                <div className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="text-xs font-semibold text-muted-foreground border border-border rounded-full px-2.5 py-0.5">
                          {job.department}
                        </span>
                        <span className="text-xs text-muted-foreground border border-border rounded-full px-2.5 py-0.5">
                          {job.level}
                        </span>
                        <span className="text-xs text-muted-foreground border border-border rounded-full px-2.5 py-0.5">
                          {job.type}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-foreground group-hover:text-[#0038a8] transition-colors mb-1">
                        {job.title}
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
                        <MapPin className="h-3.5 w-3.5" /> {job.location}
                        <span className="mx-1">·</span>
                        <Clock className="h-3.5 w-3.5" /> {job.type}
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed mb-4">{job.desc}</p>
                      <ul className="flex flex-col gap-1">
                        {job.requirements.map((req) => (
                          <li key={req} className="text-xs text-muted-foreground flex items-start gap-2">
                            <span className="mt-1 w-1 h-1 rounded-full bg-[#0038a8] shrink-0" />
                            {req}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="shrink-0">
                      <a
                        href={`mailto:careers@hrisph.com?subject=Application: ${job.title}`}
                        className="inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-[#0038a8] text-white text-sm font-semibold hover:bg-[#002580] transition-colors whitespace-nowrap"
                      >
                        Apply Now <ArrowRight className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Perks */}
        <div className="mb-16">
          <p className="text-xs font-bold uppercase tracking-widest text-[#0038a8] mb-6">Why HRISPH</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {perks.map((perk) => (
              <div key={perk.title} className="bg-card border border-border rounded-2xl p-5 flex gap-4">
                <span className="text-2xl shrink-0">{perk.emoji}</span>
                <div>
                  <p className="font-bold text-foreground mb-1">{perk.title}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{perk.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* No open role CTA */}
        <div className="bg-muted/40 border border-border rounded-2xl p-8 text-center">
          <h2 className="text-xl font-bold text-foreground mb-2">Don&apos;t see a fit?</h2>
          <p className="text-muted-foreground mb-5 max-w-md mx-auto text-sm">
            We&apos;re always looking for exceptional people. Send us your resume and tell us how you&apos;d contribute
            to the HRISPH mission.
          </p>
          <a
            href="mailto:careers@hrisph.com?subject=General Application — HRISPH"
            className="inline-flex items-center gap-2 h-10 px-6 rounded-lg border border-[#0038a8] text-[#0038a8] dark:text-blue-400 text-sm font-semibold hover:bg-[#0038a8]/5 transition-colors"
          >
            Send Open Application
          </a>
        </div>
      </Container>
    </div>
  );
}
