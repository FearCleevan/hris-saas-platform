import type { Metadata } from 'next';
import { 
  ExternalLink, 
  Flag, 
  Scale, 
  Shield, 
  Handshake,
  Users,
  Building2,
  TrendingUp,
  CheckCircle2
} from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { Badge } from '@/components/ui/badge';
import teamData from '@/data/team.json';

export const metadata: Metadata = {
  title: 'About Us',
  description: 'Learn about the team behind HRISPH — building the Philippines\' most trusted HR and payroll platform.',
};

const milestones = [
  { year: '2019', event: 'Founded in Makati', desc: 'Eduardo and Clarissa founded HRISPH after experiencing the pain of PH payroll compliance firsthand at BDO.' },
  { year: '2020', event: 'First 50 clients', desc: 'Launched the Starter plan and reached 50 paying clients within 8 months, primarily SMEs in Metro Manila.' },
  { year: '2021', event: 'Government compliance engine', desc: 'Released the automated SSS, PhilHealth, Pag-IBIG, and BIR TRAIN Law computation engine — a first for Philippine HRIS.' },
  { year: '2022', event: 'Enterprise edition', desc: 'Launched Enterprise with multi-entity support, audit trails, and RA 10173 data privacy controls. Signed BDO and JFC.' },
  { year: '2023', event: '1,000+ companies', desc: 'Crossed 1,000 Philippine companies on the platform, processing over ₱2 billion in monthly payroll.' },
  { year: '2024', event: 'Series A & expansion', desc: 'Raised Series A funding. Expanded to Visayas and Mindanao. Now serving 1,800+ companies nationwide.' },
];

const values = [
  {
    icon: Flag,
    title: 'Philippine-First',
    desc: 'Every feature is built for the unique requirements of Philippine labor law, BIR circulars, and government agency remittances. No generic solutions.',
    color: 'text-[#0038a8]',
  },
  {
    icon: Scale,
    title: 'Compliance as a Feature',
    desc: 'Our former BIR examiner and SSS compliance specialists ensure every computation is accurate and up-to-date with the latest circulars.',
    color: 'text-[#0038a8]',
  },
  {
    icon: Shield,
    title: 'Data Privacy by Design',
    desc: 'Built to comply with RA 10173 from the ground up. Your employee data stays in the Philippines, encrypted at rest and in transit.',
    color: 'text-[#0038a8]',
  },
  {
    icon: Handshake,
    title: 'Genuine Partnership',
    desc: 'We succeed when you succeed. Our Customer Success team speaks Filipino, understands your payroll challenges, and stays until issues are resolved.',
    color: 'text-[#0038a8]',
  },
];

