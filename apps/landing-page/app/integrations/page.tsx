import type { Metadata } from 'next';
import Link from 'next/link';
import { Container } from '@/components/layout/Container';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = {
  title: 'Integrations',
  description: 'Connect HRISPH with your existing tools — accounting software, biometrics, banking, and more. Built for Philippine businesses.',
};

const integrations = [
  {
    category: 'Accounting & Finance',
    color: '#16a34a',
    items: [
      { name: 'QuickBooks Online', desc: 'Sync payroll journal entries automatically after every payroll run.', status: 'Available' },
      { name: 'Xero', desc: 'Push payroll expenses directly to your Xero chart of accounts.', status: 'Available' },
      { name: 'SAP Business One', desc: 'Enterprise-grade integration for full accounting sync.', status: 'Available' },
      { name: 'SAP SuccessFactors', desc: 'Sync employee master data and org structure.', status: 'Enterprise' },
    ],
  },
  {
    category: 'Biometrics & Time Attendance',
    color: '#0038a8',
    items: [
      { name: 'ZKTeco', desc: 'Real-time attendance sync from ZKTeco biometric devices via SDK.', status: 'Available' },
      { name: 'Anviz', desc: 'Fingerprint, face recognition, and RFID card support.', status: 'Available' },
      { name: 'Suprema', desc: 'Enterprise biometric terminal integration.', status: 'Enterprise' },
      { name: 'Manual CSV Import', desc: 'Import attendance records from any DTR system via CSV.', status: 'Available' },
    ],
  },
  {
    category: 'Banking & Payroll Disbursement',
    color: '#ce1126',
    items: [
      { name: 'UnionBank EasyBiz', desc: 'One-click payroll disbursement to UnionBank accounts and other banks via PESONet/InstaPay.', status: 'Available' },
      { name: 'BDO Corporate', desc: 'Direct payroll crediting to BDO employee accounts.', status: 'Available' },
      { name: 'BPI Corporate', desc: 'Automated payroll file upload to BPI Corporate Online.', status: 'Available' },
      { name: 'Metrobank Direct', desc: 'Payroll disbursement via Metrobank Corporate Online.', status: 'Coming Soon' },
    ],
  },
  {
    category: 'Government Portals',
    color: '#7c3aed',
    items: [
      { name: 'BIR eFPS / eBIRForms', desc: 'Generate BIR-ready XML files for 1601-C, 1604-C, and alphalist submission.', status: 'Available' },
      { name: 'SSS Online', desc: 'Export SSS R3 contribution report in the format required for online submission.', status: 'Available' },
      { name: 'PhilHealth EPRS', desc: 'Generate RF-1 contribution file for electronic PhilHealth remittance.', status: 'Available' },
      { name: 'Pag-IBIG e-REMIT', desc: 'Export MCRF contribution schedule for Pag-IBIG online remittance.', status: 'Available' },
    ],
  },
  {
    category: 'Communication & Collaboration',
    color: '#d97706',
    items: [
      { name: 'Slack', desc: 'Send payroll approval requests and HR notifications directly to Slack channels.', status: 'Coming Soon' },
      { name: 'Microsoft Teams', desc: 'HR announcements and leave approval workflows via Teams.', status: 'Coming Soon' },
      { name: 'Email (SMTP)', desc: 'Send payslips and notifications via your own SMTP server or Gmail.', status: 'Available' },
    ],
  },
  {
    category: 'Developer & API',
    color: '#0ea5e9',
    items: [
      { name: 'REST API', desc: 'Full-featured REST API for custom integrations with any system. OAuth 2.0 authentication.', status: 'Available' },
      { name: 'Webhooks', desc: 'Real-time event notifications (payroll approved, employee added, leave filed) to your systems.', status: 'Available' },
      { name: 'CSV / Excel Export', desc: 'Export any report in CSV or Excel format for use in other systems.', status: 'Available' },
    ],
  },
];

const statusColor: Record<string, string> = {
  'Available': 'bg-green-500/10 text-green-700 dark:text-green-400',
  'Enterprise': 'bg-[#0038a8]/10 text-[#0038a8] dark:text-blue-400',
  'Coming Soon': 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
};

export default function IntegrationsPage() {
  return (
    <div className="pt-16">
      <div className="bg-linear-to-br from-[#0038a8]/5 to-background border-b border-border">
        <Container className="py-14 text-center">
          <Badge variant="outline" className="mb-4 rounded-full px-3 py-1 border-[#0038a8]/30 text-[#0038a8] dark:text-blue-400">
            Integrations
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground mb-3">
            Connect with your{' '}
            <span className="text-[#0038a8]">existing tools</span>
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            HRISPH connects with the accounting software, biometrics, banks, and government portals
            that Philippine businesses already use.
          </p>
        </Container>
      </div>

      <Container className="py-16">
        <div className="flex flex-col gap-12">
          {integrations.map(({ category, color, items }) => (
            <section key={category}>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-2 h-5 rounded-full" style={{ backgroundColor: color }} />
                <h2 className="text-lg font-bold text-foreground">{category}</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {items.map((item) => (
                  <div key={item.name} className="bg-card border border-border rounded-xl p-4 flex flex-col gap-2 hover:border-[#0038a8]/40 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-foreground text-sm">{item.name}</p>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${statusColor[item.status]}`}>
                        {item.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Custom Integration CTA */}
        <div className="mt-16 bg-linear-to-br from-[#0038a8]/5 to-[#ce1126]/5 border border-border rounded-2xl p-8 sm:p-10 text-center">
          <h2 className="text-xl font-bold text-foreground mb-2">Need a custom integration?</h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            Our REST API supports any integration. Talk to our Enterprise team about custom connectors for your specific systems.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/contact" className="inline-flex items-center justify-center h-10 px-6 rounded-lg bg-[#0038a8] text-white text-sm font-semibold hover:bg-[#002580] transition-colors">
              Talk to Enterprise Sales
            </Link>
            <Link href="/help" className="inline-flex items-center justify-center h-10 px-6 rounded-lg border border-border text-foreground text-sm font-semibold hover:bg-muted transition-colors">
              API Documentation
            </Link>
          </div>
        </div>
      </Container>
    </div>
  );
}
