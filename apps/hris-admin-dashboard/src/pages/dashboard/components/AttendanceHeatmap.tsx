import { useMemo } from 'react';
import { cn } from '@/lib/utils';

type RateLevel = 'holiday' | 'low' | 'medium' | 'good' | 'high';

interface DayCell {
  date: Date;
  rate: number;
  level: RateLevel;
  isWeekend: boolean;
  isFuture: boolean;
  label: string;
}

const WEEKS = 13;
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function getLevel(rate: number, isWeekend: boolean, isFuture: boolean): RateLevel {
  if (isWeekend || isFuture) return 'holiday';
  if (rate >= 0.92) return 'high';
  if (rate >= 0.80) return 'good';
  if (rate >= 0.65) return 'medium';
  return 'low';
}

const levelStyles: Record<RateLevel, string> = {
  holiday: 'bg-gray-100 dark:bg-gray-800',
  low: 'bg-red-300 dark:bg-red-900/60',
  medium: 'bg-amber-300 dark:bg-amber-800/60',
  good: 'bg-green-300 dark:bg-green-800/60',
  high: 'bg-green-500 dark:bg-green-600',
};

export function AttendanceHeatmap() {
  const cells = useMemo<DayCell[]>(() => {
    const today = new Date('2026-04-22');
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - (WEEKS * 7 - 1));

    return Array.from({ length: WEEKS * 7 }, (_, i) => {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      const isFuture = date > today;
      const seed = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
      const baseRate = 0.88 + seededRandom(seed) * 0.14 - 0.03;
      const rate = isWeekend || isFuture ? 0 : Math.min(1, Math.max(0.5, baseRate));
      return {
        date,
        rate,
        level: getLevel(rate, isWeekend, isFuture),
        isWeekend,
        isFuture,
        label: `${MONTHS[date.getMonth()]} ${date.getDate()} — ${isWeekend ? 'Weekend' : isFuture ? 'Future' : `${Math.round(rate * 50)}/50 present`}`,
      };
    });
  }, []);

  const weeks = useMemo(() => {
    const result: DayCell[][] = [];
    for (let w = 0; w < WEEKS; w++) {
      result.push(cells.slice(w * 7, (w + 1) * 7));
    }
    return result;
  }, [cells]);

  const monthLabels = useMemo(() => {
    const labels: { label: string; col: number }[] = [];
    weeks.forEach((week, wi) => {
      const firstDay = week[1];
      if (firstDay && firstDay.date.getDate() <= 7) {
        labels.push({ label: MONTHS[firstDay.date.getMonth()], col: wi });
      }
    });
    return labels;
  }, [weeks]);

  const avgRate = useMemo(() => {
    const workdays = cells.filter((c) => !c.isWeekend && !c.isFuture);
    return workdays.reduce((s, c) => s + c.rate, 0) / workdays.length;
  }, [cells]);

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-gray-900 dark:text-white text-sm">Attendance Heatmap</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">Last 13 weeks · avg {Math.round(avgRate * 100)}% attendance</p>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-gray-400">
          <span>Low</span>
          {(['low', 'medium', 'good', 'high'] as RateLevel[]).map((l) => (
            <div key={l} className={cn('w-3 h-3 rounded-sm', levelStyles[l])} />
          ))}
          <span>High</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-max">
          {/* Month labels */}
          <div className="flex gap-1 mb-1 pl-8">
            {weeks.map((_, wi) => {
              const found = monthLabels.find((m) => m.col === wi);
              return (
                <div key={wi} className="w-4 text-[9px] text-gray-400 text-center">
                  {found?.label ?? ''}
                </div>
              );
            })}
          </div>

          <div className="flex gap-1">
            {/* Day labels */}
            <div className="flex flex-col gap-1 w-7 shrink-0">
              {DAYS.map((d, di) => (
                <div key={d} className="h-4 text-[9px] text-gray-400 flex items-center justify-end pr-1">
                  {di % 2 === 1 ? d.slice(0, 1) : ''}
                </div>
              ))}
            </div>

            {/* Grid */}
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-1">
                {week.map((cell, di) => (
                  <div
                    key={di}
                    title={cell.label}
                    className={cn(
                      'w-4 h-4 rounded-sm transition-opacity hover:opacity-80 cursor-default',
                      levelStyles[cell.level]
                    )}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
