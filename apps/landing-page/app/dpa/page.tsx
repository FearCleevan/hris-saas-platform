import type { Metadata } from 'next';
import Link from 'next/link';
import { Container } from '@/components/layout/Container';

export const metadata: Metadata = {
  title: 'Data Processing Agreement',
  description: 'HRISPH Data Processing Agreement (DPA) — governs how HRISPH processes personal data on behalf of subscribers, in compliance with RA 10173.',
};

const sections = [
  {
    title: '1. Definitions',
    body: `In this Agreement:

**"Controller" / "Personal Information Controller (PIC)"** means the Subscriber, who determines the purposes and means of processing personal data of their employees.

**"Processor" / "Personal Information Processor (PIP)"** means HRisPH Technologies, Inc., which processes personal data on behalf of the Subscriber.

**"Personal Data"** means any information relating to identified or identifiable natural persons.

**"Sensitive Personal Information"** has the meaning given under Section 3(l) of RA 10173, and includes government IDs, salary information, and health data.

**"Processing"** means any operation performed on personal data, including collection, recording, organization, storage, updating, retrieval, consultation, use, disclosure, or deletion.

**"Data Breach"** means a security incident resulting in accidental or unlawful destruction, loss, alteration, unauthorized disclosure of, or access to, personal data.`,
  },
  {
    title: '2. Scope and Purpose',
    body: `This DPA governs the processing of personal data by HRISPH (Processor) on behalf of the Subscriber (Controller) in connection with the provision of HRIS and payroll services ("Services") under the main Terms of Service.

The Processor shall process personal data only for the following purposes:
- Payroll computation and generation of payslips
- Government remittance computation (SSS, PhilHealth, Pag-IBIG, BIR)
- Employee information management (201 file)
- Leave and attendance management
- Any other service features subscribed to by the Controller`,
  },
  {
    title: '3. Controller Obligations',
    body: `The Controller (Subscriber) agrees to:

- Ensure a lawful basis exists for processing employee personal data under RA 10173 (e.g., consent, contractual necessity, legal obligation)
- Obtain all required consent forms from employees for data processing activities
- Ensure the accuracy and completeness of personal data uploaded to the platform
- Notify the Processor promptly of any changes to data processing requirements
- Not instruct the Processor to process personal data in a manner that violates RA 10173 or other applicable laws`,
  },
  {
    title: '4. Processor Obligations',
    body: `HRISPH (Processor) agrees to:

- Process personal data only on documented instructions from the Controller
- Ensure all personnel with access to personal data are bound by confidentiality obligations
- Implement appropriate technical and organizational security measures (AES-256 encryption, TLS 1.3, RBAC, MFA)
- Not engage sub-processors without prior written authorization from the Controller, except those listed in Section 7
- Assist the Controller in fulfilling data subject rights requests under RA 10173 within reasonable timeframes
- Notify the Controller within 72 hours of becoming aware of a personal data breach
- Delete or return all personal data upon termination of the main agreement`,
  },
  {
    title: '5. Data Subject Rights',
    body: `The Processor shall assist the Controller in responding to the following data subject rights under RA 10173:

- Right to be Informed
- Right to Access
- Right to Correct
- Right to Erasure or Blocking
- Right to Object
- Right to Data Portability
- Right to File a Complaint with the NPC

The Processor shall respond to rights request inquiries forwarded by the Controller within 5 business days. The Controller remains responsible for the final response to data subjects.`,
  },
  {
    title: '6. Security Measures',
    body: `The Processor implements the following technical and organizational measures:

**Technical Measures:**
- AES-256 encryption at rest for all personal and sensitive data
- TLS 1.3 encryption in transit
- Role-based access controls (RBAC)
- Multi-factor authentication (MFA) for all admin accounts
- Automated backup with point-in-time recovery
- Regular penetration testing (semi-annual minimum)
- Comprehensive audit logs retained for 12 months

**Organizational Measures:**
- Data Protection Officer (DPO) designation and registration with the NPC
- Privacy Impact Assessments for new processing activities
- Staff privacy training (annual)
- Incident response plan with 72-hour breach notification procedure`,
  },
  {
    title: '7. Authorized Sub-Processors',
    body: `The Controller authorizes HRISPH to engage the following categories of sub-processors:

- Cloud infrastructure providers (data centers in Singapore/Japan; PH data residency available on request for Enterprise)
- Payment processing providers (PCI-DSS compliant; do not store full card data)
- Email delivery services (for system notifications and payslip delivery)
- Customer support platforms (for help desk operations)

The Processor shall notify the Controller of any intended changes to sub-processors at least 30 days in advance, giving the Controller the opportunity to object.`,
  },
  {
    title: '8. Data Breach Notification',
    body: `In the event of a personal data breach affecting Controller's data:

- The Processor shall notify the Controller within 72 hours of becoming aware of the breach
- Notification shall include: nature of breach, categories and volume of data affected, likely consequences, and mitigation measures taken
- The Controller remains responsible for notifying affected data subjects and the National Privacy Commission (NPC) as required under RA 10173

For breach notifications and security incidents, contact: security@hrisph.com`,
  },
  {
    title: '9. Term and Termination',
    body: `This DPA is effective from the date the Controller accepts HRISPH's Terms of Service and remains in force for the duration of the subscription.

Upon termination, the Processor shall:
- Provide the Controller with a full export of all personal data within 30 days
- Permanently delete all personal data from active systems within 60 days of export provision
- Provide written confirmation of deletion upon request

Data retained for legal compliance purposes (e.g., BIR-mandated 10-year payroll record retention) shall be handled as specified in the main Privacy Policy.`,
  },
  {
    title: '10. Governing Law',
    body: `This DPA is governed by the laws of the Republic of the Philippines, including RA 10173 (Data Privacy Act of 2012) and its Implementing Rules and Regulations.

Disputes shall be resolved in accordance with the dispute resolution provisions of the main Terms of Service.`,
  },
  {
    title: '11. Contact',
    body: `**Data Protection Officer — HRisPH Technologies, Inc.**
8F Ayala Avenue Tower, 6750 Ayala Ave
Makati City, Metro Manila 1226

Email: privacy@hrisph.com
Phone: +63 2 8888 4747
NPC Registration No.: [Pending — to be updated upon registration completion]`,
  },
];

