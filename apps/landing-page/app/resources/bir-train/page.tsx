import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Container } from '@/components/layout/Container';

export const metadata: Metadata = {
  title: 'BIR TRAIN Law Withholding Tax Guide 2024',
  description: 'Complete BIR TRAIN Law (R.A. 10963) withholding tax guide for Philippine employers. Monthly tax table, taxable income computation, and BIR Form 2316.',
};

const monthlyTaxTable = [
  { bracket: '0 – 20,833', tax: '0', rate: '0%', notes: 'Exempt' },
  { bracket: '20,834 – 33,332', tax: '0 + 20% of excess over ₱20,833', rate: '20%', notes: '' },
  { bracket: '33,333 – 66,666', tax: '2,500 + 25% of excess over ₱33,333', rate: '25%', notes: '' },
  { bracket: '66,667 – 166,666', tax: '10,833 + 30% of excess over ₱66,667', rate: '30%', notes: '' },
  { bracket: '166,667 – 666,666', tax: '40,833 + 32% of excess over ₱166,667', rate: '32%', notes: '' },
  { bracket: '666,667 and above', tax: '200,833 + 35% of excess over ₱666,667', rate: '35%', notes: 'Top bracket' },
];

const deductions = [
  { item: 'SSS Contribution', treatment: 'Fully deductible from gross income before tax computation' },
  { item: 'PhilHealth Contribution', treatment: 'Fully deductible from gross income before tax computation' },
  { item: 'Pag-IBIG Contribution', treatment: 'Fully deductible from gross income before tax computation' },
  { item: '13th Month Pay', treatment: 'Exempt up to ₱90,000 per year (combined with other benefits)' },
  { item: 'Other Benefits / Bonuses', treatment: 'Exempt up to ₱90,000 per year (combined with 13th month pay)' },
  { item: 'De Minimis Benefits', treatment: 'Fully exempt (rice subsidy ₱2,000/mo, clothing allowance ₱6,000/yr, etc.)' },
];

