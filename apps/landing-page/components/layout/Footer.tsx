import Link from 'next/link';
import { MapPin, Phone, Mail, CheckCircle2 } from 'lucide-react';
import { Container } from './Container';
import { Separator } from '@/components/ui/separator';

const footerLinks = {
  Product: [
    { label: 'Features', href: '/#features' },
    { label: 'Pricing', href: '/#pricing' },
    { label: 'Security', href: '/security' },
    { label: 'Integrations', href: '/integrations' },
    { label: "What's New", href: '/changelog' },
  ],
  Company: [
    { label: 'About Us', href: '/about' },
    { label: 'Blog', href: '/blog' },
    { label: 'Careers', href: '/careers' },
    { label: 'Press', href: '/press' },
    { label: 'Contact', href: '/contact' },
  ],
  Resources: [
    { label: 'HR Guides', href: '/resources' },
    { label: 'PH Labor Code', href: '/resources/labor-code' },
    { label: 'SSS Contribution Table', href: '/resources/sss' },
    { label: 'BIR TRAIN Law Guide', href: '/resources/bir-train' },
    { label: 'Help Center', href: '/help' },
  ],
  Legal: [
    { label: 'Privacy Policy', href: '/privacy-policy' },
    { label: 'Terms of Service', href: '/terms-of-service' },
    { label: 'Cookie Policy', href: '/cookie-policy' },
    { label: 'Data Processing', href: '/dpa' },
  ],
};

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-muted/40 border-t border-border mt-auto">
      <Container>
        <div className="py-12 md:py-16">
          {/* Logo & Description */}
          <div className="grid grid-cols-1 gap-8 md:grid-cols-6">
            {/* First column - wider */}
            <div className="md:col-span-2">
              <Link href="/" className="flex items-center gap-1 font-bold text-xl mb-4">
                <span className="text-[#0038a8]">HRIS</span>
                <span className="text-[#ce1126]">PH</span>
              </Link>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
                The enterprise-grade HRIS built for Philippine businesses. SSS, PhilHealth,
                Pag-IBIG, and BIR compliant payroll — automated.
              </p>
              <div className="mt-4 flex flex-col gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-[#0038a8]" />
                  <span>8F Ayala Avenue Tower, Makati City</span>
                </span>
                <span className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 shrink-0 text-[#0038a8]" />
                  <span>+63 2 8888 4747</span>
                </span>
                <span className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 shrink-0 text-[#0038a8]" />
                  <span>hello@hrisph.com</span>
                </span>
              </div>
            </div>

            {/* Link Columns - each takes 1 column */}
            {Object.entries(footerLinks).map(([category, links]) => (
              <div key={category} className="md:col-span-1">
                <h3 className="font-semibold text-sm mb-4">{category}</h3>
                <ul className="space-y-2">
                  {links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <Separator className="my-8" />

          {/* Bottom Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <p>© {currentYear} HRISPH, Inc. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2.5 py-1 rounded-full">
                <CheckCircle2 className="h-3 w-3 text-green-600 dark:text-green-400" />
                All systems operational
              </span>
              <span className="flex items-center gap-1">
                <span className="text-base"></span>
                Made in the Philippines
              </span>
            </div>
          </div>
        </div>
      </Container>
    </footer>
  );
}