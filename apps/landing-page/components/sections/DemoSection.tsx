'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Calendar, Clock, Users, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/layout/Container';
import { useDemoModal } from '@/components/layout/DemoModalProvider';

const demoPerks = [
  { icon: Clock, text: '30-minute focused session' },
  { icon: Users, text: 'PH compliance expert included' },
  { icon: Calendar, text: 'Schedule at your convenience (PHT)' },
  { icon: Shield, text: 'No commitment, no credit card' },
];

export function DemoSection() {
  const { open } = useDemoModal();

  return (
    <section id="demo" className="py-20 lg:py-28 bg-gradient-to-br from-[#0038a8] via-[#002580] to-[#001a60] relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full border border-white" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full border border-white" />
        <div className="absolute top-1/2 left-1/2 w-32 h-32 rounded-full border border-white -translate-x-1/2 -translate-y-1/2" />
      </div>

      <Container className="relative">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left: copy */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-white"
          >
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-4 py-1.5 text-sm font-medium mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#fcd116] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#fcd116]" />
              </span>
              Limited demo slots available this week
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight mb-6">
              See HRISPH in action —{' '}
              <span className="text-[#fcd116]">live, personalized,</span> and free
            </h2>

            <p className="text-white/80 text-lg leading-relaxed mb-8">
              Watch your actual payroll scenario run with real SSS, PhilHealth, Pag-IBIG, and
              BIR TRAIN Law computations. Our Philippine compliance experts will answer every
              question your team has.
            </p>

            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
              {demoPerks.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-white/90">
                  <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4 text-[#fcd116]" />
                  </div>
                  <span className="text-sm font-medium">{text}</span>
                </li>
              ))}
            </ul>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                size="lg"
                onClick={open}
                className="bg-[#fcd116] hover:bg-[#e6bc00] text-[#0038a8] font-bold h-12 px-8 gap-2 shadow-lg shadow-black/20"
              >
                Book My Free Demo
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="border-white/30 text-white hover:bg-white/10 h-12 px-8 bg-transparent"
              >
                <a href="/signup">Start Free Trial Instead</a>
              </Button>
            </div>
          </motion.div>

          {/* Right: trust block */}
          <motion.div
            initial={{ opacity: 0, x: 32 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-col gap-4"
          >
            {/* What you'll see card */}
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 text-white">
              <h3 className="font-bold text-lg mb-4">What you&apos;ll see in the demo:</h3>
              <ol className="flex flex-col gap-3">
                {[
                  'Live payroll run — with your actual employee count and salary bands',
                  'SSS, PhilHealth, Pag-IBIG auto-computation in real time',
                  'BIR TRAIN Law withholding tax and Form 2316 preview',
                  'Employee self-service portal and mobile app walkthrough',
                  'Government report generation (R3, RF-1, alphalist)',
                  'Q&A with a PH HR compliance specialist',
                ].map((item, i) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-white/90">
                    <span className="w-6 h-6 rounded-full bg-[#fcd116]/20 text-[#fcd116] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    {item}
                  </li>
                ))}
              </ol>
            </div>

            {/* Mini testimonial */}
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-5 text-white">
              <p className="text-sm italic text-white/80 mb-3">
                &ldquo;The demo was so detailed — they showed us our actual SSS remittance schedule
                and how BIR 2316 would look for our employees. We signed up the same day.&rdquo;
              </p>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#ce1126] flex items-center justify-center text-white text-xs font-bold">
                  AR
                </div>
                <div>
                  <p className="text-xs font-semibold">Anna Reyes</p>
                  <p className="text-xs text-white/60">HR Director · Converge ICT Solutions</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </Container>
    </section>
  );
}