export default function BIRTrainPage() {
  return (
    <div className="pt-16">
      <div className="bg-linear-to-br from-[#fcd116]/10 to-background border-b border-border">
        <Container className="py-12 max-w-4xl">
          <Link href="/resources" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Resources
          </Link>
          <span className="text-xs font-bold uppercase tracking-widest text-amber-600 mb-3 block">BIR Reference</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground mb-3">
            BIR TRAIN Law Withholding Tax Guide
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            R.A. 10963 (Tax Reform for Acceleration and Inclusion Act) revised income tax brackets effective 2023 onwards. This guide covers monthly withholding tax computation for Philippine employers.
          </p>
        </Container>
      </div>

      <Container className="py-12 max-w-4xl">
        <div className="flex flex-col gap-10">
          {/* Monthly Tax Table */}
          <section>
            <h2 className="text-lg font-bold text-foreground mb-4">Monthly Withholding Tax Table (2023–present)</h2>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-amber-600 text-white">
                  <tr>
                    <th className="text-left p-3 font-semibold">Monthly Taxable Income (₱)</th>
                    <th className="text-center p-3 font-semibold">Rate</th>
                    <th className="text-left p-3 font-semibold">Tax Due</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyTaxTable.map((row, i) => (
                    <tr key={row.bracket} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                      <td className="p-3 font-medium text-foreground">{row.bracket}</td>
                      <td className="p-3 text-center font-bold text-amber-700 dark:text-amber-400">{row.rate}</td>
                      <td className="p-3 text-xs text-muted-foreground font-mono">{row.tax}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground mt-3">Source: BIR Revenue Regulations No. 11-2018, as amended. Amounts in Philippine Peso (₱).</p>
          </section>

          {/* How to Compute */}
          <section>
            <h2 className="text-lg font-bold text-foreground mb-4">Step-by-Step: Computing Monthly Withholding Tax</h2>
            <ol className="flex flex-col gap-4">
              {[
                { step: 1, title: 'Determine Gross Monthly Compensation', desc: 'Include basic salary, regular allowances, commissions, and other taxable compensation.' },
                { step: 2, title: 'Deduct Mandatory Government Contributions', desc: 'Subtract the employee\'s SSS, PhilHealth, and Pag-IBIG contributions from gross compensation.' },
                { step: 3, title: 'Deduct Other Non-Taxable Items', desc: 'Identify and remove any de minimis benefits within exemption limits (rice allowance, clothing allowance, etc.).' },
                { step: 4, title: 'Compute Monthly Taxable Income', desc: 'Gross Compensation − Government Contributions − Non-taxable items = Monthly Taxable Income.' },
                { step: 5, title: 'Apply Monthly Tax Table', desc: 'Locate the applicable bracket and compute the tax due using the formula for that bracket.' },
                { step: 6, title: 'Withhold and Remit', desc: 'Withhold the computed tax from the employee\'s net pay and remit to BIR on the prescribed deadline.' },
              ].map((item) => (
                <li key={item.step} className="flex gap-4 bg-card border border-border rounded-xl p-4">
                  <div className="w-8 h-8 rounded-full bg-[#0038a8] text-white flex items-center justify-center text-sm font-bold shrink-0">
                    {item.step}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-sm">{item.title}</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {/* Non-taxable Items */}
          <section>
            <h2 className="text-lg font-bold text-foreground mb-4">Non-Taxable Deductions & Exemptions</h2>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-semibold text-foreground">Item</th>
                    <th className="text-left p-3 font-semibold text-foreground">Tax Treatment</th>
                  </tr>
                </thead>
                <tbody>
                  {deductions.map((row, i) => (
                    <tr key={row.item} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                      <td className="p-3 font-medium text-foreground">{row.item}</td>
                      <td className="p-3 text-xs text-muted-foreground leading-relaxed">{row.treatment}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* BIR Forms */}
          <section>
            <h2 className="text-lg font-bold text-foreground mb-4">Key BIR Forms for Employers</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { form: 'BIR Form 1601-C', name: 'Monthly Remittance Return of Income Taxes Withheld on Compensation', due: 'On or before 10th day of following month (eFPS: 11th–15th)' },
                { form: 'BIR Form 1604-C', name: 'Annual Information Return of Income Taxes Withheld on Compensation', due: 'On or before January 31 of the following year' },
                { form: 'BIR Form 2316', name: 'Certificate of Compensation Payment / Tax Withheld', due: 'Issued to employees on or before January 31; filed with BIR by Feb 28' },
                { form: 'Alphalist', name: 'Alphabetical List of Employees', due: 'Submitted with BIR Form 1604-C; includes all employees and income details' },
              ].map((f) => (
                <div key={f.form} className="bg-card border border-border rounded-xl p-4">
                  <p className="text-xs font-bold text-amber-700 dark:text-amber-400 mb-1">{f.form}</p>
                  <p className="text-sm font-medium text-foreground mb-2">{f.name}</p>
                  <p className="text-xs text-muted-foreground">Due: {f.due}</p>
                </div>
              ))}
            </div>
          </section>

          {/* CTA */}
          <div className="bg-linear-to-br from-[#0038a8]/5 to-[#fcd116]/10 border border-border rounded-2xl p-6 text-center">
            <p className="text-sm font-semibold text-foreground mb-1">Automate BIR compliance with HRISPH</p>
            <p className="text-xs text-muted-foreground mb-4">Our system automatically computes withholding tax, generates BIR Form 2316, and prepares the alphalist — all in one click.</p>
            <Link href="/signup" className="inline-flex items-center justify-center h-9 px-5 rounded-lg bg-[#0038a8] text-white text-sm font-semibold hover:bg-[#002580] transition-colors">
              Start Free Trial
            </Link>
          </div>
        </div>
      </Container>
    </div>
  );
}
