import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion, type PanInfo } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type TodayCard =
  | {
      kind: 'clock';
      clockedIn: boolean;
      clockInTime: string | null;
      currentTime: string;
      subtitle: string;
      onToggle: () => void;
    }
  | {
      kind: 'info';
      icon: LucideIcon;
      title: string;
      subtitle: string;
      tone: 'warning' | 'positive' | 'neutral';
      cta?: { label: string; to: string };
    };

interface TodayStripProps {
  cards: TodayCard[];
}

const TONE_BG: Record<'warning' | 'positive' | 'neutral', string> = {
  warning: 'from-amber-500 to-amber-600',
  positive: 'from-employee-green to-emerald-700',
  neutral: 'from-brand-blue to-brand-blue-dark',
};

// The signature element (see FRONTEND_IMPLEMENTATION.md's Design
// Direction) — one card pinned to the top of Home always showing the
// single most time-sensitive thing. The clock-in/out card is always first;
// any "urgent" cards computed by DashboardPage follow it, swipeable via a
// framer-motion drag gesture (already a dependency, no carousel library
// needed) with dot indicators for accessibility/pointer users.
export function TodayStrip({ cards }: TodayStripProps) {
  const [index, setIndex] = useState(0);
  const reduceMotion = useReducedMotion();
  const card = cards[index];

  function go(delta: number) {
    setIndex((i) => Math.max(0, Math.min(cards.length - 1, i + delta)));
  }

  function handleDragEnd(_: unknown, info: PanInfo) {
    const threshold = 60;
    if (info.offset.x < -threshold) go(1);
    else if (info.offset.x > threshold) go(-1);
  }

  if (!card) return null;

  const bg = card.kind === 'clock' ? TONE_BG.neutral : TONE_BG[card.tone];

  return (
    <div>
      <div className="relative overflow-hidden rounded-2xl">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={index}
            drag={cards.length > 1 ? 'x' : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.15}
            onDragEnd={handleDragEnd}
            initial={{ opacity: 0, x: reduceMotion ? 0 : 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: reduceMotion ? 0 : -24 }}
            transition={{ duration: reduceMotion ? 0 : 0.25 }}
            className={cn('rounded-2xl p-5 text-white bg-linear-to-r cursor-grab active:cursor-grabbing', bg)}
          >
            {card.kind === 'clock' ? (
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-white/80 text-xs mb-1">{card.subtitle}</p>
                  <p className="text-3xl font-extrabold tabular-nums tracking-tight">{card.currentTime}</p>
                  <p className="text-white/80 text-xs mt-1">
                    {card.clockedIn && card.clockInTime ? `Clocked in since ${card.clockInTime}` : 'Not yet clocked in'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={card.onToggle}
                  className={cn(
                    'shrink-0 px-4 py-3 rounded-xl font-semibold text-sm min-h-11 transition-colors',
                    card.clockedIn ? 'bg-red-500 hover:bg-red-600' : 'bg-white text-brand-blue hover:bg-white/90',
                  )}
                >
                  {card.clockedIn ? 'Clock Out' : 'Clock In'}
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <card.icon size={28} className="shrink-0" />
                  <div className="min-w-0">
                    <p className="font-bold leading-snug">{card.title}</p>
                    <p className="text-white/80 text-xs mt-0.5 truncate">{card.subtitle}</p>
                  </div>
                </div>
                {card.cta && (
                  <Link
                    to={card.cta.to}
                    className="shrink-0 px-3 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-xs font-semibold transition-colors"
                  >
                    {card.cta.label}
                  </Link>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {cards.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-2">
          {cards.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Show card ${i + 1} of ${cards.length}`}
              aria-current={i === index}
              className={cn(
                'h-1.5 rounded-full transition-all',
                i === index ? 'w-5 bg-brand-blue' : 'w-1.5 bg-gray-300 dark:bg-gray-700',
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
