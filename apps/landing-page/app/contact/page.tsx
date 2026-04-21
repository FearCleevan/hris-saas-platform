import type { Metadata } from 'next';
import { 
  MapPin, 
  Phone, 
  Mail, 
  Clock, 
  MessageSquare,
  MessageCircle,
  AtSign,
  Headphones,
  BookOpen
} from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { Badge } from '@/components/ui/badge';
import { ContactForm } from './ContactForm';

export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'Get in touch with the HRISPH team. Available Mon–Fri, 8AM–6PM PHT.',
};

const contactDetails = [
  {
    icon: MapPin,
    label: 'Office Address',
    value: '8F Ayala Avenue Tower, 6750 Ayala Ave\nMakati City, Metro Manila 1226',
    color: 'text-[#0038a8] dark:text-blue-400',
    bg: 'bg-[#0038a8]/10',
  },
  {
    icon: Phone,
    label: 'Phone',
    value: '+63 2 8888 4747\n+63 917 888 4747 (Mobile)',
    color: 'text-[#ce1126] dark:text-red-400',
    bg: 'bg-[#ce1126]/10',
  },
  {
    icon: Mail,
    label: 'Email',
    value: 'hello@hrisph.com\nsupport@hrisph.com',
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-500/10',
  },
  {
    icon: Clock,
    label: 'Support Hours',
    value: 'Mon–Fri: 8:00 AM – 6:00 PM PHT\nSat: 9:00 AM – 12:00 PM PHT',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-500/10',
  },
];

const supportChannels = [
  { 
    icon: MessageCircle, 
    label: 'Live Chat', 
    desc: 'Available in the app dashboard', 
    badge: 'Fastest',
    iconColor: 'text-green-600 dark:text-green-400',
    iconBg: 'bg-green-500/10',
  },
  { 
    icon: AtSign, 
    label: 'Email Support', 
    desc: 'hello@hrisph.com · Reply within 24h', 
    badge: null,
    iconColor: 'text-[#0038a8] dark:text-blue-400',
    iconBg: 'bg-[#0038a8]/10',
  },
  { 
    icon: Headphones, 
    label: 'Phone Support', 
    desc: '+63 2 8888 4747 · Enterprise plan', 
    badge: 'Enterprise',
    iconColor: 'text-[#ce1126] dark:text-red-400',
    iconBg: 'bg-[#ce1126]/10',
  },
  { 
    icon: BookOpen, 
    label: 'Help Center', 
    desc: 'Guides, tutorials, and FAQs', 
    badge: null,
    iconColor: 'text-amber-600 dark:text-amber-400',
    iconBg: 'bg-amber-500/10',
  },
];

export default function ContactPage() {
  return (
    <div className="pt-16">
      {/* Hero */}
      <div className="bg-gradient-to-br from-[#0038a8]/5 to-[#ce1126]/5 border-b border-border">
        <Container className="py-14 text-center">
          <Badge variant="outline" className="mb-4 rounded-full px-3 py-1 border-[#0038a8]/30 text-[#0038a8] dark:text-blue-400">
            We&apos;re here to help
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground mb-3">
            Contact <span className="text-[#0038a8]">HRISPH</span>
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Have a question about payroll, compliance, or our platform? Our Philippine team
            is ready to help — in English or Filipino.
          </p>
        </Container>
      </div>

      <Container className="py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Left: contact info */}
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-4">
              {contactDetails.map(({ icon: Icon, label, value, color, bg }) => (
                <div key={label} className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
                    <Icon className={`h-5 w-5 ${color}`} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">
                      {label}
                    </p>
                    {value.split('\n').map((line) => (
                      <p key={line} className="text-sm text-foreground">{line}</p>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Support channels */}
            <div className="border-t border-border pt-6">
              <p className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" /> Support Channels
              </p>
              <div className="flex flex-col gap-3">
                {supportChannels.map((ch) => {
                  const Icon = ch.icon;
                  return (
                    <div key={ch.label} className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${ch.iconBg}`}>
                        <Icon className={`h-4 w-4 ${ch.iconColor}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground">{ch.label}</p>
                          {ch.badge && (
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${ch.badge === 'Fastest' ? 'text-green-600 border-green-500/30' : 'text-[#0038a8] border-[#0038a8]/30'}`}>
                              {ch.badge}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{ch.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Google Maps placeholder */}
            <div className="rounded-2xl overflow-hidden border border-border aspect-video bg-muted flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <MapPin className="h-8 w-8 text-[#0038a8]/40" />
              <p className="text-sm font-medium">Makati City, Metro Manila</p>
              <p className="text-xs">8F Ayala Avenue Tower</p>
              <a
                href="https://maps.google.com/?q=Ayala+Avenue+Makati+City+Philippines"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#0038a8] dark:text-blue-400 underline hover:no-underline"
              >
                Open in Google Maps →
              </a>
            </div>
          </div>

          {/* Right: form */}
          <div className="lg:col-span-2">
            <div className="bg-card border border-border rounded-2xl p-6 sm:p-8">
              <h2 className="text-xl font-bold text-foreground mb-1">Send us a message</h2>
              <p className="text-sm text-muted-foreground mb-6">
                We&apos;ll respond within 1 business day. For urgent matters, call us directly.
              </p>
              <ContactForm />
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}