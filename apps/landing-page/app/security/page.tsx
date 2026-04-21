import type { Metadata } from 'next';
import Link from 'next/link';
import { Shield, Lock, Eye, Server, FileCheck, Bell } from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = {
  title: 'Security',
  description: 'HRISPH\'s enterprise-grade security posture — encryption, access controls, compliance certifications, and data privacy under RA 10173.',
};

const pillars = [
  {
    icon: Lock,
    color: '#0038a8',
    bg: 'bg-[#0038a8]/10',
    title: 'Encryption at Rest & In Transit',
    desc: 'All employee data is encrypted at rest using AES-256. All data in transit is protected with TLS 1.3. Encryption keys are managed using industry-standard key management practices.',
  },
  {
    icon: Eye,
    color: '#ce1126',
    bg: 'bg-[#ce1126]/10',
    title: 'Role-Based Access Control',
    desc: 'Granular RBAC ensures every user sees only the data they need. Separate roles for HR Admin, Payroll Officer, Department Manager, and Employee Self-Service.',
  },
  {
    icon: Server,
    color: '#16a34a',
    bg: 'bg-green-500/10',
    title: 'Secure Infrastructure',
    desc: 'Hosted on ISO 27001-certified cloud infrastructure. Data centers in Singapore and Japan with enterprise SLA. Philippine data residency available for Enterprise clients.',
  },
  {
    icon: FileCheck,
    color: '#7c3aed',
    bg: 'bg-purple-500/10',
    title: 'Audit Trails & Logging',
    desc: 'Every data access, modification, and login is logged with timestamp, user, and IP address. Audit logs are immutable and retained for 12 months.',
  },
  {
    icon: Bell,
    color: '#d97706',
    bg: 'bg-amber-500/10',
    title: 'Breach Detection & Response',
    desc: '24/7 automated threat detection with alerting. In the event of a breach, subscribers are notified within 72 hours in compliance with RA 10173 and NPC reporting requirements.',
  },
  {
    icon: Shield,
    color: '#0038a8',
    bg: 'bg-[#0038a8]/10',
    title: 'RA 10173 (Data Privacy Act) Compliance',
    desc: 'HRISPH is registered with the National Privacy Commission (NPC). Our Data Protection Officer oversees all processing activities and employee data handling.',
  },
];

const certifications = [
  { name: 'ISO 27001', status: 'Infrastructure provider certified', detail: 'Our cloud infrastructure provider maintains ISO 27001 certification.' },
  { name: 'RA 10173 (DPA)', status: 'Compliant', detail: 'NPC-registered, with Data Protection Officer and Privacy Management Program.' },
  { name: 'PCI-DSS', status: 'Payment processor', detail: 'Card payments processed by PCI-DSS Level 1 certified payment provider. We never store card numbers.' },
  { name: 'DICT Cloud First Policy', status: 'Aligned', detail: 'Architecture aligned with DICT guidelines for cloud services in the Philippines.' },
];

export default function SecurityPage() {
  return (
    <div className="pt-16">
      <div className="bg-linear-to-br from-[#0038a8]/5 via-background to-[#ce1126]/5 border-b border-border">
        <Container className="py-16 text-center max-w-3xl">
          <Badge variant="outline" className="mb-4 rounded-full px-3 py-1 border-[#0038a8]/30 text-[#0038a8] dark:text-blue-400">
            Security
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground mb-4">
            Enterprise-grade security for{' '}
            <span className="text-[#0038a8]">Philippine HR data</span>
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            Your employees trust you with their personal information. We take that responsibility seriously —
            with encryption, strict access controls, and full RA 10173 compliance built in from day one.
          </p>
        </Container>
      </div>

      <Container className="py-16">
        {/* Security Pillars */}
        <div className="mb-16">
          <p className="text-xs font-bold uppercase tracking-widest text-[#0038a8] mb-6">Security Pillars</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {pillars.map(({ icon: Icon, color, bg, title, desc }) => (
              <div key={title} className="bg-card border border-border rounded-2xl p-6 flex flex-col gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bg}`}>
                  <Icon className="h-5 w-5" style={{ color }} />
                </div>
                <h3 className="font-bold text-foreground">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Certifications */}
        <div className="mb-16">
          <p className="text-xs font-bold uppercase tracking-widest text-[#0038a8] mb-6">Compliance & Certifications</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {certifications.map((cert) => (
              <div key={cert.name} className="bg-card border border-border rounded-xl p-5 flex gap-4">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                  <span className="text-green-600 dark:text-green-400 text-lg">✓</span>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-foreground text-sm">{cert.name}</p>
                    <span className="text-xs text-green-700 dark:text-green-400 font-medium">{cert.status}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{cert.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Technical specs */}
        <div className="mb-16">
          <p className="text-xs font-bold uppercase tracking-widest text-[#0038a8] mb-6">Technical Specifications</p>
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                {[
                  { spec: 'Encryption at Rest', value: 'AES-256' },
                  { spec: 'Encryption in Transit', value: 'TLS 1.3' },
                  { spec: 'Password Hashing', value: 'bcrypt (cost factor 12+)' },
                  { spec: 'Authentication', value: 'MFA enforced for Admin roles; TOTP or SMS OTP' },
                  { spec: 'SSO Support', value: 'SAML 2.0, OAuth 2.0, Google Workspace (Enterprise)' },
                  { spec: 'Session Timeout', value: 'Configurable; default 8 hours idle' },
                  { spec: 'Data Backups', value: 'Daily automated backups; 30-day retention; point-in-time recovery' },
                  { spec: 'Uptime SLA', value: '99.9% (Starter/Pro); 99.99% (Enterprise)' },
                  { spec: 'Penetration Testing', value: 'Semi-annual third-party pen test' },
                  { spec: 'Audit Log Retention', value: '12 months (active); 5 years (archived)' },
                ].map((row, i) => (
                  <tr key={row.spec} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                    <td className="p-4 font-medium text-foreground w-1/2">{row.spec}</td>
                    <td className="p-4 text-muted-foreground font-mono text-xs">{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Report vulnerability CTA */}
        <div className="bg-linear-to-br from-[#0038a8]/5 to-[#ce1126]/5 border border-border rounded-2xl p-8 text-center">
          <h2 className="text-xl font-bold text-foreground mb-2">Found a security issue?</h2>
          <p className="text-sm text-muted-foreground mb-5 max-w-md mx-auto">
            We appreciate responsible disclosure. Report security vulnerabilities to our security team directly.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href="mailto:security@hrisph.com" className="inline-flex items-center justify-center h-10 px-6 rounded-lg bg-[#0038a8] text-white text-sm font-semibold hover:bg-[#002580] transition-colors">
              security@hrisph.com
            </a>
            <Link href="/dpa" className="inline-flex items-center justify-center h-10 px-6 rounded-lg border border-border text-foreground text-sm font-semibold hover:bg-muted transition-colors">
              Data Processing Agreement
            </Link>
          </div>
        </div>
      </Container>
    </div>
  );
}
