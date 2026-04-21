import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/layout/ThemeProvider';
import { DemoModalProvider } from '@/components/layout/DemoModalProvider';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { CookieConsent } from '@/components/layout/CookieConsent';
import { Analytics } from '@/components/Analytics';
import { Toaster } from '@/components/ui/sonner';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const BASE_URL = 'https://hrisph.com';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'HRISPH — Enterprise HRIS for the Philippines',
    template: '%s | HRISPH',
  },
  description:
    'The enterprise-grade HRIS built for Philippine businesses. Automated payroll with SSS, PhilHealth, Pag-IBIG, and BIR TRAIN Law compliance. 1,800+ companies trust HRISPH.',
  keywords: [
    'HRIS Philippines',
    'Philippine payroll software',
    'SSS contribution calculator',
    'BIR withholding tax TRAIN Law',
    'PhilHealth computation 2024',
    'Pag-IBIG contribution table',
    'HR software Philippines',
    'payroll system Philippines',
    'Philippine compliance software',
    '13th month pay calculator',
    'BIR Form 2316',
    'SSS R3 report',
  ],
  authors: [{ name: 'HRisPH Technologies, Inc.', url: BASE_URL }],
  creator: 'HRisPH Technologies, Inc.',
  publisher: 'HRisPH Technologies, Inc.',
  category: 'HR Software',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_PH',
    url: BASE_URL,
    siteName: 'HRISPH',
    title: 'HRISPH — Enterprise HRIS for the Philippines',
    description:
      'Automated payroll with SSS, PhilHealth, Pag-IBIG, and BIR TRAIN Law compliance. The HRIS trusted by 1,800+ Philippine companies.',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'HRISPH — Enterprise HRIS for the Philippines',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@hrisph',
    creator: '@hrisph',
    title: 'HRISPH — Enterprise HRIS for the Philippines',
    description:
      'Automated payroll with SSS, PhilHealth, Pag-IBIG, and BIR TRAIN Law compliance.',
    images: ['/opengraph-image'],
  },
  alternates: {
    canonical: BASE_URL,
  },
  icons: {
    icon: '/preview-icon-256.png',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-PH" suppressHydrationWarning className={inter.variable}>
      <body className="antialiased">
        {/* Skip to main content — WCAG 2.1 AA */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-100 focus:px-4 focus:py-2 focus:bg-[#0038a8] focus:text-white focus:rounded-lg focus:font-semibold focus:text-sm focus:outline-none"
        >
          Skip to main content
        </a>

        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <DemoModalProvider>
            <div className="flex min-h-screen flex-col">
              <Navbar />
              <main id="main-content" className="flex-1">
                {children}
              </main>
              <Footer />
            </div>
          </DemoModalProvider>
          <Toaster position="top-right" />
          <CookieConsent />
        </ThemeProvider>

        <Analytics />
      </body>
    </html>
  );
}
