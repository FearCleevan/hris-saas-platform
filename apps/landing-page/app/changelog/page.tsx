import type { Metadata } from 'next';
import { Container } from '@/components/layout/Container';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = {
  title: "What's New — HRISPH Changelog",
  description: "Latest updates, new features, and improvements to the HRISPH platform. Stay up to date with everything we're shipping.",
};

const releases = [
  {
    version: '4.2.0',
    date: 'October 10, 2024',
    tag: 'Major Release',
    tagColor: 'bg-[#0038a8]/10 text-[#0038a8] dark:text-blue-400',
    highlights: [
      { type: 'New', label: 'Multi-entity consolidated dashboard — manage all your companies from one login' },
      { type: 'New', label: 'BIR TRAIN Law annualization engine — automatic year-end tax computation' },
      { type: 'New', label: 'Biometric integration for ZKTeco devices (SDK-based, real-time sync)' },
      { type: 'Improved', label: 'Payroll approval workflow — now supports multi-level approvers' },
      { type: 'Improved', label: 'Employee self-service portal now available as a Progressive Web App (PWA)' },
      { type: 'Fixed', label: 'SSS contribution rounding issue for employees near MSC bracket boundary' },
    ],
  },
  {
    version: '4.1.2',
    date: 'September 5, 2024',
    tag: 'Patch',
    tagColor: 'bg-green-500/10 text-green-700 dark:text-green-400',
    highlights: [
      { type: 'Fixed', label: 'PhilHealth computation error for employees with salary adjustments mid-month' },
      { type: 'Fixed', label: 'BIR Form 2316 incorrect tax withheld amount for resigned employees' },
      { type: 'Improved', label: 'Payslip PDF generation performance improved by 60%' },
    ],
  },
  {
    version: '4.1.0',
    date: 'August 15, 2024',
    tag: 'Feature Release',
    tagColor: 'bg-purple-500/10 text-purple-700 dark:text-purple-400',
    highlights: [
      { type: 'New', label: '13th month pay calculator with pro-rated computation for mid-year hires' },
      { type: 'New', label: 'Leave management module — accrual, carryover, and conversion to cash' },
      { type: 'New', label: 'Dark mode support across all platform modules' },
      { type: 'New', label: 'Separation pay computation wizard (redundancy, retrenchment, closure)' },
      { type: 'Improved', label: 'Government contribution report generation now supports bulk download (ZIP)' },
    ],
  },
  {
    version: '4.0.0',
    date: 'July 1, 2024',
    tag: 'Major Release',
    tagColor: 'bg-[#0038a8]/10 text-[#0038a8] dark:text-blue-400',
    highlights: [
      { type: 'New', label: 'Complete platform redesign — faster, cleaner, and fully responsive' },
      { type: 'New', label: 'SSS 2024 contribution table (14% rate) — automatically applied' },
      { type: 'New', label: 'PhilHealth 5% premium rate — compliant with Circular 2023-0009' },
      { type: 'New', label: 'Enterprise audit trail — every data access and change logged with full details' },
      { type: 'New', label: 'Role-based access control with custom role definitions' },
      { type: 'Improved', label: 'Payroll computation engine rebuilt from ground up — 3× faster' },
    ],
  },
  {
    version: '3.8.1',
    date: 'May 20, 2024',
    tag: 'Patch',
    tagColor: 'bg-green-500/10 text-green-700 dark:text-green-400',
    highlights: [
      { type: 'Fixed', label: 'Night differential calculation error for rotating shift employees' },
      { type: 'Fixed', label: 'Pag-IBIG contribution not deducted for contractual employees under certain conditions' },
      { type: 'Improved', label: 'CSV import validation now shows detailed error messages per row' },
    ],
  },
];

const typeColor: Record<string, string> = {
  'New': 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400',
  'Improved': 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400',
  'Fixed': 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400',
  'Deprecated': 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400',
};

export default function ChangelogPage() {
  return (
    <div className="pt-16">
      <div className="bg-linear-to-br from-[#0038a8]/5 to-background border-b border-border">
        <Container className="py-14 text-center">
          <Badge variant="outline" className="mb-4 rounded-full px-3 py-1 border-[#0038a8]/30 text-[#0038a8] dark:text-blue-400">
            Changelog
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground mb-3">
            What&apos;s <span className="text-[#0038a8]">New in HRISPH</span>
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Every update, improvement, and fix — delivered continuously to keep your payroll compliant and your team productive.
          </p>
        </Container>
      </div>

      <Container className="py-16 max-w-3xl">
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-[100px] top-0 bottom-0 w-px bg-border hidden sm:block" />

          <div className="flex flex-col gap-10">
            {releases.map((release) => (
              <div key={release.version} className="flex flex-col sm:flex-row gap-4 sm:gap-8">
                {/* Date column */}
                <div className="sm:w-[100px] shrink-0 sm:text-right pt-1">
                  <span className="text-xs font-bold text-[#0038a8]">{release.version}</span>
                  <p className="text-xs text-muted-foreground">{release.date}</p>
                </div>

                {/* Dot */}
                <div className="hidden sm:flex items-start pt-1.5 relative z-10">
                  <div className="w-3 h-3 rounded-full bg-[#0038a8] border-2 border-background translate-x-[-6px]" />
                </div>

                {/* Content */}
                <div className="flex-1 bg-card border border-border rounded-2xl p-5 overflow-hidden">
                  <div className="flex items-center gap-3 mb-4">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${release.tagColor}`}>
                      {release.tag}
                    </span>
                  </div>
                  <ul className="flex flex-col gap-2">
                    {release.highlights.map((item, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 mt-0.5 ${typeColor[item.type]}`}>
                          {item.type}
                        </span>
                        <span className="text-muted-foreground leading-relaxed">{item.label}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground">
            Want to be notified of new releases? Check our{' '}
            <a href="/blog" className="text-[#0038a8] dark:text-blue-400 hover:underline">blog</a>
            {' '}or contact{' '}
            <a href="mailto:hello@hrisph.com" className="text-[#0038a8] dark:text-blue-400 hover:underline">hello@hrisph.com</a>.
          </p>
        </div>
      </Container>
    </div>
  );
}
