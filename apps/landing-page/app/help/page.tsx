import type { Metadata } from 'next';
import Link from 'next/link';
import { Container } from '@/components/layout/Container';
import { Badge } from '@/components/ui/badge';
import faqData from '@/data/faq.json';

export const metadata: Metadata = {
  title: 'Help Center',
  description: 'Find answers to common questions about HRISPH — payroll setup, compliance, integrations, pricing, and support.',
};

const categories = ['General', 'Payroll', 'Setup', 'Pricing', 'Security', 'Features', 'Support', 'Integrations'];

const quickLinks = [
  { emoji: '📚', title: 'Getting Started Guide', desc: 'Set up your first payroll run in 15 minutes', href: '/resources' },
  { emoji: '🔢', title: 'SSS Contribution Table', desc: '2024 rates and MSC brackets', href: '/resources/sss' },
  { emoji: '📋', title: 'BIR TRAIN Law Guide', desc: 'Monthly withholding tax computation', href: '/resources/bir-train' },
  { emoji: '⚖️', title: 'Labor Code Reference', desc: 'Overtime, holiday pay, and leave rates', href: '/resources/labor-code' },
  { emoji: '💬', title: 'Contact Support', desc: 'Reach our team directly', href: '/contact' },
  { emoji: '📖', title: 'HR Compliance Blog', desc: 'Expert articles on PH compliance', href: '/blog' },
];

export default function HelpPage() {
  const grouped = categories.reduce<Record<string, typeof faqData>>((acc, cat) => {
    acc[cat] = faqData.filter((q) => q.category === cat);
    return acc;
  }, {});

  return (
    <div className="pt-16">
      {/* Hero */}
      <div className="bg-linear-to-br from-[#0038a8]/5 to-background border-b border-border">
        <Container className="py-14 text-center">
          <Badge variant="outline" className="mb-4 rounded-full px-3 py-1 border-[#0038a8]/30 text-[#0038a8] dark:text-blue-400">
            Help Center
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground mb-3">
            How can we <span className="text-[#0038a8]">help you?</span>
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Find answers about payroll setup, compliance, integrations, and everything HRISPH.
          </p>
        </Container>
      </div>

      <Container className="py-16">
        {/* Quick Links */}
        <div className="mb-14">
          <p className="text-xs font-bold uppercase tracking-widest text-[#0038a8] mb-5">Popular Topics</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {quickLinks.map((link) => (
              <Link key={link.href} href={link.href} className="group">
                <div className="bg-card border border-border rounded-xl p-4 flex items-start gap-3 hover:border-[#0038a8]/40 transition-colors">
                  <span className="text-2xl shrink-0">{link.emoji}</span>
                  <div>
                    <p className="text-sm font-semibold text-foreground group-hover:text-[#0038a8] transition-colors">{link.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{link.desc}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* FAQ by Category */}
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#0038a8] mb-5">Frequently Asked Questions</p>
          <div className="flex flex-col gap-10">
            {categories.filter((cat) => grouped[cat]?.length > 0).map((cat) => (
              <section key={cat}>
                <h2 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
                  <span className="w-1.5 h-5 rounded-full bg-[#0038a8]" />
                  {cat}
                </h2>
                <div className="flex flex-col gap-3">
                  {grouped[cat].map((faq) => (
                    <details key={faq.id} className="group bg-card border border-border rounded-xl overflow-hidden">
                      <summary className="flex items-center justify-between p-4 cursor-pointer font-medium text-sm text-foreground list-none hover:bg-muted/30 transition-colors gap-3">
                        <span>{faq.question}</span>
                        <span className="text-muted-foreground text-lg leading-none group-open:rotate-45 transition-transform shrink-0">+</span>
                      </summary>
                      <div className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed border-t border-border pt-3">
                        {faq.answer}
                      </div>
                    </details>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>

        {/* Contact CTA */}
        <div className="mt-14 bg-linear-to-br from-[#0038a8]/5 to-[#ce1126]/5 border border-border rounded-2xl p-8 text-center">
          <h2 className="text-lg font-bold text-foreground mb-2">Can&apos;t find what you need?</h2>
          <p className="text-sm text-muted-foreground mb-5 max-w-md mx-auto">
            Our Philippine support team is available Mon–Fri 8AM–6PM PHT. We reply in English and Filipino.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/contact" className="inline-flex items-center justify-center h-10 px-6 rounded-lg bg-[#0038a8] text-white text-sm font-semibold hover:bg-[#002580] transition-colors">
              Contact Support
            </Link>
            <a href="mailto:support@hrisph.com" className="inline-flex items-center justify-center h-10 px-6 rounded-lg border border-border text-foreground text-sm font-semibold hover:bg-muted transition-colors">
              support@hrisph.com
            </a>
          </div>
        </div>
      </Container>
    </div>
  );
}
