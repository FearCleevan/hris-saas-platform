import type { Metadata } from 'next';
import { Container } from '@/components/layout/Container';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'HRISPH Terms of Service — the agreement governing your use of the HRISPH platform and services.',
};

const sections = [
  {
    title: '1. Acceptance of Terms',
    body: `By accessing or using the HRISPH platform and related services ("Services") provided by HRisPH Technologies, Inc. ("HRISPH," "we," or "us"), you ("Subscriber" or "you") agree to be bound by these Terms of Service ("Terms"). If you are entering into these Terms on behalf of a company or organization, you represent that you have the authority to bind that entity.

If you do not agree to these Terms, you may not use our Services.`,
  },
  {
    title: '2. Services Description',
    body: `HRISPH provides a cloud-based Human Resource Information System (HRIS) platform tailored for Philippine businesses, including:

- Payroll computation with automated BIR TRAIN Law withholding tax, SSS, PhilHealth, and Pag-IBIG calculations
- Employee information management (201 file)
- Government remittance report generation (BIR Form 2316, SSS R3, PhilHealth RF-1, Pag-IBIG MCRF)
- Leave management, time and attendance tracking
- 13th month pay computation and other statutory benefits

Service features and availability may vary by subscription plan. We reserve the right to modify, add, or discontinue features with 30 days' notice.`,
  },
  {
    title: '3. Account Registration and Security',
    body: `**Account Creation:** You must provide accurate, complete, and current information when registering. You are responsible for maintaining the accuracy of this information.

**Account Security:** You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must immediately notify us of any unauthorized use at security@hrisph.com.

**Authorized Users:** You may invite employees and HR staff as authorized users under your account, subject to your subscription's user limits. You are responsible for all actions taken by authorized users under your account.

**One Account per Entity:** Each legal entity must have a separate subscription. Multi-entity subscriptions are available under our Enterprise plan.`,
  },
  {
    title: '4. Subscription and Payment',
    body: `**Billing Cycle:** Subscriptions are billed monthly or annually in Philippine Peso (₱), as selected during signup.

**Pricing:** Subscription fees are based on the number of active employees in your account, as specified in your selected plan. We reserve the right to update pricing with 60 days' notice.

**Annual Discount:** Annual subscriptions receive a 20% discount. Annual fees are billed upfront and are non-refundable except as required by Philippine law.

**Late Payment:** Accounts with overdue invoices beyond 15 days will be suspended. Data is retained for 60 days after suspension before permanent deletion.

**Taxes:** Prices are exclusive of applicable Philippine taxes (VAT). Tax amounts will be indicated on your invoice.

**Free Trial:** New accounts receive a 14-day free trial. No credit card is required for the trial. At trial end, you must subscribe or your data will be retained for 30 days before deletion.`,
  },
  {
    title: '5. Subscriber Obligations',
    body: `You agree to:

- Provide accurate employee data and ensure you have authority to upload such data to our platform
- Obtain all necessary consents from employees for data processing as required by RA 10173
- Use the Services only for lawful purposes consistent with Philippine law
- Not attempt to reverse-engineer, decompile, or extract source code from our platform
- Not use the Services to process data for any third party other than your own employees and contractors
- Not use automated tools to scrape, crawl, or extract data from our platform without written permission
- Maintain appropriate data backup practices for business continuity purposes

You are solely responsible for the accuracy of data entered into the system and the compliance of final government remittances based on such data.`,
  },
  {
    title: '6. Data Ownership and Processing',
    body: `**Your Data:** You retain all ownership rights to the employee data you upload to HRISPH. We process this data solely to provide the Services, in accordance with our Privacy Policy and applicable Philippine law.

**Data Processor Role:** For employee personal data, HRISPH acts as a personal information processor (PIP) under RA 10173, processing data on your instructions. You remain the personal information controller (PIC) responsible for ensuring a lawful basis for processing.

**Data Portability:** You may export your data at any time in CSV or Excel format. Upon termination, we will provide a final data export before account deletion.

**Aggregate Analytics:** We may use anonymized, aggregated, non-identifiable data derived from your account for platform improvement and industry benchmarking.`,
  },
  {
    title: '7. Compliance Accuracy Disclaimer',
    body: `HRISPH makes every effort to keep our computation engines current with the latest BIR, SSS, PhilHealth, Pag-IBIG, and DOLE regulations. However:

- Government circulars may change without advance notice, and there may be a lag between circular issuance and our platform update.
- HRISPH-generated reports and computations are for reference and efficiency purposes. Final compliance responsibility rests with the Subscriber.
- We recommend engaging a licensed CPA or HR practitioner to review payroll outputs before government filing.
- HRISPH shall not be liable for penalties, surcharges, or interest arising from regulatory non-compliance.`,
  },
  {
    title: '8. Intellectual Property',
    body: `All intellectual property rights in the HRISPH platform, including software, design, trademarks, and documentation, are owned by HRisPH Technologies, Inc. or its licensors.

We grant you a limited, non-exclusive, non-transferable license to access and use the Services for your internal business purposes during the subscription term. This license does not include the right to sublicense, sell, or otherwise transfer access to the Services.

"HRISPH" and related marks are trademarks of HRisPH Technologies, Inc. You may not use our trademarks without prior written permission.`,
  },
  {
    title: '9. Limitation of Liability',
    body: `TO THE MAXIMUM EXTENT PERMITTED BY PHILIPPINE LAW:

- HRISPH's total liability to you for any claims arising under these Terms shall not exceed the amount you paid us in the 3 months preceding the claim.
- HRISPH shall not be liable for any indirect, incidental, consequential, or punitive damages, including loss of data, loss of profit, or business interruption.
- HRISPH shall not be liable for failures or delays caused by circumstances beyond our reasonable control (force majeure), including natural disasters, government actions, or internet infrastructure failures.

These limitations apply even if HRISPH has been advised of the possibility of such damages.`,
  },
  {
    title: '10. Service Availability',
    body: `We target 99.9% monthly uptime for our core Services. Planned maintenance windows will be announced at least 48 hours in advance via email and in-app notification.

In the event of unplanned downtime exceeding 4 consecutive hours in a calendar month, subscribers on Professional and Enterprise plans may request service credits as specified in our Service Level Agreement.

We do not guarantee uninterrupted access and shall not be liable for losses arising from temporary service unavailability.`,
  },
  {
    title: '11. Termination',
    body: `**By You:** You may cancel your subscription at any time. Cancellation takes effect at the end of the current billing period. No refunds are provided for unused portions of a billing period.

**By Us:** We may suspend or terminate your account immediately for: material breach of these Terms, non-payment beyond 15 days, illegal use of the Services, or if required by law.

**Effect of Termination:** Upon termination, your access to the Services ceases. We will retain your data for 60 days post-termination during which you may request a final export. Thereafter, data is permanently deleted.`,
  },
  {
    title: '12. Governing Law and Dispute Resolution',
    body: `These Terms are governed by and construed in accordance with the laws of the Republic of the Philippines.

Any dispute arising from these Terms shall first be subject to good-faith negotiation between the parties for 30 days. If unresolved, disputes shall be submitted to the Regional Trial Court of Makati City, Philippines, with both parties consenting to exclusive jurisdiction thereof.

For disputes involving amounts below ₱1,000,000, the parties agree to submit to mediation before the Philippine Mediation Center before filing any court action.`,
  },
  {
    title: '13. Modifications to Terms',
    body: `We may modify these Terms at any time. For material changes, we will notify you via email and in-app notice at least 30 days before the effective date.

Your continued use of the Services after the effective date of the modified Terms constitutes acceptance. If you do not agree to the modifications, you may terminate your subscription before the effective date.`,
  },
  {
    title: '14. Contact Information',
    body: `For questions about these Terms, contact us at:

HRisPH Technologies, Inc.
8F Ayala Avenue Tower, 6750 Ayala Ave
Makati City, Metro Manila 1226

Email: legal@hrisph.com
Phone: +63 2 8888 4747`,
  },
];

