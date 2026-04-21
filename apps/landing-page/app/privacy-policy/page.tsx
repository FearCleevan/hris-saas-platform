import type { Metadata } from 'next';
import { Container } from '@/components/layout/Container';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'HRISPH Privacy Policy — how we collect, use, and protect your data under RA 10173 (Data Privacy Act of 2012).',
};

const sections = [
  {
    title: '1. Introduction',
    body: `HRISPH (operated by HRisPH Technologies, Inc., "we," "us," or "our") is committed to protecting the privacy and security of your personal information in compliance with Republic Act No. 10173, otherwise known as the Data Privacy Act of 2012 (DPA), and its Implementing Rules and Regulations.

This Privacy Policy explains how we collect, use, disclose, and protect information about you when you use our HRIS platform and related services ("Services"). By using our Services, you consent to the practices described in this Policy.`,
  },
  {
    title: '2. Personal Information We Collect',
    body: `We collect the following categories of personal information:

**Account & Contact Information:** Name, email address, phone number, company name, and job title when you register for an account or contact us.

**Employee Data (processed on your behalf):** As a data processor, we process employee personal data that you upload to our platform, including: full legal name, date of birth, address, civil status, dependents, government IDs (SSS, PhilHealth, Pag-IBIG, TIN), salary and compensation details, employment history, and bank account information for payroll disbursement.

**Usage Data:** Log data, device information, browser type, IP address, pages visited, and session duration for security and platform improvement purposes.

**Billing Information:** Payment card details and billing address, processed via our PCI-DSS compliant payment processor. We do not store full card numbers on our servers.`,
  },
  {
    title: '3. How We Use Your Information',
    body: `We use your information for the following purposes:

- **Service Delivery:** To provide, operate, and maintain our HRIS platform, including payroll computation, government remittance reports, and employee management features.
- **Compliance:** To generate BIR, SSS, PhilHealth, and Pag-IBIG reports required by Philippine law.
- **Communication:** To send transactional emails, support responses, and platform notifications.
- **Security:** To detect, prevent, and respond to fraud, security threats, and system abuse.
- **Improvement:** To analyze usage patterns and improve our Services (using anonymized/aggregated data only).
- **Legal Obligations:** To comply with applicable Philippine laws, regulations, and government authority orders.

We do not sell your personal information to third parties. We do not use employee data you upload for our own marketing or analytics purposes.`,
  },
  {
    title: '4. Legal Basis for Processing (RA 10173)',
    body: `Under the Data Privacy Act of 2012, we process personal information based on the following lawful bases:

- **Consent:** Where you have given explicit consent for a specific processing activity.
- **Contractual Necessity:** Processing necessary to perform our contract with you (the subscriber).
- **Legal Obligation:** Processing required to comply with Philippine laws (e.g., BIR, SSS, PhilHealth reporting requirements).
- **Legitimate Interest:** Processing for security, fraud prevention, and platform improvement, where these interests do not override your rights.

For sensitive personal information (as defined under RA 10173), we require explicit consent or rely on processing grounds explicitly permitted under the DPA.`,
  },
  {
    title: '5. Data Sharing and Disclosure',
    body: `We share your information only in the following circumstances:

**Service Providers:** We engage trusted third-party processors to assist in operating our Services (cloud hosting, payment processing, email delivery). All processors are bound by data processing agreements ensuring equivalent data protection standards.

**Government Agencies:** We generate reports for SSS, PhilHealth, Pag-IBIG, and BIR as required by Philippine law, based on data you provide and submit.

**Legal Requirements:** We may disclose information when required by law, court order, or competent government authority under applicable Philippine regulations.

**Business Transfers:** In the event of a merger or acquisition, we will notify you and ensure your data remains protected under equivalent terms.

We do not transfer personal data outside the Philippines without implementing appropriate safeguards as required by the DPA and NPC guidelines.`,
  },
  {
    title: '6. Data Retention',
    body: `We retain your personal information for as long as necessary to provide our Services and comply with legal obligations:

- **Account data:** Retained for the duration of your subscription plus 5 years after termination (for audit and legal compliance purposes).
- **Employee payroll records:** Retained for 10 years as required by BIR regulations.
- **Government remittance records:** Retained for 5 years in accordance with SSS, PhilHealth, and Pag-IBIG requirements.
- **Usage logs:** Retained for 12 months for security purposes.

Upon expiration of retention periods, we securely delete or anonymize personal information using industry-standard methods.`,
  },
  {
    title: '7. Your Rights Under RA 10173',
    body: `As a data subject under the Data Privacy Act, you have the following rights:

- **Right to be Informed:** To be notified of how your data is collected and used.
- **Right to Access:** To request a copy of the personal information we hold about you.
- **Right to Correct:** To request correction of inaccurate or incomplete personal information.
- **Right to Erasure:** To request deletion of your personal information, subject to legal retention obligations.
- **Right to Object:** To object to certain types of processing, including processing for direct marketing.
- **Right to Data Portability:** To receive your data in a structured, machine-readable format.
- **Right to Lodge a Complaint:** To file a complaint with the National Privacy Commission (NPC) at www.privacy.gov.ph.

To exercise these rights, contact our Data Protection Officer at: privacy@hrisph.com`,
  },
  {
    title: '8. Data Security',
    body: `We implement appropriate technical and organizational security measures to protect your personal information, including:

- AES-256 encryption at rest for all personal and sensitive data
- TLS 1.3 encryption in transit for all data communications
- Role-based access controls limiting data access to authorized personnel
- Multi-factor authentication for platform access
- Regular security audits and penetration testing
- Data centers located within the Philippines with ISO 27001 certification
- Comprehensive audit logs for all data access and modifications

In the event of a personal data breach that poses a real risk to your rights and freedoms, we will notify you and the National Privacy Commission within 72 hours of discovery, as required under the DPA.`,
  },
  {
    title: '9. Cookies and Tracking',
    body: `Our website uses cookies and similar technologies to:

- Maintain your session and authentication state (strictly necessary)
- Remember your preferences (functional cookies)
- Analyze platform usage for improvement (analytics cookies, anonymized)

You may manage cookie preferences through your browser settings. Disabling strictly necessary cookies may affect platform functionality. We do not use third-party advertising or tracking cookies.`,
  },
  {
    title: '10. Children\'s Privacy',
    body: `Our Services are not directed to individuals under the age of 18. We do not knowingly collect personal information from minors. If you believe we have inadvertently collected such information, please contact us immediately at privacy@hrisph.com.`,
  },
  {
    title: '11. Changes to This Policy',
    body: `We may update this Privacy Policy from time to time to reflect changes in our practices or legal requirements. We will notify you of material changes via email or a prominent notice on our platform at least 30 days before the effective date. Your continued use of our Services after the effective date constitutes acceptance of the updated Policy.`,
  },
  {
    title: '12. Contact Us',
    body: `For privacy-related questions, requests, or complaints, contact our Data Protection Officer:

**HRisPH Technologies, Inc.**
Data Protection Officer
8F Ayala Avenue Tower, 6750 Ayala Ave
Makati City, Metro Manila 1226

Email: privacy@hrisph.com
Phone: +63 2 8888 4747

For complaints not resolved to your satisfaction, you may lodge a complaint with the **National Privacy Commission (NPC)** at www.privacy.gov.ph.`,
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

export default function PrivacyPolicyPage() {
  return (
    <div className="pt-16">
      <div className="bg-muted/40 border-b border-border">
        <Container className="py-12 max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-widest text-[#0038a8] mb-2">Legal</p>
          <h1 className="text-3xl font-extrabold text-foreground mb-2">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground">
            Last updated: October 1, 2024 &nbsp;·&nbsp; Effective date: October 1, 2024
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            In compliance with Republic Act No. 10173 (Data Privacy Act of 2012) and NPC Regulations.
          </p>
        </Container>
      </div>

      <Container className="py-12 max-w-3xl">
        <div className="flex flex-col gap-10">
          {sections.map((s) => (
            <section key={s.title}>
              <h2 className="text-lg font-bold text-foreground mb-3">{s.title}</h2>
              <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line space-y-3">
                {s.body.split('\n\n').map((para, i) => {
                  // Check if this paragraph contains bullet points
                  if (para.includes('\n-')) {
                    const [intro, ...items] = para.split('\n');
                    return (
                      <div key={i}>
                        {intro && <p>{parseBoldText(intro)}</p>}
                        <ul className="list-disc pl-5 flex flex-col gap-1 mt-2">
                          {items.filter((l) => l.trim()).map((item, j) => {
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
                  
                  // Check if paragraph starts with bold text (e.g., "**Account & Contact Information:** description")
                  // Using [^] instead of dot with 's' flag to match any character including newlines
                  const boldMatch = para.match(/^(\*\*[^*]+\*\*)([^]*)$/);
                  if (boldMatch) {
                    return (
                      <p key={i}>
                        <strong className="text-foreground">{boldMatch[1].slice(2, -2)}</strong>
                        {boldMatch[2]}
                      </p>
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
            Questions about this policy?{' '}
            <a href="mailto:privacy@hrisph.com" className="text-[#0038a8] dark:text-blue-400 hover:underline">
              privacy@hrisph.com
            </a>
          </p>
        </div>
      </Container>
    </div>
  );
}