export default function DPAPage() {
  return (
    <div className="pt-16">
      <div className="bg-muted/40 border-b border-border">
        <Container className="py-12 max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-widest text-[#0038a8] mb-2">Legal</p>
          <h1 className="text-3xl font-extrabold text-foreground mb-2">Data Processing Agreement</h1>
          <p className="text-sm text-muted-foreground">Last updated: October 1, 2024 · In compliance with RA 10173 (Data Privacy Act of 2012)</p>
          <p className="text-sm text-muted-foreground mt-2">
            This Agreement governs how HRisPH Technologies, Inc. processes personal data as a Personal Information Processor (PIP) on behalf of subscribers (Personal Information Controllers) under Philippine law.
          </p>
        </Container>
      </div>

      <Container className="py-12 max-w-3xl">
        <div className="flex flex-col gap-8">
          {sections.map((s) => (
            <section key={s.title}>
              <h2 className="text-lg font-bold text-foreground mb-3">{s.title}</h2>
              <div className="text-sm text-muted-foreground leading-relaxed space-y-3">
                {s.body.split('\n\n').map((para, i) => {
                  if (para.includes('\n-')) {
                    const [intro, ...items] = para.split('\n');
                    return (
                      <div key={i}>
                        {intro && !intro.startsWith('-') && <p>{intro}</p>}
                        <ul className="list-disc pl-5 space-y-1 mt-2">
                          {items.filter(Boolean).map((item, j) => (
                            <li key={j}>{item.replace(/^-\s*/, '')}</li>
                          ))}
                        </ul>
                      </div>
                    );
                  }
                  return <p key={i}>{para}</p>;
                })}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-border flex flex-col sm:flex-row gap-4 text-sm text-muted-foreground">
          <p>Questions? <a href="mailto:privacy@hrisph.com" className="text-[#0038a8] dark:text-blue-400 hover:underline">privacy@hrisph.com</a></p>
          <div className="flex gap-4">
            <Link href="/privacy-policy" className="text-[#0038a8] dark:text-blue-400 hover:underline">Privacy Policy</Link>
            <Link href="/terms-of-service" className="text-[#0038a8] dark:text-blue-400 hover:underline">Terms of Service</Link>
          </div>
        </div>
      </Container>
    </div>
  );
}
