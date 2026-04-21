'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Star, Play, Quote, TrendingUp, Users, Building2, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Container } from '@/components/layout/Container';
import { AnimateIn } from '@/components/ui/AnimateIn';
import { useCountUp } from '@/hooks/useCountUp';
import { cn } from '@/lib/utils';
import testimonialsData from '@/data/testimonials.json';
import caseStudiesData from '@/data/case-studies.json';

/* ─── Company logos (text-based, no images needed) ──────────────────────── */
const companyLogos = [
  { name: 'Jollibee Foods', short: 'JFC', color: '#ce1126' },
  { name: 'BDO Unibank', short: 'BDO', color: '#0038a8' },
  { name: 'SM Prime', short: 'SM', color: '#fcd116' },
  { name: 'Ayala Land', short: 'ALI', color: '#0038a8' },
  { name: 'Robinsons Retail', short: 'RLC', color: '#ce1126' },
  { name: 'Aboitiz Power', short: 'AP', color: '#0038a8' },
  { name: 'Converge ICT', short: 'CNVRG', color: '#ce1126' },
  { name: 'Sprout Solutions', short: 'SS', color: '#16a34a' },
  { name: 'Globe Telecom', short: 'GLO', color: '#0038a8' },
  { name: 'PLDT', short: 'PLDT', color: '#ce1126' },
  { name: 'Meralco', short: 'MER', color: '#fcd116' },
  { name: 'San Miguel Corp', short: 'SMC', color: '#0038a8' },
];

/* ─── Stats data ─────────────────────────────────────────────────────────── */
const stats = [
  {
    icon: Building2,
    value: 500,
    suffix: '+',
    label: 'Philippine Companies',
    color: 'text-[#0038a8] dark:text-blue-400',
    bg: 'bg-[#0038a8]/10',
  },
  {
    icon: Users,
    value: 120000,
    suffix: '+',
    label: 'Employees Managed',
    color: 'text-[#ce1126] dark:text-red-400',
    bg: 'bg-[#ce1126]/10',
    format: (n: number) => n >= 1000 ? `${(n / 1000).toFixed(0)}K` : String(n),
  },
  {
    icon: DollarSign,
    value: 24,
    suffix: 'B+',
    label: 'Payroll Processed (PHP)',
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-500/10',
    prefix: '₱',
  },
  {
    icon: TrendingUp,
    value: 99,
    suffix: '.9%',
    label: 'Platform Uptime SLA',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-500/10',
  },
];

/* ─── Animated Stat Card ─────────────────────────────────────────────────── */
function StatCard({ stat }: { stat: (typeof stats)[0] }) {
  const { count, ref } = useCountUp(stat.value, 2200);
  const Icon = stat.icon;
  const display = stat.format ? stat.format(count) : String(count);

  return (
    <div ref={ref} className="flex flex-col items-center gap-3 text-center">
      <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center', stat.bg)}>
        <Icon className={cn('h-7 w-7', stat.color)} />
      </div>
      <div>
        <p className={cn('text-3xl sm:text-4xl font-extrabold', stat.color)}>
          {stat.prefix ?? ''}{display}{stat.suffix}
        </p>
        <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
      </div>
    </div>
  );
}

/* ─── Star Rating ────────────────────────────────────────────────────────── */
function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn('h-4 w-4', i < rating ? 'fill-[#fcd116] text-[#fcd116]' : 'text-muted-foreground/30')}
        />
      ))}
    </div>
  );
}

/* ─── Avatar Fallback ────────────────────────────────────────────────────── */
function AvatarFallback({ initials, color = '#0038a8' }: { initials: string; color?: string }) {
  return (
    <div
      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
      style={{ backgroundColor: color }}
    >
      {initials}
    </div>
  );
}

