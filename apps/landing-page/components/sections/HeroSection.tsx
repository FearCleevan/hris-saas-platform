'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Play, Shield, CheckCircle2, Award, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Container } from '@/components/layout/Container';
import { AnimatedHeadline } from '@/components/ui/AnimatedHeadline';
import { DashboardMockup } from '@/components/ui/DashboardMockup';

const trustBadges = [
  { icon: Shield, label: 'SSS Compliant', color: 'text-blue-600 dark:text-blue-400' },
  { icon: CheckCircle2, label: 'BIR TRAIN Law', color: 'text-red-600 dark:text-red-400' },
  { icon: Award, label: 'PhilHealth Certified', color: 'text-green-600 dark:text-green-400' },
  { icon: Star, label: 'DOLE Aligned', color: 'text-yellow-600 dark:text-yellow-400' },
];

const stats = [
  { value: '500+', label: 'Philippine Companies' },
  { value: '120K+', label: 'Employees Managed' },
  { value: '₱2.4B+', label: 'Payroll Processed' },
  { value: '99.9%', label: 'Uptime SLA' },
];

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden pt-16">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0038a8]/5 via-background to-[#ce1126]/5 dark:from-[#0038a8]/10 dark:to-[#ce1126]/10" />

      {/* Decorative circles */}
      <div className="absolute top-1/4 -left-48 w-96 h-96 bg-[#0038a8]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-[#ce1126]/10 rounded-full blur-3xl pointer-events-none" />

      <Container className="relative py-16 lg:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Text content */}
          <div className="flex flex-col gap-6">
            {/* Announcement badge */}
            <motion.div
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Badge
                variant="outline"
                className="w-fit gap-1.5 rounded-full border-[#0038a8]/30 bg-[#0038a8]/5 text-[#0038a8] dark:text-blue-400 px-3 py-1"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0038a8] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0038a8]" />
                </span>
                New: BIR TRAIN Law 2024 updates now live
              </Badge>
            </motion.div>

            {/* Animated headline */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <AnimatedHeadline />
            </motion.div>

            {/* Sub-headline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg sm:text-xl text-muted-foreground max-w-lg leading-relaxed"
            >
              The only HRIS built from the ground up for Philippine businesses.
              Automated SSS, PhilHealth, Pag-IBIG, and BIR TRAIN Law payroll —
              so your HR team can focus on people, not paperwork.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-3"
            >
              <Button
                size="lg"
                className="bg-[#0038a8] hover:bg-[#002580] text-white gap-2 h-12 px-6 text-base font-semibold shadow-lg shadow-[#0038a8]/25"
                asChild
              >
                <Link href="/signup">
                  Start Free Trial — 14 days free
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="gap-2 h-12 px-6 text-base font-semibold border-2"
                asChild
              >
                <Link href="#demo">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#ce1126] shrink-0">
                    <Play className="h-3 w-3 text-white fill-white" />
                  </span>
                  Get a Demo Now
                </Link>
              </Button>
            </motion.div>

            {/* No credit card note */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="text-sm text-muted-foreground"
            >
              ✓ No credit card required &nbsp;·&nbsp; ✓ Setup in under 30 minutes &nbsp;·&nbsp;
              ✓ Cancel anytime
            </motion.p>

            {/* Trust badges */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="flex flex-wrap gap-3 pt-2"
            >
              {trustBadges.map(({ icon: Icon, label, color }) => (
                <div
                  key={label}
                  className="flex items-center gap-1.5 text-sm font-medium bg-muted/60 border border-border rounded-full px-3 py-1"
                >
                  <Icon className={`h-3.5 w-3.5 ${color}`} />
                  <span>{label}</span>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right: Dashboard mockup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative lg:pl-4"
          >
            <DashboardMockup />
          </motion.div>
        </div>

        {/* Stats strip */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.7 }}
          className="mt-16 lg:mt-20 grid grid-cols-2 sm:grid-cols-4 gap-6 pt-10 border-t border-border"
        >
          {stats.map(({ value, label }) => (
            <div key={label} className="text-center">
              <p className="text-2xl sm:text-3xl font-extrabold text-foreground">{value}</p>
              <p className="text-sm text-muted-foreground mt-1">{label}</p>
            </div>
          ))}
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 1.2 }}
          className="flex justify-center mt-12"
        >
          <a
            href="#features"
            className="flex flex-col items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Scroll to features"
          >
            <span className="text-xs font-medium">Explore Features</span>
            <motion.div
              animate={{ y: [0, 6, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              className="w-5 h-8 rounded-full border-2 border-current flex items-start justify-center pt-1.5"
            >
              <div className="w-1 h-1.5 rounded-full bg-current" />
            </motion.div>
          </a>
        </motion.div>
      </Container>
    </section>
  );
}
