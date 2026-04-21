import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Container } from '@/components/layout/Container';

export const metadata: Metadata = {
  title: 'PH Labor Code — Overtime, Holiday Pay & Leave Reference',
  description: 'Complete reference guide for Philippine Labor Code pay rates: overtime, holiday pay, night differential, service incentive leave, and separation pay.',
};

const overtimeRates = [
  { type: 'Regular Day Overtime', rate: '125%', basis: 'Regular hourly rate × 1.25' },
  { type: 'Rest Day Work', rate: '130%', basis: 'Regular hourly rate × 1.30' },
  { type: 'Rest Day Overtime', rate: '169%', basis: 'Regular hourly rate × 1.30 × 1.30' },
  { type: 'Regular Holiday', rate: '200%', basis: 'Regular day rate × 2' },
  { type: 'Regular Holiday Overtime', rate: '260%', basis: 'Regular day rate × 2 × 1.30' },
  { type: 'Special Non-Working Holiday', rate: '130%', basis: 'Regular day rate × 1.30 (if worked)' },
  { type: 'Special Holiday Overtime', rate: '169%', basis: 'Regular day rate × 1.30 × 1.30' },
  { type: 'Night Differential (10pm–6am)', rate: '+10%', basis: 'Regular hourly rate × 0.10 additional' },
];

const leaveTypes = [
  { leave: 'Service Incentive Leave (SIL)', entitlement: '5 days/year', law: 'Art. 95, Labor Code', notes: 'For employees with 1+ year of service. Convertible to cash if unused.' },
  { leave: 'Maternity Leave', entitlement: '105 days', law: 'R.A. 11210', notes: '120 days for solo mothers. Paid by SSS, not employer.' },
  { leave: 'Paternity Leave', entitlement: '7 days', law: 'R.A. 8187', notes: 'For first 4 deliveries. Paid by employer.' },
  { leave: 'Parental Leave (Solo Parent)', entitlement: '7 days', law: 'R.A. 8972', notes: 'For certified solo parents.' },
  { leave: 'Gynecological Leave', entitlement: '2 months', law: 'R.A. 9710 (Magna Carta for Women)', notes: 'For women with gynecological disorder requiring surgery.' },
  { leave: 'Bereavement Leave', entitlement: 'Varies', law: 'Company policy', notes: 'Not mandated by law; most companies grant 3–5 days.' },
];

const regularHolidays2024 = [
  { date: 'Jan 1', holiday: "New Year's Day" },
  { date: 'Apr 9', holiday: 'Araw ng Kagitingan (Bataan & Corregidor Day)' },
  { date: 'Apr 18–19', holiday: 'Maundy Thursday & Good Friday' },
  { date: 'May 1', holiday: 'Labor Day' },
  { date: 'Jun 12', holiday: 'Independence Day' },
  { date: 'Aug 26', holiday: 'National Heroes Day' },
  { date: 'Nov 30', holiday: "Bonifacio Day" },
  { date: 'Dec 25', holiday: 'Christmas Day' },
  { date: 'Dec 30', holiday: 'Rizal Day' },
];

export default function LaborCodePage() {
  return (
    <div className="pt-16">
      <div className="bg-linear-to-br from-[#ce1126]/5 to-background border-b border-border">
        <Container className="py-12 max-w-4xl">
          <Link href="/resources" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Resources
          </Link>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-bold uppercase tracking-widest text-[#ce1126]">Labor Code Reference</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground mb-3">
            Philippine Labor Code Pay Rates
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            Official overtime, holiday pay, night differential, and leave entitlement rates under Presidential Decree 442 and applicable Republic Acts. Updated for 2024.
          </p>
        </Container>
      </div>

      <Container className="py-12 max-w-4xl">
        <div className="flex flex-col gap-12">
          {/* Overtime & Holiday Rates */}
          <section>
            <h2 className="text-lg font-bold text-foreground mb-4">Overtime & Holiday Pay Rates</h2>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-4 font-semibold text-foreground">Type of Work</th>
                    <th className="text-center p-4 font-semibold text-foreground">Rate</th>
                    <th className="text-left p-4 font-semibold text-foreground">Computation Basis</th>
                  </tr>
                </thead>
                <tbody>
                  {overtimeRates.map((row, i) => (
                    <tr key={row.type} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                      <td className="p-4 text-foreground">{row.type}</td>
                      <td className="p-4 text-center font-bold text-[#0038a8]">{row.rate}</td>
                      <td className="p-4 text-muted-foreground font-mono text-xs">{row.basis}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground mt-3">Source: Presidential Decree 442 (Labor Code of the Philippines), as amended.</p>
          </section>

          {/* Leave Entitlements */}
          <section>
            <h2 className="text-lg font-bold text-foreground mb-4">Mandatory Leave Entitlements</h2>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-4 font-semibold text-foreground">Leave Type</th>
                    <th className="text-center p-4 font-semibold text-foreground">Days</th>
                    <th className="text-left p-4 font-semibold text-foreground">Law</th>
                    <th className="text-left p-4 font-semibold text-foreground">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {leaveTypes.map((row, i) => (
                    <tr key={row.leave} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                      <td className="p-4 font-medium text-foreground">{row.leave}</td>
                      <td className="p-4 text-center font-bold text-[#0038a8] whitespace-nowrap">{row.entitlement}</td>
                      <td className="p-4 text-xs text-muted-foreground whitespace-nowrap">{row.law}</td>
                      <td className="p-4 text-xs text-muted-foreground">{row.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Regular Holidays */}
          <section>
            <h2 className="text-lg font-bold text-foreground mb-4">2024 Regular Holidays (Philippines)</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {regularHolidays2024.map((h) => (
                <div key={h.date} className="flex items-center gap-4 bg-card border border-border rounded-xl p-4">
                  <span className="text-xs font-bold text-[#ce1126] w-14 shrink-0">{h.date}</span>
                  <span className="text-sm text-foreground">{h.holiday}</span>
                </div>
              ))}
            </div>
          </section>

          {/* CTA */}
          <div className="bg-linear-to-br from-[#0038a8]/5 to-[#ce1126]/5 border border-border rounded-2xl p-6 text-center">
            <p className="text-sm font-semibold text-foreground mb-1">Automate all of this in HRISPH</p>
            <p className="text-xs text-muted-foreground mb-4">Our platform automatically computes overtime, holiday pay, and night differential based on your employees&apos; time records.</p>
            <Link href="/signup" className="inline-flex items-center justify-center h-9 px-5 rounded-lg bg-[#0038a8] text-white text-sm font-semibold hover:bg-[#002580] transition-colors">
              Start Free Trial
            </Link>
          </div>
        </div>
      </Container>
    </div>
  );
}
