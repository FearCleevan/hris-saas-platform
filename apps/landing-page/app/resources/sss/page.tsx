import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Container } from '@/components/layout/Container';

export const metadata: Metadata = {
  title: 'SSS Contribution Table 2024 — Employee & Employer Shares',
  description: 'Complete SSS contribution table for 2024. MSC brackets, employee share, employer share, and EC contribution. Based on SSS Circular No. 2023-003.',
};

const sssTable = [
  { msc: '5,000', ee: '225.00', er: '475.00', ec: '10.00', total: '710.00' },
  { msc: '5,250', ee: '236.25', er: '498.75', ec: '10.00', total: '745.00' },
  { msc: '5,500', ee: '247.50', er: '522.50', ec: '10.00', total: '780.00' },
  { msc: '5,750', ee: '258.75', er: '546.25', ec: '10.00', total: '815.00' },
  { msc: '6,000', ee: '270.00', er: '570.00', ec: '10.00', total: '850.00' },
  { msc: '6,500', ee: '292.50', er: '617.50', ec: '10.00', total: '920.00' },
  { msc: '7,000', ee: '315.00', er: '665.00', ec: '10.00', total: '990.00' },
  { msc: '7,500', ee: '337.50', er: '712.50', ec: '10.00', total: '1,060.00' },
  { msc: '8,000', ee: '360.00', er: '760.00', ec: '10.00', total: '1,130.00' },
  { msc: '8,500', ee: '382.50', er: '807.50', ec: '10.00', total: '1,200.00' },
  { msc: '9,000', ee: '405.00', er: '855.00', ec: '10.00', total: '1,270.00' },
  { msc: '9,500', ee: '427.50', er: '902.50', ec: '10.00', total: '1,340.00' },
  { msc: '10,000', ee: '450.00', er: '950.00', ec: '10.00', total: '1,410.00' },
  { msc: '11,000', ee: '495.00', er: '1,045.00', ec: '10.00', total: '1,550.00' },
  { msc: '12,000', ee: '540.00', er: '1,140.00', ec: '10.00', total: '1,690.00' },
  { msc: '13,000', ee: '585.00', er: '1,235.00', ec: '10.00', total: '1,830.00' },
  { msc: '14,000', ee: '630.00', er: '1,330.00', ec: '10.00', total: '1,970.00' },
  { msc: '15,000', ee: '675.00', er: '1,425.00', ec: '10.00', total: '2,110.00' },
  { msc: '16,000', ee: '720.00', er: '1,520.00', ec: '30.00', total: '2,270.00' },
  { msc: '17,000', ee: '765.00', er: '1,615.00', ec: '30.00', total: '2,410.00' },
  { msc: '18,000', ee: '810.00', er: '1,710.00', ec: '30.00', total: '2,550.00' },
  { msc: '19,000', ee: '855.00', er: '1,805.00', ec: '30.00', total: '2,690.00' },
  { msc: '20,000', ee: '900.00', er: '1,900.00', ec: '30.00', total: '2,830.00' },
  { msc: '25,000', ee: '1,125.00', er: '2,375.00', ec: '30.00', total: '3,530.00' },
  { msc: '30,000', ee: '1,350.00', er: '2,850.00', ec: '30.00', total: '4,230.00' },
  { msc: '35,000 (max)', ee: '1,575.00', er: '3,325.00', ec: '30.00', total: '4,930.00' },
];

export default function SSSTablePage() {
  return (
    <div className="pt-16">
      <div className="bg-linear-to-br from-[#0038a8]/5 to-background border-b border-border">
        <Container className="py-12 max-w-4xl">
          <Link href="/resources" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Resources
          </Link>
          <span className="text-xs font-bold uppercase tracking-widest text-[#0038a8] mb-3 block">SSS Reference</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground mb-3">
            SSS Contribution Table 2024
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            Based on SSS Circular No. 2023-003. Contribution rate is <strong className="text-foreground">14%</strong> of Monthly Salary Credit (MSC): 4.5% employee share, 9.5% employer share. Effective January 2024.
          </p>
        </Container>
      </div>

      <Container className="py-12 max-w-4xl">
        <div className="flex flex-col gap-8">
          {/* Key facts */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total Rate', value: '14%' },
              { label: 'Employee Share', value: '4.5%' },
              { label: 'Employer Share', value: '9.5%' },
              { label: 'Max MSC', value: '₱35,000' },
            ].map((f) => (
              <div key={f.label} className="bg-card border border-border rounded-xl p-4 text-center">
                <p className="text-xl font-extrabold text-[#0038a8] mb-1">{f.value}</p>
                <p className="text-xs text-muted-foreground">{f.label}</p>
              </div>
            ))}
          </div>

          {/* Contribution Table */}
          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">Contribution Schedule (Selected MSC Brackets)</h2>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-[#0038a8] text-white">
                  <tr>
                    <th className="text-left p-3 font-semibold">Monthly Salary Credit (MSC)</th>
                    <th className="text-right p-3 font-semibold">EE Share</th>
                    <th className="text-right p-3 font-semibold">ER Share</th>
                    <th className="text-right p-3 font-semibold">EC</th>
                    <th className="text-right p-3 font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {sssTable.map((row, i) => (
                    <tr key={row.msc} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                      <td className="p-3 font-medium text-foreground">₱{row.msc}</td>
                      <td className="p-3 text-right text-foreground">₱{row.ee}</td>
                      <td className="p-3 text-right text-foreground">₱{row.er}</td>
                      <td className="p-3 text-right text-muted-foreground">₱{row.ec}</td>
                      <td className="p-3 text-right font-bold text-[#0038a8]">₱{row.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              EC = Employees&apos; Compensation. EE = Employee. ER = Employer. Source: SSS Circular No. 2023-003.
            </p>
          </section>

          {/* How MSC is determined */}
          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">How to Determine the MSC</h2>
            <div className="bg-card border border-border rounded-xl p-5 text-sm text-muted-foreground leading-relaxed space-y-2">
              <p>The Monthly Salary Credit (MSC) is determined by the employee&apos;s actual monthly salary:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>The MSC is the nearest lower MSC bracket to the employee&apos;s actual monthly salary.</li>
                <li>Minimum MSC: ₱5,000 (employees earning below this contribute based on ₱5,000 MSC).</li>
                <li>Maximum MSC: ₱35,000 (employees earning above ₱35,000 still contribute based on ₱35,000).</li>
                <li>For kasambahay (household workers): minimum MSC is ₱1,000, employer pays full contribution.</li>
              </ul>
            </div>
          </section>

          {/* CTA */}
          <div className="bg-linear-to-br from-[#0038a8]/5 to-[#ce1126]/5 border border-border rounded-2xl p-6 text-center">
            <p className="text-sm font-semibold text-foreground mb-1">Compute SSS automatically</p>
            <p className="text-xs text-muted-foreground mb-4">HRISPH applies the correct MSC bracket and generates the SSS R3 remittance report automatically every payroll.</p>
            <Link href="/signup" className="inline-flex items-center justify-center h-9 px-5 rounded-lg bg-[#0038a8] text-white text-sm font-semibold hover:bg-[#002580] transition-colors">
              Start Free Trial
            </Link>
          </div>
        </div>
      </Container>
    </div>
  );
}
