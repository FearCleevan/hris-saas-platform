import type { Metadata } from 'next';
import Link from 'next/link';
import { Container } from '@/components/layout/Container';

export const metadata: Metadata = {
  title: '404 — Page Not Found',
};

export default function NotFoundPage() {
  return (
    <div className="pt-16 min-h-[calc(100vh-64px)] flex items-center">
      <Container className="py-24 text-center max-w-2xl">
        <p className="text-8xl font-black text-[#0038a8] mb-4">404</p>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground mb-3">
          Page not found
        </h1>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
          The page you&apos;re looking for doesn&apos;t exist or has been moved. Try heading back to
          the homepage.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center h-11 px-6 rounded-lg bg-[#0038a8] text-white font-semibold hover:bg-[#002580] transition-colors"
          >
            Back to Homepage
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center h-11 px-6 rounded-lg border border-border text-foreground font-semibold hover:bg-muted transition-colors"
          >
            Contact Support
          </Link>
        </div>

        <div className="mt-12 flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
          {[
            { label: 'Features', href: '/#features' },
            { label: 'Pricing', href: '/#pricing' },
            { label: 'Blog', href: '/blog' },
            { label: 'About', href: '/about' },
          ].map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-[#0038a8] transition-colors">
              {link.label}
            </Link>
          ))}
        </div>
      </Container>
    </div>
  );
}
