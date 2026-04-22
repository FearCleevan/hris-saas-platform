import { Cake, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getInitials } from '@/lib/utils';
import employeesData from '@/data/mock/employees.json';

const TODAY = new Date('2026-04-22');

function daysDiff(date: Date): number {
  const d = new Date(TODAY);
  const target = new Date(TODAY.getFullYear(), date.getMonth(), date.getDate());
  if (target < d) target.setFullYear(d.getFullYear() + 1);
  return Math.round((target.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

function yearsAt(hireDate: string): number {
  const hire = new Date(hireDate);
  return TODAY.getFullYear() - hire.getFullYear();
}

interface Event {
  id: string;
  name: string;
  type: 'birthday' | 'anniversary';
  detail: string;
  daysAway: number;
}

const events: Event[] = [
  ...employeesData
    .map((e) => {
      const bd = new Date(e.birthday);
      const days = daysDiff(bd);
      const age = TODAY.getFullYear() - bd.getFullYear();
      return { id: e.id, name: e.name, type: 'birthday' as const, detail: `Turns ${age}`, daysAway: days };
    })
    .filter((e) => e.daysAway <= 30),
  ...employeesData
    .map((e) => {
      const hire = new Date(e.hireDate);
      const anniv = new Date(TODAY.getFullYear(), hire.getMonth(), hire.getDate());
      if (anniv < TODAY) anniv.setFullYear(TODAY.getFullYear() + 1);
      const days = Math.round((anniv.getTime() - TODAY.getTime()) / (1000 * 60 * 60 * 24));
      const years = yearsAt(e.hireDate);
      return { id: `ann-${e.id}`, name: e.name, type: 'anniversary' as const, detail: `${years} year${years !== 1 ? 's' : ''} with us`, daysAway: days };
    })
    .filter((e) => e.daysAway <= 14 && yearsAt(employeesData.find((emp) => `ann-${emp.id}` === e.id)?.hireDate ?? '') >= 1),
]
  .sort((a, b) => a.daysAway - b.daysAway)
  .slice(0, 8);

export function UpcomingEvents() {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 h-full">
      <div className="mb-4">
        <h3 className="font-bold text-gray-900 dark:text-white text-sm">Upcoming Celebrations</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">Birthdays & work anniversaries (next 30 days)</p>
      </div>

      {events.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">No upcoming events</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {events.map((event) => (
            <div key={event.id} className="flex items-center gap-3">
              {/* Avatar */}
              <div className="w-8 h-8 rounded-full bg-[#0038a8]/10 flex items-center justify-center text-[#0038a8] text-xs font-bold shrink-0">
                {getInitials(event.name)}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{event.name}</p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">{event.detail}</p>
              </div>

              {/* Days away */}
              <div className="flex flex-col items-end shrink-0 gap-0.5">
                <div className={cn(
                  'flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
                  event.type === 'birthday'
                    ? 'bg-pink-100 text-pink-600 dark:bg-pink-950/30 dark:text-pink-400'
                    : 'bg-[#fcd116]/20 text-amber-700 dark:text-amber-400'
                )}>
                  {event.type === 'birthday' ? <Cake className="w-2.5 h-2.5" /> : <Star className="w-2.5 h-2.5" />}
                  {event.type === 'birthday' ? 'Birthday' : 'Anniv.'}
                </div>
                <span className="text-[9px] text-gray-400">
                  {event.daysAway === 0 ? 'Today! 🎉' : event.daysAway === 1 ? 'Tomorrow' : `in ${event.daysAway}d`}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
