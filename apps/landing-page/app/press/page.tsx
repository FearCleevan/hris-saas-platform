import type { Metadata } from 'next';
import { Container } from '@/components/layout/Container';
import { Badge } from '@/components/ui/badge';
import { Download, Mail } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Press & Media',
  description: 'HRISPH press resources, media kit, press releases, and media contact information.',
};

const pressReleases = [
  {
    date: 'Oct 15, 2024',
    title: 'HRISPH Raises Series A to Expand Philippine HRIS Platform Nationwide',
    summary: 'HRisPH Technologies, Inc. announces a ₱250M Series A funding round led by local and regional venture capital firms to accelerate growth across Visayas and Mindanao.',
    tag: 'Funding',
  },
  {
    date: 'Sep 1, 2024',
    title: 'HRISPH Surpasses 1,800 Companies on Platform, Processes ₱2B Monthly Payroll',
    summary: 'HRISPH reaches a major milestone, serving over 1,800 Philippine companies and processing more than ₱2 billion in monthly payroll across all sectors.',
    tag: 'Milestone',
  },
  {
    date: 'Aug 10, 2024',
    title: 'HRISPH Launches Enterprise Multi-Entity Dashboard for Philippine Conglomerates',
    summary: 'New Enterprise edition enables Philippine holding companies and conglomerates to manage multiple legal entities, payroll entities, and HR operations in a unified dashboard.',
    tag: 'Product',
  },
  {
    date: 'Jun 15, 2024',
    title: 'HRISPH Completes NPC Registration, Reinforces RA 10173 Data Privacy Commitment',
    summary: 'HRISPH\'s Data Protection Officer registration with the National Privacy Commission (NPC) is now complete, underscoring the company\'s commitment to Philippine data privacy standards.',
    tag: 'Compliance',
  },
];

const brandAssets = [
  { name: 'Logo Pack (SVG, PNG)', desc: 'Primary logo, variations, and usage guidelines', format: 'ZIP' },
  { name: 'Brand Guidelines PDF', desc: 'Colors, typography, tone of voice, and dos/don\'ts', format: 'PDF' },
  { name: 'Product Screenshots', desc: 'High-resolution screenshots of key product features', format: 'ZIP' },
  { name: 'Executive Photos', desc: 'High-resolution headshots of leadership team', format: 'ZIP' },
];

const stats = [
  { value: '2019', label: 'Founded' },
  { value: '1,800+', label: 'Companies' },
  { value: '₱2B+', label: 'Monthly Payroll' },
  { value: 'Makati', label: 'Headquarters' },
];

export default function PressPage() {
  return (
    <div className="pt-16">
      <div className="bg-linear-to-br from-[#0038a8]/5 to-background border-b border-border">
        <Container className="py-14 text-center">
          <Badge variant="outline" className="mb-4 rounded-full px-3 py-1 border-[#0038a8]/30 text-[#0038a8] dark:text-blue-400">
            Media & Press
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground mb-3">
            HRISPH <span className="text-[#0038a8]">Press Room</span>
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Media resources, press releases, and contact information for journalists and media professionals.
          </p>
        </Container>
      </div>

      <Container className="py-16">
        {/* Key Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-16">
          {stats.map((s) => (
            <div key={s.label} className="bg-card border border-border rounded-2xl p-5 text-center">
              <p className="text-2xl font-extrabold text-[#0038a8] mb-1">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 flex flex-col gap-12">
            {/* Press Releases */}
            <section>
              <p className="text-xs font-bold uppercase tracking-widest text-[#0038a8] mb-5">Press Releases</p>
              <div className="flex flex-col gap-5">
                {pressReleases.map((pr) => (
                  <div key={pr.title} className="bg-card border border-border rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-xs text-muted-foreground">{pr.date}</span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#0038a8]/10 text-[#0038a8] dark:text-blue-400">
                        {pr.tag}
                      </span>
                    </div>
                    <h3 className="font-bold text-foreground mb-2 leading-snug">{pr.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{pr.summary}</p>
                    <a href="mailto:press@hrisph.com" className="text-xs text-[#0038a8] dark:text-blue-400 hover:underline mt-3 inline-block">
                      Request full release →
                    </a>
                  </div>
                ))}
              </div>
            </section>

            {/* Brand Assets */}
            <section>
              <p className="text-xs font-bold uppercase tracking-widest text-[#0038a8] mb-5">Brand Assets</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {brandAssets.map((asset) => (
                  <div key={asset.name} className="bg-card border border-border rounded-xl p-4 flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#0038a8]/10 flex items-center justify-center shrink-0">
                      <Download className="h-4 w-4 text-[#0038a8]" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{asset.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{asset.desc}</p>
                      <a href="mailto:press@hrisph.com" className="text-xs text-[#0038a8] dark:text-blue-400 hover:underline mt-1 inline-block">
                        Request {asset.format} →
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Media Contact Sidebar */}
          <div className="flex flex-col gap-6">
            <div className="bg-card border border-border rounded-2xl p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-[#0038a8] mb-4">Media Contact</p>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-[#0038a8]/10 flex items-center justify-center font-bold text-[#0038a8]">
                  PL
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">Patricia Lim</p>
                  <p className="text-xs text-muted-foreground">Head of Sales & Communications</p>
                </div>
              </div>
              <div className="flex flex-col gap-2 text-sm">
                <a href="mailto:press@hrisph.com" className="flex items-center gap-2 text-[#0038a8] dark:text-blue-400 hover:underline">
                  <Mail className="h-4 w-4" /> press@hrisph.com
                </a>
                <p className="text-muted-foreground text-xs">Response within 1 business day</p>
              </div>
            </div>

            <div className="bg-muted/40 border border-border rounded-2xl p-6">
              <p className="text-sm font-bold text-foreground mb-2">Boilerplate</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                HRisPH Technologies, Inc. is the developer of HRISPH, the Philippines&apos; enterprise-grade Human Resource Information System. Founded in 2019 in Makati City, HRISPH serves 1,800+ Philippine companies with automated payroll compliance for SSS, PhilHealth, Pag-IBIG, and BIR TRAIN Law. Headquartered at 8F Ayala Avenue Tower, Makati City.
              </p>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}