export default function AboutPage() {
  return (
    <div className="pt-16">
      {/* Hero */}
      <div className="bg-linear-to-br from-[#0038a8]/5 via-background to-[#ce1126]/5 border-b border-border">
        <Container className="py-16 text-center max-w-3xl">
          <Badge variant="outline" className="mb-4 rounded-full px-3 py-1 border-[#0038a8]/30 text-[#0038a8] dark:text-blue-400">
            Our Story
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground mb-4">
            Built by Filipinos,{' '}
            <span className="text-[#0038a8]">for Filipino businesses</span>
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            HRISPH started in 2019 with one frustration: why is payroll compliance so hard in the Philippines?
            Five years later, we&apos;re the trusted HR platform for 1,800+ Philippine companies.
          </p>
        </Container>
      </div>

      {/* Mission */}
      <Container className="py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#0038a8] mb-3">Our Mission</p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mb-4">
              Make Philippine HR compliance effortless — for every company
            </h2>
            <p className="text-muted-foreground mb-4 leading-relaxed">
              Philippine businesses spend thousands of hours every year manually computing SSS, PhilHealth, Pag-IBIG,
              and BIR withholding tax. One wrong circular update means penalties and interest charges.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              We built HRISPH to eliminate that complexity. Our platform automatically tracks every government
              agency circular, updates computation tables, and generates the correct reports — so you can focus
              on your people, not paperwork.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { value: '1,800+', label: 'Philippine Companies', icon: Building2 },
              { value: '₱2B+', label: 'Monthly Payroll Processed', icon: TrendingUp },
              { value: '100%', label: 'TRAIN Law Accurate', icon: CheckCircle2 },
              { value: '24/7', label: 'Uptime Commitment', icon: Shield },
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="bg-card border border-border rounded-2xl p-6 text-center">
                  <Icon className="h-6 w-6 text-[#0038a8] mx-auto mb-2" />
                  <p className="text-2xl font-extrabold text-[#0038a8] mb-1">{stat.value}</p>
                  <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </Container>

      {/* Values */}
      <div className="bg-muted/40 border-y border-border">
        <Container className="py-16">
          <div className="text-center mb-10">
            <p className="text-xs font-bold uppercase tracking-widest text-[#0038a8] mb-2">What We Stand For</p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground">Our values</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((v) => {
              const Icon = v.icon;
              return (
                <div key={v.title} className="bg-card border border-border rounded-2xl p-6 flex flex-col gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#0038a8]/10 flex items-center justify-center">
                    <Icon className={`h-5 w-5 ${v.color}`} />
                  </div>
                  <h3 className="font-bold text-foreground">{v.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{v.desc}</p>
                </div>
              );
            })}
          </div>
        </Container>
      </div>

      {/* Timeline */}
      <Container className="py-16">
        <div className="text-center mb-10">
          <p className="text-xs font-bold uppercase tracking-widest text-[#0038a8] mb-2">Company History</p>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground">Our journey</h2>
        </div>
        <div className="relative max-w-2xl mx-auto">
          <div className="absolute left-15 top-0 bottom-0 w-px bg-border" />
          <div className="flex flex-col gap-8">
            {milestones.map((m) => (
              <div key={m.year} className="flex gap-6 items-start">
                <div className="w-15 shrink-0 text-right">
                  <span className="text-sm font-bold text-[#0038a8] pr-[10px]">{m.year}</span>
                </div>
                <div className="relative">
                  <div className="absolute -left-7.25 top-1.5 w-3 h-3 rounded-full bg-[#0038a8] border-2 border-background" />
                  <h3 className="font-bold text-foreground mb-1">{m.event}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{m.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Container>

      {/* Team */}
      <div className="bg-muted/40 border-y border-border">
        <Container className="py-16">
          <div className="text-center mb-10">
            <p className="text-xs font-bold uppercase tracking-widest text-[#0038a8] mb-2">The People</p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground">Meet the team</h2>
            <p className="text-muted-foreground mt-2 max-w-xl mx-auto">
              Former bankers, engineers, BIR examiners, and HR practitioners — all passionate about
              making Philippine HR simple.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {teamData.map((member) => (
              <div key={member.id} className="bg-card border border-border rounded-2xl p-6 flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-linear-to-br from-[#0038a8]/20 to-[#ce1126]/20 flex items-center justify-center shrink-0">
                    <Users className="h-6 w-6 text-[#0038a8]" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground">{member.name}</p>
                    <p className="text-xs text-muted-foreground">{member.title}</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{member.bio}</p>
                <a
                  href={member.linkedin}
                  className="inline-flex items-center gap-1.5 text-xs text-[#0038a8] dark:text-blue-400 font-medium hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> LinkedIn
                </a>
              </div>
            ))}
          </div>
        </Container>
      </div>

      {/* CTA */}
      <Container className="py-16 text-center">
        <h2 className="text-2xl font-extrabold text-foreground mb-3">Ready to simplify your HR?</h2>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          Join 1,800+ Philippine companies who trust HRISPH for payroll, compliance, and people management.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href="/demo"
            className="inline-flex items-center justify-center h-11 px-6 rounded-lg bg-[#0038a8] text-white font-semibold hover:bg-[#002580] transition-colors"
          >
            Book a Free Demo
          </a>
          <a
            href="/contact"
            className="inline-flex items-center justify-center h-11 px-6 rounded-lg border border-border text-foreground font-semibold hover:bg-muted transition-colors"
          >
            Contact Us
          </a>
        </div>
      </Container>
    </div>
  );
}