// Helper function to parse markdown-style bold syntax
function parseBoldText(text: string): React.ReactNode {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      const content = part.slice(2, -2);
      return <strong key={index} className="text-foreground">{content}</strong>;
    }
    return part;
  });
}

export default function TermsOfServicePage() {
  return (
    <div className="pt-16">
      <div className="bg-muted/40 border-b border-border">
        <Container className="py-12 max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-widest text-[#0038a8] mb-2">Legal</p>
          <h1 className="text-3xl font-extrabold text-foreground mb-2">Terms of Service</h1>
          <p className="text-sm text-muted-foreground">
            Last updated: October 1, 2024 &nbsp;·&nbsp; Effective date: October 1, 2024
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Governing law: Republic of the Philippines
          </p>
        </Container>
      </div>

      <Container className="py-12 max-w-3xl">
        {/* TOC */}
        <div className="bg-muted/40 border border-border rounded-xl p-5 mb-10">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Table of Contents</p>
          <ol className="list-decimal list-inside space-y-1">
            {sections.map((s, i) => (
              <li key={i} className="text-sm text-muted-foreground">
                {s.title.replace(/^\d+\.\s*/, '')}
              </li>
            ))}
          </ol>
        </div>

        <div className="flex flex-col gap-10">
          {sections.map((s) => (
            <section key={s.title}>
              <h2 className="text-lg font-bold text-foreground mb-3">{s.title}</h2>
              <div className="text-sm text-muted-foreground leading-relaxed space-y-3">
                {s.body.split('\n\n').map((para, i) => {
                  // Check if this paragraph contains bullet points
                  if (para.includes('\n-')) {
                    const [intro, ...items] = para.split('\n');
                    return (
                      <div key={i}>
                        {intro && !intro.startsWith('-') && <p>{parseBoldText(intro)}</p>}
                        <ul className="list-disc pl-5 flex flex-col gap-1 mt-2">
                          {(intro.startsWith('-') ? [intro, ...items] : items).filter(Boolean).map((item, j) => {
                            const clean = item.replace(/^-\s*/, '');
                            return (
                              <li key={j}>
                                {parseBoldText(clean)}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    );
                  }
                  
                  // Check if paragraph starts with bold text (e.g., "**Account Creation:** description")
                  const boldMatch = para.match(/^(\*\*[^*]+\*\*)([^]*)$/);
                  if (boldMatch) {
                    return (
                      <p key={i}>
                        <strong className="text-foreground">{boldMatch[1].slice(2, -2)}</strong>
                        {boldMatch[2]}
                      </p>
                    );
                  }
                  
                  // Check if paragraph contains multiple bold header lines
                  if (para.includes('**') && para.split('\n').every(line => line === '' || line.startsWith('**'))) {
                    return (
                      <div key={i} className="flex flex-col gap-2">
                        {para.split('\n').filter(Boolean).map((line, j) => {
                          const m = line.match(/^(\*\*[^*]+\*\*)([^]*)$/);
                          return m ? (
                            <p key={j}>
                              <strong className="text-foreground">{m[1].slice(2, -2)}</strong>
                              {m[2]}
                            </p>
                          ) : (
                            <p key={j}>{parseBoldText(line)}</p>
                          );
                        })}
                      </div>
                    );
                  }
                  
                  // Regular paragraph with possible inline bold
                  return <p key={i}>{parseBoldText(para)}</p>;
                })}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-border text-center">
          <p className="text-sm text-muted-foreground">
            Questions about these Terms?{' '}
            <a href="mailto:legal@hrisph.com" className="text-[#0038a8] dark:text-blue-400 hover:underline">
              legal@hrisph.com
            </a>
          </p>
        </div>
      </Container>
    </div>
  );
}