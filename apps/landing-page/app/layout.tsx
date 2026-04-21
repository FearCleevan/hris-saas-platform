import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/layout/ThemeProvider';
import { DemoModalProvider } from '@/components/layout/DemoModalProvider';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Toaster } from '@/components/ui/sonner';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'HRISPH — Enterprise HRIS for the Philippines',
    template: '%s | HRISPH',
  },
  description:
    'The enterprise-grade HRIS built for Philippine businesses. Automated payroll with SSS, PhilHealth, Pag-IBIG, and BIR TRAIN Law compliance.',
  keywords: [
    'HRIS Philippines',
    'Philippine payroll software',
    'SSS contribution calculator',
    'BIR withholding tax',
    'PhilHealth computation',
    'Pag-IBIG contribution',
    'HR software Philippines',
    'payroll system Philippines',
  ],
  authors: [{ name: 'HRISPH, Inc.' }],
  creator: 'HRISPH, Inc.',
  metadataBase: new URL('https://hrisph.com'),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <DemoModalProvider>
            <div className="flex min-h-screen flex-col">
              <Navbar />
              <main className="flex-1">{children}</main>
              <Footer />
            </div>
          </DemoModalProvider>
          <Toaster position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}