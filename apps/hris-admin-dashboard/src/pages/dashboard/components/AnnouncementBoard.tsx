import { useState } from 'react';
import { Megaphone, Pin, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import announcementsData from '@/data/mock/announcements.json';

const priorityConfig = {
  high: { badge: 'destructive' as const, label: 'Important' },
  normal: { badge: 'default' as const, label: 'General' },
  low: { badge: 'secondary' as const, label: 'Info' },
};

const categoryColors: Record<string, string> = {
  Events: 'text-purple-600 bg-purple-100 dark:bg-purple-950/30 dark:text-purple-400',
  Policy: 'text-[#0038a8] bg-[#0038a8]/10 dark:text-blue-400',
  HR: 'text-green-600 bg-green-100 dark:bg-green-950/30 dark:text-green-400',
  Compliance: 'text-amber-600 bg-amber-100 dark:bg-amber-950/30 dark:text-amber-400',
  Facilities: 'text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-400',
};

function AnnouncementItem({ ann }: { ann: typeof announcementsData[0] }) {
  const [expanded, setExpanded] = useState(ann.pinned);
  const config = priorityConfig[ann.priority as keyof typeof priorityConfig];

  return (
    <div className={cn(
      'border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden transition-all',
      ann.pinned && 'border-[#0038a8]/20 dark:border-[#0038a8]/20'
    )}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
      >
        <div className="w-8 h-8 rounded-lg bg-[#0038a8]/10 flex items-center justify-center text-[#0038a8] shrink-0">
          <Megaphone className="w-4 h-4" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
            {ann.pinned && <Pin className="w-3 h-3 text-[#0038a8] shrink-0" />}
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{ann.title}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full', categoryColors[ann.category] ?? 'text-gray-400 bg-gray-100')}>
              {ann.category}
            </span>
            <Badge variant={config.badge} className="text-[9px] px-1.5 py-0">{config.label}</Badge>
            <span className="text-[10px] text-gray-400">{formatDate(ann.date)}</span>
          </div>
        </div>

        <span className="text-gray-400 shrink-0 mt-1">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-0">
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{ann.body}</p>
          <p className="text-[10px] text-gray-400 mt-2">Posted by {ann.author}</p>
        </div>
      )}
    </div>
  );
}

export function AnnouncementBoard() {
  const pinned = announcementsData.filter((a) => a.pinned);
  const rest = announcementsData.filter((a) => !a.pinned);

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-gray-900 dark:text-white text-sm">Announcements</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">{pinned.length} pinned · {announcementsData.length} total</p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {pinned.length > 0 && (
          <>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-1">Pinned</p>
            {pinned.map((ann) => <AnnouncementItem key={ann.id} ann={ann} />)}
          </>
        )}
        {rest.length > 0 && (
          <>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-1 mt-2">Latest</p>
            {rest.map((ann) => <AnnouncementItem key={ann.id} ann={ann} />)}
          </>
        )}
      </div>
    </div>
  );
}
