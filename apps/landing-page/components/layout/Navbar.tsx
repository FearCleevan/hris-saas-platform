'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { Container } from './Container';
import { ThemeToggle } from './ThemeToggle';
import { useDemoModal } from './DemoModalProvider';
import { cn } from '@/lib/utils';

const navLinks = [
  { label: 'Features', href: '/#features' },
  { label: 'Pricing', href: '/#pricing' },
  { label: 'Testimonials', href: '/#testimonials' },
  { label: 'Resources', href: '/resources' },
  { label: 'About', href: '/about' },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { open: openDemo } = useDemoModal();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={cn(
        'fixed top-0 z-50 w-full transition-all duration-300',
        scrolled
          ? 'bg-background/95 backdrop-blur-md border-b border-border shadow-sm'
          : 'bg-transparent',
      )}
    >
      <Container>
        <nav className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-bold text-xl shrink-0">
            <div className="flex items-center gap-1">
              <span className="text-[#0038a8]">HRIS</span>
              <span className="text-[#ce1126]">PH</span>
            </div>
            <div className="hidden sm:block h-5 w-px bg-border" />
            <span className="hidden sm:block text-sm font-normal text-muted-foreground">
              Enterprise HRIS
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
            <Button variant="outline" size="sm" onClick={openDemo}>
              Get a Demo
            </Button>
            <Button size="sm" className="bg-[#0038a8] hover:bg-[#002580] text-white" asChild>
              <Link href="/signup">Start Free Trial</Link>
            </Button>
          </div>

          {/* Mobile Menu */}
          <div className="flex md:hidden items-center gap-2">
            <ThemeToggle />
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Open menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[380px]">
                <SheetTitle className="text-left">
                  <span className="text-[#0038a8] font-bold">HRIS</span>
                  <span className="text-[#ce1126] font-bold">PH</span>
                </SheetTitle>
                <nav className="mt-6 flex flex-col gap-4">
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className="text-base font-medium text-foreground hover:text-primary transition-colors py-2 border-b border-border"
                    >
                      {link.label}
                    </Link>
                  ))}
                  <div className="mt-4 flex flex-col gap-3">
                    <Button variant="outline" asChild className="w-full">
                      <Link href="/login" onClick={() => setMobileOpen(false)}>Sign In</Link>
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => { setMobileOpen(false); openDemo(); }}
                    >
                      Get a Demo
                    </Button>
                    <Button asChild className="w-full bg-[#0038a8] hover:bg-[#002580] text-white">
                      <Link href="/signup" onClick={() => setMobileOpen(false)}>
                        Start Free Trial — 14 days free
                      </Link>
                    </Button>
                  </div>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </nav>
      </Container>
    </header>
  );
}