/* ─── Logo Carousel ──────────────────────────────────────────────────────── */
function LogoCarousel() {
  const autoplay = useRef(Autoplay({ delay: 2000, stopOnInteraction: false }));
  const [emblaRef] = useEmblaCarousel(
    { loop: true, align: 'start', dragFree: true },
    [autoplay.current],
  );

  return (
    <div className="overflow-hidden" ref={emblaRef}>
      <div className="flex gap-4">
        {[...companyLogos, ...companyLogos].map((logo, i) => (
          <div
            key={`${logo.short}-${i}`}
            className="shrink-0 flex items-center gap-2 px-5 py-3 rounded-xl border border-border bg-card hover:border-[#0038a8]/30 transition-colors"
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-extrabold text-xs shrink-0"
              style={{ backgroundColor: logo.color }}
            >
              {logo.short.slice(0, 2)}
            </div>
            <span className="text-sm font-semibold text-foreground whitespace-nowrap">{logo.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Testimonial Carousel ───────────────────────────────────────────────── */
function TestimonialCarousel() {
  const autoplay = useRef(Autoplay({ delay: 5000, stopOnInteraction: true }));
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [autoplay.current]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const scrollTo = useCallback((i: number) => emblaApi?.scrollTo(i), [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap());
    emblaApi.on('select', onSelect);
    return () => { emblaApi.off('select', onSelect); };
  }, [emblaApi]);

  return (
    <div className="relative">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {testimonialsData.map((t) => (
            <div key={t.id} className="shrink-0 w-full px-2 sm:px-4">
              <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 mx-auto max-w-2xl">
                <Quote className="h-8 w-8 text-[#0038a8]/30 mb-4" />
                <p className="text-base sm:text-lg text-foreground leading-relaxed mb-6 italic">
                  &ldquo;{t.quoteEn}&rdquo;
                </p>
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <AvatarFallback
                      initials={t.avatarFallback}
                      color={t.id % 2 === 0 ? '#0038a8' : '#ce1126'}
                    />
                    <div>
                      <p className="font-semibold text-foreground text-sm">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.title}</p>
                      <p className="text-xs text-muted-foreground">{t.company}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StarRating rating={t.rating} />
                    <Badge variant="outline" className="text-[10px] px-2 py-0.5 text-green-600 border-green-500/30 bg-green-500/5">
                      {t.metric}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-center gap-4 mt-6">
        <Button variant="outline" size="icon" onClick={scrollPrev} className="h-9 w-9 rounded-full">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex gap-1.5">
          {testimonialsData.map((_, i) => (
            <button
              key={i}
              onClick={() => scrollTo(i)}
              className={cn(
                'rounded-full transition-all duration-300',
                selectedIndex === i
                  ? 'w-6 h-2 bg-[#0038a8]'
                  : 'w-2 h-2 bg-muted-foreground/30 hover:bg-muted-foreground/50',
              )}
              aria-label={`Go to testimonial ${i + 1}`}
            />
          ))}
        </div>
        <Button variant="outline" size="icon" onClick={scrollNext} className="h-9 w-9 rounded-full">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

/* ─── Case Study Card ────────────────────────────────────────────────────── */
function CaseStudyCard({ study, index }: { study: (typeof caseStudiesData)[0]; index: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <AnimateIn delay={index * 0.1} direction="up">
      <div className="bg-card border border-border rounded-2xl overflow-hidden hover:border-[#0038a8]/30 hover:shadow-lg transition-all duration-300 h-full flex flex-col">
        {/* Header */}
        <div
          className="p-6 flex items-center gap-4"
          style={{ borderBottom: `3px solid ${study.color}` }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-extrabold text-lg shrink-0"
            style={{ backgroundColor: study.color }}
          >
            {study.logo}
          </div>
          <div>
            <h3 className="font-bold text-foreground">{study.company}</h3>
            <p className="text-sm text-muted-foreground">{study.industry} · {study.location}</p>
            <Badge variant="outline" className="mt-1 text-[10px] px-2 py-0.5">
              {study.employees.toLocaleString()} employees
            </Badge>
          </div>
        </div>

        {/* Results grid */}
        <div className="grid grid-cols-2 gap-px bg-border m-0">
          {study.results.map((r) => (
            <div key={r.label} className="bg-card p-4 text-center">
              <p className="text-lg font-extrabold text-foreground">{r.metric}</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{r.label}</p>
            </div>
          ))}
        </div>

        {/* Quote & expand */}
        <div className="p-6 flex flex-col gap-3 flex-1">
          <p className="text-sm text-muted-foreground italic leading-relaxed">
            &ldquo;{study.quote}&rdquo;
          </p>
          <p className="text-xs font-semibold text-foreground">— {study.quotePerson}</p>

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="pt-3 border-t border-border flex flex-col gap-3">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Challenge</p>
                    <p className="text-sm text-foreground leading-relaxed">{study.challenge}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Solution</p>
                    <p className="text-sm text-foreground leading-relaxed">{study.solution}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={() => setExpanded((v) => !v)}
            className="mt-auto text-sm font-semibold text-[#0038a8] dark:text-blue-400 hover:underline text-left transition-colors"
          >
            {expanded ? 'Show less ↑' : 'Read full case study ↓'}
          </button>
        </div>
      </div>
    </AnimateIn>
  );
}

/* ─── Video Testimonial Placeholder ─────────────────────────────────────── */
function VideoTestimonialPlaceholder() {
  const [playing, setPlaying] = useState(false);

  return (
    <div className="relative rounded-2xl overflow-hidden aspect-video bg-gradient-to-br from-[#0038a8] to-[#002580] flex items-center justify-center cursor-pointer group"
      onClick={() => setPlaying(true)}
    >
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="absolute rounded-full border border-white"
            style={{
              width: `${(i + 1) * 15}%`,
              height: `${(i + 1) * 15}%`,
              top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          />
        ))}
      </div>

      {!playing ? (
        <div className="flex flex-col items-center gap-4 z-10 text-center px-4">
          <motion.div
            whileHover={{ scale: 1.1 }}
            className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/40 flex items-center justify-center group-hover:bg-white/30 transition-colors"
          >
            <Play className="h-8 w-8 text-white fill-white ml-1" />
          </motion.div>
          <div className="text-white">
            <p className="font-bold text-lg">Watch: HRISPH Customer Story</p>
            <p className="text-white/70 text-sm mt-1">
              Maria Santos, HR Manager · Aboitiz Power · 2:34
            </p>
          </div>
          <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm">
            🇵🇭 Tagalog with English subtitles
          </Badge>
        </div>
      ) : (
        <div className="z-10 text-white text-center px-4">
          <p className="font-semibold">Video player coming soon</p>
          <p className="text-sm text-white/70 mt-1">
            This would embed a Loom or YouTube video of the customer testimonial.
          </p>
          <button
            onClick={(e) => { e.stopPropagation(); setPlaying(false); }}
            className="mt-4 text-xs text-white/60 underline"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Main Section ───────────────────────────────────────────────────────── */
export function TestimonialsSection() {
  return (
    <section id="testimonials" className="py-20 lg:py-28">
      <Container>
        {/* ── Header ── */}
        <AnimateIn className="text-center max-w-2xl mx-auto mb-12">
          <Badge variant="outline" className="mb-4 rounded-full px-3 py-1 border-[#0038a8]/30 text-[#0038a8] dark:text-blue-400">
            Trusted by PH businesses
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground mb-4">
            Loved by <span className="text-[#ce1126]">HR teams</span> across the Philippines
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            From sari-sari stores to blue-chip conglomerates — Philippine HR teams trust
            HRISPH to automate their most critical operations.
          </p>
        </AnimateIn>

        {/* ── Animated Stats ── */}
        <AnimateIn className="mb-16">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 p-8 rounded-2xl border border-border bg-card">
            {stats.map((stat) => (
              <StatCard key={stat.label} stat={stat} />
            ))}
          </div>
        </AnimateIn>

        {/* ── Logo Carousel ── */}
        <AnimateIn className="mb-16">
          <p className="text-center text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-6">
            Trusted by leading Philippine companies
          </p>
          <div className="relative">
            {/* Fade edges */}
            <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
            <LogoCarousel />
          </div>
        </AnimateIn>

        {/* ── Testimonial Carousel ── */}
        <AnimateIn className="mb-20">
          <h3 className="text-2xl font-bold text-foreground text-center mb-8">
            What our customers say
          </h3>
          <TestimonialCarousel />
        </AnimateIn>

        {/* ── Featured Grid (3 cards: featured testimonials) ── */}
        <AnimateIn className="mb-20">
          <h3 className="text-2xl font-bold text-foreground text-center mb-8">
            More from our customers
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {testimonialsData
              .filter((t) => !t.featured)
              .slice(0, 3)
              .map((t, i) => (
                <AnimateIn key={t.id} delay={i * 0.1} direction="up">
                  <div className="bg-card border border-border rounded-2xl p-5 h-full flex flex-col gap-4 hover:border-[#0038a8]/30 hover:shadow-md transition-all">
                    <div className="flex items-start gap-3">
                      <AvatarFallback
                        initials={t.avatarFallback}
                        color={i % 3 === 0 ? '#0038a8' : i % 3 === 1 ? '#ce1126' : '#16a34a'}
                      />
                      <div>
                        <p className="font-semibold text-foreground text-sm">{t.name}</p>
                        <p className="text-xs text-muted-foreground">{t.title}</p>
                        <p className="text-xs text-muted-foreground">{t.company}</p>
                      </div>
                    </div>
                    <StarRating rating={t.rating} />
                    <p className="text-sm text-muted-foreground italic leading-relaxed flex-1">
                      &ldquo;{t.quoteEn}&rdquo;
                    </p>
                    <Badge variant="outline" className="w-fit text-[10px] text-green-600 border-green-500/30 bg-green-500/5">
                      {t.metric}
                    </Badge>
                  </div>
                </AnimateIn>
              ))}
          </div>
        </AnimateIn>

        {/* ── Case Studies ── */}
        <AnimateIn className="mb-20">
          <div className="text-center mb-8">
            <Badge variant="outline" className="mb-3 rounded-full px-3 py-1 border-[#ce1126]/30 text-[#ce1126] dark:text-red-400">
              Case Studies
            </Badge>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-foreground">
              Real results from real Philippine companies
            </h3>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {caseStudiesData.map((study, i) => (
              <CaseStudyCard key={study.id} study={study} index={i} />
            ))}
          </div>
        </AnimateIn>

        {/* ── Video Testimonial ── */}
        <AnimateIn>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <Badge variant="outline" className="mb-4 rounded-full px-3 py-1 border-[#0038a8]/30 text-[#0038a8] dark:text-blue-400">
                Video testimonial
              </Badge>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-foreground mb-4">
                Hear it directly from <span className="text-[#0038a8]">Maria</span>
              </h3>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Maria Santos, HR Manager at Aboitiz Power, shares how HRISPH transformed
                their payroll process from a 12-day ordeal to a 2-day automated workflow —
                saving her team hundreds of hours and eliminating compliance errors.
              </p>
              <div className="flex flex-col gap-3">
                {[
                  '3 days saved per payroll cycle',
                  'Zero SSS compliance penalties',
                  'BIR 2316 generated in one click',
                ].map((point) => (
                  <div key={point} className="flex items-center gap-2 text-sm text-foreground">
                    <div className="w-5 h-5 rounded-full bg-green-500/15 flex items-center justify-center shrink-0">
                      <span className="text-green-600 text-xs font-bold">✓</span>
                    </div>
                    {point}
                  </div>
                ))}
              </div>
            </div>
            <VideoTestimonialPlaceholder />
          </div>
        </AnimateIn>
      </Container>
    </section>
  );
}
