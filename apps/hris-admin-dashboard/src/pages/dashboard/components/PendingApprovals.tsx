import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Receipt, ArrowRight, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import approvalsData from '@/data/mock/pending-approvals.json';

const typeConfig = {
  leave: { icon: Calendar, label: 'Leave', color: 'text-[#0038a8] dark:text-blue-400', bg: 'bg-[#0038a8]/10' },
  overtime: { icon: Clock, label: 'Overtime', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-950/30' },
  expense: { icon: Receipt, label: 'Expense', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-950/30' },
};

const urgencyBadge = {
  high: 'destructive' as const,
  medium: 'warning' as const,
  low: 'secondary' as const,
};

export function PendingApprovals() {
  const navigate = useNavigate();
  const highCount = approvalsData.filter((a) => a.urgency === 'high').length;

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-gray-900 dark:text-white text-sm">Pending Approvals</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {approvalsData.length} items · {highCount} urgent
          </p>
        </div>
        {highCount > 0 && (
          <div className="flex items-center gap-1 text-xs text-[#ce1126] font-semibold">
            <AlertCircle className="w-3.5 h-3.5" />
            {highCount} urgent
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {approvalsData.map((item) => {
          const config = typeConfig[item.type as keyof typeof typeConfig];
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => navigate(item.link)}
              className="group flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-[#0038a8]/40 hover:bg-[#0038a8]/3 transition-all cursor-pointer text-left"
            >
              <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center shrink-0', config.bg)}>
                <config.icon className={cn('w-3.5 h-3.5', config.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                  {item.employeeName}
                </p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{item.detail}</p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <Badge variant={urgencyBadge[item.urgency as keyof typeof urgencyBadge]} className="text-[9px] px-1.5 py-0">
                  {item.urgency}
                </Badge>
                <span className="text-[9px] text-gray-400">
                  {formatDistanceToNow(new Date(item.submittedAt), { addSuffix: true })}
                </span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-[#0038a8] transition-colors shrink-0" />
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => navigate('/leaves')}
        className="w-full mt-3 text-center text-xs text-[#0038a8] dark:text-blue-400 hover:underline font-medium py-2 cursor-pointer"
      >
        View all approvals →
      </button>
    </div>
  );
}
