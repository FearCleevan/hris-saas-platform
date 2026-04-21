import type { Metadata } from 'next';
import Link from 'next/link';
import { Container } from '@/components/layout/Container';

export const metadata: Metadata = {
  title: 'Cookie Policy',
  description: 'HRISPH Cookie Policy — how we use cookies and similar technologies on our website.',
};

const cookies = [
  { name: 'Strictly Necessary', canDisable: false, examples: 'Session token, CSRF token, authentication state', purpose: 'Required for the platform to function. Cannot be disabled.' },
  { name: 'Functional', canDisable: true, examples: 'Theme preference (dark/light), language setting, cookie consent status', purpose: 'Remember your preferences for a better experience.' },
  { name: 'Analytics', canDisable: true, examples: 'Google Analytics (_ga, _gid), session duration, page views', purpose: 'Help us understand how visitors use our website so we can improve it. Data is anonymized.' },
  { name: 'Marketing', canDisable: true, examples: 'Meta Pixel (fbp), Google Ads conversion tracking', purpose: 'Used to show relevant ads to people who have visited our site. We only enable these with your explicit consent.' },
];

export default function CookiePolicyPage() {
  return (
    <div className="pt-16">
      <div className="bg-muted/40 border-b border-border">
        <Container className="py-12 max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-widest text-[#0038a8] mb-2">Legal</p>
          <h1 className="text-3xl font-extrabold text-foreground mb-2">Cookie Policy</h1>
          <p className="text-sm text-muted-foreground">Last updated: October 1, 2024</p>
        </Container>
      </div>

      <Container className="py-12 max-w-3xl">
        <div className="flex flex-col gap-8 text-sm text-muted-foreground leading-relaxed">
          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">What Are Cookies?</h2>
            <p>Cookies are small text files placed on your device when you visit a website. They allow the website to recognize your device on subsequent visits, remember your preferences, and provide a more personalized experience.</p>
            <p className="mt-3">HRISPH uses cookies and similar technologies (such as web beacons and local storage) on our website and platform in accordance with the Philippine Data Privacy Act (RA 10173) and the NPC&apos;s guidelines on data processing.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-4">Types of Cookies We Use</h2>
            <div className="flex flex-col gap-4">
              {cookies.map((c) => (
                <div key={c.name} className="bg-card border border-border rounded-xl p-5">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-foreground">{c.name}</h3>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${c.canDisable ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400' : 'bg-muted text-muted-foreground'}`}>
                      {c.canDisable ? 'Can be disabled' : 'Always active'}
                    </span>
                  </div>
                  <p className="mb-2">{c.purpose}</p>
                  <p className="text-xs"><strong className="text-foreground">Examples:</strong> {c.examples}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">Managing Your Cookie Preferences</h2>
            <p>When you first visit our website, you will see a cookie consent banner. You can choose to accept all cookies, or decline optional cookies. You can change your preferences at any time by:</p>
            <ul className="list-disc pl-5 mt-3 space-y-1">
              <li>Clearing your browser&apos;s cookies and local storage, which will reset the consent banner</li>
              <li>Adjusting your browser settings to block cookies (note: this may affect site functionality)</li>
              <li>Contacting us at <a href="mailto:privacy@hrisph.com" className="text-[#0038a8] dark:text-blue-400 hover:underline">privacy@hrisph.com</a> to request removal of your data</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">Third-Party Cookies</h2>
            <p>We may allow trusted third parties to place cookies on our site for analytics and marketing purposes (Google Analytics, Meta Pixel). These third parties have their own privacy policies. We only enable third-party marketing cookies with your explicit consent.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">Contact Us</h2>
            <p>For questions about our use of cookies, contact our Data Protection Officer at <a href="mailto:privacy@hrisph.com" className="text-[#0038a8] dark:text-blue-400 hover:underline">privacy@hrisph.com</a>.</p>
            <p className="mt-2">See also our <Link href="/privacy-policy" className="text-[#0038a8] dark:text-blue-400 hover:underline">Privacy Policy</Link> and <Link href="/terms-of-service" className="text-[#0038a8] dark:text-blue-400 hover:underline">Terms of Service</Link>.</p>
          </section>
        </div>
      </Container>
    </div>
  );
}
